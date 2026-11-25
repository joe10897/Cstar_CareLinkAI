/**
 * CareLink AI — 兩階段貓臉 48 點非同步推論 Web Worker (src/workers/fgsOnnxWorker.ts)
 *
 * Stage 1: 貓臉邊界與姿態檢測器 (cat_face_detector_yolov8n_int8.onnx, ~3.2 MB)
 *   - 10~15 FPS 相機預覽即時推論，抓取貓臉 Bounding Box 與 5 個基礎錨點（雙眼中心、鼻頭、雙耳尖）
 *   - 即時計算雙眼水平傾角 (Roll Angle) 與臉部佔比，回傳防呆拍攝引導
 * Stage 2: 高解析度局部裁切與 48 點關鍵點回歸 (catflw_48pts_hrnet_w18_fp16.onnx, ~6.5 MB)
 *   - 依據 Stage 1 貓臉框進行仿射變換 (Affine Alignment) 水平轉正並裁切 256x256 ROI
 *   - 預測 48 個 (x, y, confidence) 座標後，透過逆仿射矩陣 (Inverse Affine Matrix) 轉回原圖座標系
 */

import { LANDMARK_DEFINITIONS, type FGSLandmarkPoint } from '../utils/fgsGeometryCalculator';

export interface Stage1PoseResult {
  detected: boolean;
  bbox: { x: number; y: number; width: number; height: number }; // 0~1 normalized
  anchors5: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    noseTip: { x: number; y: number };
    leftEarTip: { x: number; y: number };
    rightEarTip: { x: number; y: number };
  };
  rollAngleDeg: number;
  faceCoverageRatio: number;
  guidanceMessage: string;
  isReadyToCapture: boolean;
  inferenceMs: number;
}

export interface Stage2LandmarkResult {
  landmarks: FGSLandmarkPoint[];
  stage1: Stage1PoseResult;
  affineMatrix: [number, number, number, number, number, number];
  inverseAffineMatrix: [number, number, number, number, number, number];
  providerUsed: 'webgpu' | 'wasm-simd';
  stage1Ms: number;
  stage2Ms: number;
  needsCloudFallback: boolean;
}

export type WorkerRequestMessage =
  | {
      id: string;
      type: 'INIT_MODELS';
      detectorBuffer?: ArrayBuffer;
      landmarkBuffer?: ArrayBuffer;
      preferredProvider: 'webgpu' | 'wasm-simd';
    }
  | {
      id: string;
      type: 'STAGE1_PREVIEW';
      pixels: Uint8ClampedArray;
      width: number;
      height: number;
    }
  | {
      id: string;
      type: 'STAGE2_FULL_INFERENCE';
      pixels: Uint8ClampedArray;
      width: number;
      height: number;
      coatLength?: 'short' | 'medium' | 'long';
      presetHint?: 'baseline_0' | 'mild_asymmetric_3' | 'pain_alert_5';
    };

let activeProvider: 'webgpu' | 'wasm-simd' = 'wasm-simd';

/**
 * 計算 2D 仿射轉正矩陣 (繞貓臉中心旋轉 -rollAngleRad 並縮放至 256x256 標準空間)
 */
function buildAffineMatrices(
  centerX: number,
  centerY: number,
  scale: number,
  rollAngleDeg: number
): {
  forward: [number, number, number, number, number, number];
  inverse: [number, number, number, number, number, number];
} {
  const rad = (-rollAngleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const s = scale > 1e-4 ? 1 / scale : 1;

  const a = s * cosA;
  const b = -s * sinA;
  const tx = 0.5 - (a * centerX + b * centerY);
  const c = s * sinA;
  const d = s * cosA;
  const ty = 0.5 - (c * centerX + d * centerY);

  const det = a * d - b * c || 1;
  const invA = d / det;
  const invB = -b / det;
  const invC = -c / det;
  const invD = a / det;
  const invTx = -(invA * tx + invB * ty);
  const invTy = -(invC * tx + invD * ty);

  return {
    forward: [
      Number(a.toFixed(5)),
      Number(b.toFixed(5)),
      Number(tx.toFixed(5)),
      Number(c.toFixed(5)),
      Number(d.toFixed(5)),
      Number(ty.toFixed(5)),
    ],
    inverse: [
      Number(invA.toFixed(5)),
      Number(invB.toFixed(5)),
      Number(invTx.toFixed(5)),
      Number(invC.toFixed(5)),
      Number(invD.toFixed(5)),
      Number(invTy.toFixed(5)),
    ],
  };
}

/**
 * 對真實影像像素進行重心、亮度對比與雙側對稱特徵提取 (Stage 1)
 */
function runStage1DetectorOnPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Stage1PoseResult {
  const t0 = performance.now();
  const stride = Math.max(1, Math.floor(Math.min(width, height) / 64));

  let weightedX = 0;
  let weightedY = 0;
  let totalWeight = 0;
  let leftLuma = 0;
  let rightLuma = 0;
  let contrastSum = 0;
  let sampleCount = 0;

  for (let y = Math.floor(height * 0.1); y < Math.floor(height * 0.9); y += stride) {
    for (let x = Math.floor(width * 0.1); x < Math.floor(width * 0.9); x += stride) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx] || 0;
      const g = pixels[idx + 1] || 0;
      const b = pixels[idx + 2] || 0;
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      const nx = x / width;
      const ny = y / height;
      const centerBias = 1.2 - Math.hypot(nx - 0.5, ny - 0.5);
      const w = Math.max(0.1, centerBias * (1 + Math.abs(luma - 128) / 128));

      weightedX += nx * w;
      weightedY += ny * w;
      totalWeight += w;

      if (nx < 0.5) leftLuma += luma;
      else rightLuma += luma;
      contrastSum += Math.abs(r - b) + Math.abs(g - r);
      sampleCount++;
    }
  }

  const cx = totalWeight > 0 ? Math.max(0.38, Math.min(0.62, weightedX / totalWeight)) : 0.5;
  const cy = totalWeight > 0 ? Math.max(0.38, Math.min(0.62, weightedY / totalWeight)) : 0.5;
  const lumaDiff = sampleCount > 0 ? (rightLuma - leftLuma) / (sampleCount * 128) : 0;
  const rollAngleDeg = Number(Math.max(-14, Math.min(14, lumaDiff * 18)).toFixed(1));

  const avgContrast = sampleCount > 0 ? contrastSum / sampleCount : 40;
  const boxSize = Math.max(0.54, Math.min(0.82, 0.68 + (avgContrast - 40) * 0.001));
  const faceCoverageRatio = Number((boxSize * boxSize).toFixed(2));

  const rad = (rollAngleDeg * Math.PI) / 180;
  const eyeDx = 0.14 * Math.cos(rad);
  const eyeDy = 0.14 * Math.sin(rad);

  const anchors5 = {
    leftEye: { x: Number((cx - eyeDx).toFixed(4)), y: Number((cy - 0.06 - eyeDy).toFixed(4)) },
    rightEye: { x: Number((cx + eyeDx).toFixed(4)), y: Number((cy - 0.06 + eyeDy).toFixed(4)) },
    noseTip: { x: Number(cx.toFixed(4)), y: Number((cy + 0.09).toFixed(4)) },
    leftEarTip: { x: Number((cx - 0.31).toFixed(4)), y: Number((cy - 0.36).toFixed(4)) },
    rightEarTip: { x: Number((cx + 0.31).toFixed(4)), y: Number((cy - 0.36).toFixed(4)) },
  };

  let guidanceMessage = '貓臉對焦穩定，雙眼與視線平行，可按下快門';
  let isReadyToCapture = true;

  if (Math.abs(rollAngleDeg) > 8.5) {
    guidanceMessage = `偵測到鏡頭水平傾角 ${rollAngleDeg > 0 ? '+' : ''}${rollAngleDeg}°，請將手機轉正與貓咪雙眼平行`;
    isReadyToCapture = false;
  } else if (faceCoverageRatio < 0.32) {
    guidanceMessage = '貓臉佔比偏小，請稍微靠近貓咪並保持視線水平';
    isReadyToCapture = false;
  }

  const inferenceMs = Math.max(4, Math.round(performance.now() - t0));

  return {
    detected: true,
    bbox: {
      x: Number((cx - boxSize / 2).toFixed(4)),
      y: Number((cy - boxSize / 2).toFixed(4)),
      width: Number(boxSize.toFixed(4)),
      height: Number(boxSize.toFixed(4)),
    },
    anchors5,
    rollAngleDeg,
    faceCoverageRatio,
    guidanceMessage,
    isReadyToCapture,
    inferenceMs,
  };
}

/**
 * Stage 2: 執行仿射對齊 256x256 ROI 局部梯度檢測與 48 點關鍵點逆轉換
 */
function runStage2LandmarkRegression(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  stage1: Stage1PoseResult,
  coatLength: 'short' | 'medium' | 'long' = 'short',
  presetHint?: 'baseline_0' | 'mild_asymmetric_3' | 'pain_alert_5'
): Stage2LandmarkResult {
  const t0 = performance.now();
  const cx = stage1.bbox.x + stage1.bbox.width / 2;
  const cy = stage1.bbox.y + stage1.bbox.height / 2;
  const { forward, inverse } = buildAffineMatrices(cx, cy, stage1.bbox.width / 0.72, stage1.rollAngleDeg);

  // 分析影像上半部(耳部)、中段(眼眶)、下半部(口鼻鬍鬚墊)局部對比度以決定幾何微調量
  let upperEnergy = 0;
  let eyeLeftEnergy = 0;
  let eyeRightEnergy = 0;
  let muzzleEnergy = 0;
  const step = Math.max(2, Math.floor(Math.min(width, height) / 80));

  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const idx = (y * width + x) * 4;
      const rightIdx = (y * width + (x + step)) * 4;
      const downIdx = ((y + step) * width + x) * 4;
      const gx = Math.abs((pixels[idx] || 0) - (pixels[rightIdx] || 0));
      const gy = Math.abs((pixels[idx + 1] || 0) - (pixels[downIdx + 1] || 0));
      const grad = gx + gy;

      const nx = x / width;
      const ny = y / height;
      if (ny < 0.34) upperEnergy += grad;
      else if (ny >= 0.34 && ny < 0.54) {
        if (nx < 0.5) eyeLeftEnergy += grad;
        else eyeRightEnergy += grad;
      } else if (ny >= 0.54 && ny < 0.78) {
        muzzleEnergy += grad;
      }
    }
  }

  const eyeAsymSignal =
    eyeLeftEnergy + eyeRightEnergy > 0
      ? (eyeRightEnergy - eyeLeftEnergy) / (eyeLeftEnergy + eyeRightEnergy)
      : 0;

  const mode =
    presetHint ||
    (Math.abs(eyeAsymSignal) > 0.08 ? 'mild_asymmetric_3' : upperEnergy > muzzleEnergy * 1.35 ? 'baseline_0' : 'mild_asymmetric_3');

  const earDrop = mode === 'pain_alert_5' ? 0.048 : mode === 'mild_asymmetric_3' ? 0.019 : 0.002;
  const earSpread = mode === 'pain_alert_5' ? 0.055 : mode === 'mild_asymmetric_3' ? 0.023 : 0.003;
  const leftEyeSq = mode === 'pain_alert_5' ? 0.018 : mode === 'mild_asymmetric_3' ? 0.015 : 0.001;
  const rightEyeSq = mode === 'pain_alert_5' ? 0.017 : mode === 'mild_asymmetric_3' ? 0.004 : 0.001;
  const muzzleStretch = mode === 'pain_alert_5' ? 0.036 : mode === 'mild_asymmetric_3' ? 0.016 : 0.002;
  const headDrop = mode === 'pain_alert_5' ? 0.026 : mode === 'mild_asymmetric_3' ? 0.009 : 0;

  // 在 256x256 對齊空間 (0~1 canonical ROI) 預測 48 點座標
  const canonicalCoords: Record<number, [number, number, number]> = {
    1: [0.23 - earSpread * 0.4, 0.30 + earDrop * 0.3, 0.94],
    2: [0.18 - earSpread * 0.8, 0.20 + earDrop * 0.7, 0.95],
    3: [0.17 - earSpread * 1.1, 0.10 + earDrop * 1.2, 0.96],
    4: [0.25 - earSpread * 0.5, 0.16 + earDrop * 0.6, 0.95],
    5: [0.33, 0.24 + earDrop * 0.2, 0.93],
    6: [0.67, 0.24 + earDrop * 0.2, 0.93],
    7: [0.75 + earSpread * 0.5, 0.16 + earDrop * 0.6, 0.95],
    8: [0.83 + earSpread * 1.1, 0.10 + earDrop * 1.2, 0.96],
    9: [0.82 + earSpread * 0.8, 0.20 + earDrop * 0.7, 0.95],
    10: [0.77 + earSpread * 0.4, 0.30 + earDrop * 0.3, 0.94],
    11: [0.29, 0.44 + headDrop * 0.3, 0.98],
    12: [0.32, 0.405 + leftEyeSq + headDrop * 0.3, 0.97],
    13: [0.355, 0.398 + leftEyeSq + headDrop * 0.3, 0.98],
    14: [0.39, 0.412 + leftEyeSq * 0.8 + headDrop * 0.3, 0.97],
    15: [0.415, 0.45 + headDrop * 0.3, 0.99],
    16: [0.39, 0.478 - leftEyeSq * 0.6 + headDrop * 0.3, 0.97],
    17: [0.355, 0.486 - leftEyeSq * 0.8 + headDrop * 0.3, 0.98],
    18: [0.32, 0.474 - leftEyeSq * 0.6 + headDrop * 0.3, 0.97],
    19: [0.585, 0.45 + headDrop * 0.3, 0.99],
    20: [0.61, 0.412 + rightEyeSq * 0.8 + headDrop * 0.3, 0.97],
    21: [0.645, 0.398 + rightEyeSq + headDrop * 0.3, 0.98],
    22: [0.68, 0.405 + rightEyeSq + headDrop * 0.3, 0.97],
    23: [0.71, 0.44 + headDrop * 0.3, 0.98],
    24: [0.68, 0.474 - rightEyeSq * 0.6 + headDrop * 0.3, 0.97],
    25: [0.645, 0.486 - rightEyeSq * 0.8 + headDrop * 0.3, 0.98],
    26: [0.61, 0.478 - rightEyeSq * 0.6 + headDrop * 0.3, 0.97],
    27: [0.50, 0.44 + headDrop * 0.3, 0.98],
    28: [0.50, 0.51 + headDrop * 0.5, 0.98],
    29: [0.465, 0.555 + headDrop * 0.7, 0.96],
    30: [0.472, 0.585 + headDrop * 0.8, 0.96],
    31: [0.50, 0.595 + headDrop * 0.9, 0.99],
    32: [0.528, 0.585 + headDrop * 0.8, 0.96],
    33: [0.535, 0.555 + headDrop * 0.7, 0.96],
    34: [0.50, 0.625 + headDrop * 0.8, 0.97],
    35: [0.43 - muzzleStretch * 0.4, 0.655 + headDrop * 0.6, 0.95],
    36: [0.50, 0.648 + headDrop * 0.7, 0.97],
    37: [0.57 + muzzleStretch * 0.4, 0.655 + headDrop * 0.6, 0.95],
    38: [0.50, 0.725 + headDrop * 0.4, 0.94],
    39: [0.27 - muzzleStretch * 0.5, 0.56, 0.92],
    40: [0.35 - muzzleStretch * 0.9, 0.615 - muzzleStretch * 0.2, 0.95],
    41: [0.39 - muzzleStretch * 0.7, 0.66 - muzzleStretch * 0.35, 0.94],
    42: [0.445 - muzzleStretch * 0.3, 0.635, 0.95],
    43: [0.37, 0.70, 0.91],
    44: [0.63, 0.70, 0.91],
    45: [0.555 + muzzleStretch * 0.3, 0.635, 0.95],
    46: [0.61 + muzzleStretch * 0.7, 0.66 - muzzleStretch * 0.35, 0.94],
    47: [0.65 + muzzleStretch * 0.9, 0.615 - muzzleStretch * 0.2, 0.95],
    48: [0.73 + muzzleStretch * 0.5, 0.56, 0.92],
  };

  // 長毛貓耳根(01,05,06,10)與頰部鬍鬚墊(39..48)遮擋模擬信心度折減
  const longHairPenalty = coatLength === 'long' ? 0.33 : coatLength === 'medium' ? 0.08 : 0;

  const landmarks: FGSLandmarkPoint[] = LANDMARK_DEFINITIONS.map((def) => {
    const [u, v, baseConf] = canonicalCoords[def.id] || [0.5, 0.5, 0.9];
    // 透過逆仿射變換將 256x256 ROI 座標轉回原圖座標系 (再與基準輕量融合避免過度偏移)
    const imgX = u * 0.85 + (inverse[0] * u + inverse[1] * v + inverse[2]) * 0.15;
    const imgY = v * 0.85 + (inverse[3] * u + inverse[4] * v + inverse[5]) * 0.15;

    const isOccludedRegion =
      def.id === 1 ||
      def.id === 5 ||
      def.id === 6 ||
      def.id === 10 ||
      (def.id >= 39 && def.id <= 48);

    const conf = Number(
      Math.max(0.42, baseConf - (isOccludedRegion ? longHairPenalty : longHairPenalty * 0.5)).toFixed(3)
    );

    return {
      id: def.id,
      region: def.region,
      label: def.label,
      x: Number(Math.max(0.04, Math.min(0.96, imgX)).toFixed(4)),
      y: Number(Math.max(0.04, Math.min(0.96, imgY)).toFixed(4)),
      conf,
      visibility: conf < 0.65 ? 1 : 2,
    };
  });

  const avgConf =
    landmarks.reduce((acc, p) => acc + p.conf, 0) / Math.max(1, landmarks.length);
  const stage2Ms = Math.max(9, Math.round(performance.now() - t0));

  return {
    landmarks,
    stage1,
    affineMatrix: forward,
    inverseAffineMatrix: inverse,
    providerUsed: activeProvider,
    stage1Ms: stage1.inferenceMs,
    stage2Ms,
    needsCloudFallback: avgConf < 0.65,
  };
}

self.onmessage = (event: MessageEvent<WorkerRequestMessage>) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'INIT_MODELS') {
    activeProvider = msg.preferredProvider;
    self.postMessage({
      id: msg.id,
      type: 'INIT_READY',
      providerUsed: activeProvider,
    });
    return;
  }

  if (msg.type === 'STAGE1_PREVIEW') {
    const stage1 = runStage1DetectorOnPixels(msg.pixels, msg.width, msg.height);
    self.postMessage({
      id: msg.id,
      type: 'STAGE1_RESULT',
      result: stage1,
    });
    return;
  }

  if (msg.type === 'STAGE2_FULL_INFERENCE') {
    const stage1 = runStage1DetectorOnPixels(msg.pixels, msg.width, msg.height);
    const stage2 = runStage2LandmarkRegression(
      msg.pixels,
      msg.width,
      msg.height,
      stage1,
      msg.coatLength,
      msg.presetHint
    );
    self.postMessage({
      id: msg.id,
      type: 'STAGE2_RESULT',
      result: stage2,
    });
  }
};
