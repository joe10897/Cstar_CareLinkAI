/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/**
 * CareLink AI — 貓臉 48 點無尺度幾何演算法 (Scale-Invariant FGS Geometry Calculator)
 *
 * 實作《貓咪鬼臉量表 (Feline Grimace Scale, FGS)》五大動作單元 (Action Units, AU)：
 * 1. 無尺度標準化基準 (Inter-Ocular Scale Normalization): 以左眼內角 P15 與右眼內角 P19 之歐氏距離作為 D_base
 * 2. 眼眶收緊度 (Orbital Tightening): 左右眼縱橫比 EAR 與雙眼對稱比
 * 3. 耳朵位置 (Ear Position): 耳軸外旋角 θ_ear、耳尖下垂度與雙耳展開比
 * 4. 口鼻緊張度 (Muzzle Tension): 鬍鬚墊寬高扁平比 R_muzzle 與橢圓率
 * 5. 鬍鬚位置 (Whisker Change) & 頭部位置 (Head Position): 鬍鬚墊前傾向量角與雙眼水平傾角 (Roll Angle)
 *
 * 48 點座標定義區間：
 * - 01–10: 雙耳與耳根 (10 點: 左耳外根 01, 左耳外緣 02, 左耳尖 03, 左耳內緣 04, 左耳內根 05; 右耳內根 06, 右耳內緣 07, 右耳尖 08, 右耳外緣 09, 右耳外根 10)
 * - 11–26: 雙眼輪廓 (16 點: 左眼外角 11, 左上瞼一 12, 左上瞼二 13, 左上瞼三 14, 左眼內角 15, 左下瞼三 16, 左下瞼二 17, 左下瞼一 18; 右眼內角 19, 右上瞼一 20, 右上瞼二 21, 右上瞼三 22, 右眼外角 23, 右下瞼三 24, 右下瞼二 25, 右下瞼一 26)
 * - 27–34: 鼻樑與鼻頭 (8 點: 鼻根中心 27, 鼻樑中 28, 左鼻翼上 29, 左鼻孔外 30, 鼻尖正中 31, 右鼻孔外 32, 右鼻翼上 33, 人中上端 34)
 * - 35–38: 口唇與下巴 (4 點: 左上唇角 35, 口裂中心 36, 右上唇角 37, 下巴下緣正中 38)
 * - 39–48: 兩側頰部與鬍鬚墊 (10 點: 左頰外上 39, 左鬍鬚墊外 40, 左鬍鬚墊下 41, 左鬍鬚墊內 42, 左下顎緣 43; 右下顎緣 44, 右鬍鬚墊內 45, 右鬍鬚墊下 46, 右鬍鬚墊外 47, 右頰外上 48)
 */

export type FGSRegion = 'ears' | 'eyes' | 'nose' | 'mouth' | 'whiskers';

export interface FGSLandmarkPoint {
  id: number; // 1 ~ 48
  region: FGSRegion;
  label: string;
  x: number; // 0 ~ 1 normalized or pixel coordinate (all calculations use scale-invariant ratios)
  y: number;
  conf: number; // 0 ~ 1 confidence
  visibility?: 0 | 1 | 2; // 2: visible, 1: occluded (e.g. long hair), 0: not labeled
}

export interface FGSGeometricMetrics {
  interOcularBaseDist: number; // D_base (normalized 0~1 space)
  leftEAR: number; // 左眼縱橫比
  rightEAR: number; // 右眼縱橫比
  meanEAR: number; // 雙眼平均縱橫比
  earSymmetryRatio: number; // 左右眼對稱比 |L - R| / max(L, R)
  leftEarAngleDeg: number; // 左耳外旋夾角 (度)
  rightEarAngleDeg: number; // 右耳外旋夾角 (度)
  meanEarAngleDeg: number; // 平均耳尖外展角 (度)
  earSpanRatio: number; // 兩耳尖距離 / D_base
  earTipDropRatio: number; // 耳尖相對於耳根連線之垂直高度比
  muzzleRatio: number; // R_muzzle = 兩側鬍鬚墊寬度 / (鼻根至下巴高度)
  muzzleEllipticity: number; // 鬍鬚墊扁平橢圓率
  whiskerForwardAngleDeg: number; // 鬍鬚墊下緣聚合角度 (度)
  headRollAngleDeg: number; // 雙眼水平傾角 Roll (度)
  headPitchRatio: number; // 俯仰低頭比例 (鼻尖至雙眼連線距離 / D_base)
  avgConfidence: number; // 48 點平均信心度
}

export interface FGSScores {
  ear: 0 | 1 | 2;
  orbital: 0 | 1 | 2;
  muzzle: 0 | 1 | 2;
  whisker: 0 | 1 | 2;
  head: 0 | 1 | 2;
  total: number; // 0 ~ 10
}

export interface FGSBaselineDelta {
  meanEARDeltaPct: number; // 相較於 0 分健康基線的眼眶收緊變化百分比 (負值代表收緊)
  earSpanDeltaPct: number; // 雙耳展開比變化百分比
  muzzleRatioDeltaPct: number; // 口鼻扁平比變化百分比 (正值代表橫向繃緊)
  whiskerAngleDeltaPct: number; // 鬍鬚角度變化百分比
  headPitchDeltaPct: number; // 頭部低垂變化百分比
}

export interface FGSAnalysisResult {
  metrics: FGSGeometricMetrics;
  scores: FGSScores;
  baselineDelta: FGSBaselineDelta | null;
  cameraWarnings: string[];
  observationNotes: string;
  urgencyLevel: 'green' | 'yellow' | 'red';
}

export const LANDMARK_DEFINITIONS: ReadonlyArray<{
  id: number;
  region: FGSRegion;
  label: string;
}> = [
  // 01–10 雙耳與耳根
  { id: 1, region: 'ears', label: '左耳外根' },
  { id: 2, region: 'ears', label: '左耳外緣中' },
  { id: 3, region: 'ears', label: '左耳尖' },
  { id: 4, region: 'ears', label: '左耳內緣中' },
  { id: 5, region: 'ears', label: '左耳內根' },
  { id: 6, region: 'ears', label: '右耳內根' },
  { id: 7, region: 'ears', label: '右耳內緣中' },
  { id: 8, region: 'ears', label: '右耳尖' },
  { id: 9, region: 'ears', label: '右耳外緣中' },
  { id: 10, region: 'ears', label: '右耳外根' },
  // 11–26 雙眼輪廓
  { id: 11, region: 'eyes', label: '左眼外角' },
  { id: 12, region: 'eyes', label: '左上瞼外' },
  { id: 13, region: 'eyes', label: '左上瞼中' },
  { id: 14, region: 'eyes', label: '左上瞼內' },
  { id: 15, region: 'eyes', label: '左眼內角' },
  { id: 16, region: 'eyes', label: '左下瞼內' },
  { id: 17, region: 'eyes', label: '左下瞼中' },
  { id: 18, region: 'eyes', label: '左下瞼外' },
  { id: 19, region: 'eyes', label: '右眼內角' },
  { id: 20, region: 'eyes', label: '右上瞼內' },
  { id: 21, region: 'eyes', label: '右上瞼中' },
  { id: 22, region: 'eyes', label: '右上瞼外' },
  { id: 23, region: 'eyes', label: '右眼外角' },
  { id: 24, region: 'eyes', label: '右下瞼外' },
  { id: 25, region: 'eyes', label: '右下瞼中' },
  { id: 26, region: 'eyes', label: '右下瞼內' },
  // 27–34 鼻樑與鼻頭
  { id: 27, region: 'nose', label: '鼻根中心' },
  { id: 28, region: 'nose', label: '鼻樑中點' },
  { id: 29, region: 'nose', label: '左鼻翼上緣' },
  { id: 30, region: 'nose', label: '左鼻孔外緣' },
  { id: 31, region: 'nose', label: '鼻尖正中' },
  { id: 32, region: 'nose', label: '右鼻孔外緣' },
  { id: 33, region: 'nose', label: '右鼻翼上緣' },
  { id: 34, region: 'nose', label: '人中上端' },
  // 35–38 口唇與下巴
  { id: 35, region: 'mouth', label: '左上唇角' },
  { id: 36, region: 'mouth', label: '口裂中心' },
  { id: 37, region: 'mouth', label: '右上唇角' },
  { id: 38, region: 'mouth', label: '下巴正中下緣' },
  // 39–48 兩側頰部與鬍鬚墊
  { id: 39, region: 'whiskers', label: '左頰外上緣' },
  { id: 40, region: 'whiskers', label: '左鬍鬚墊外緣' },
  { id: 41, region: 'whiskers', label: '左鬍鬚墊下緣' },
  { id: 42, region: 'whiskers', label: '左鬍鬚墊內緣' },
  { id: 43, region: 'whiskers', label: '左下顎輪廓' },
  { id: 44, region: 'whiskers', label: '右下顎輪廓' },
  { id: 45, region: 'whiskers', label: '右鬍鬚墊內緣' },
  { id: 46, region: 'whiskers', label: '右鬍鬚墊下緣' },
  { id: 47, region: 'whiskers', label: '右鬍鬚墊外緣' },
  { id: 48, region: 'whiskers', label: '右頰外上緣' },
];

export function euclideanDistance(
  p1: Pick<FGSLandmarkPoint, 'x' | 'y'>,
  p2: Pick<FGSLandmarkPoint, 'x' | 'y'>
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function vectorAngleDeg(
  origin: Pick<FGSLandmarkPoint, 'x' | 'y'>,
  targetA: Pick<FGSLandmarkPoint, 'x' | 'y'>,
  targetB: Pick<FGSLandmarkPoint, 'x' | 'y'>
): number {
  const vAx = targetA.x - origin.x;
  const vAy = targetA.y - origin.y;
  const vBx = targetB.x - origin.x;
  const vBy = targetB.y - origin.y;
  const magA = Math.sqrt(vAx * vAx + vAy * vAy);
  const magB = Math.sqrt(vBx * vBx + vBy * vBy);
  if (magA < 1e-6 || magB < 1e-6) return 0;
  const cosTheta = Math.max(-1, Math.min(1, (vAx * vBx + vAy * vBy) / (magA * magB)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

function getPoint(points: FGSLandmarkPoint[], id: number): FGSLandmarkPoint {
  const found = points.find((p) => p.id === id);
  if (found) return found;
  const idx = id - 1;
  if (points[idx]) return points[idx];
  return { id, region: 'nose', label: `P${id}`, x: 0.5, y: 0.5, conf: 0 };
}

/**
 * 計算單眼縱橫比 EAR (Eye Aspect Ratio)
 * EAR = (||P_upper1 - P_lower1|| + ||P_upper2 - P_lower2||) / (2 * ||P_outer - P_inner||)
 */
export function computeSingleEyeEAR(
  pOuter: FGSLandmarkPoint,
  pUpper1: FGSLandmarkPoint,
  pUpper2: FGSLandmarkPoint,
  pInner: FGSLandmarkPoint,
  pLower2: FGSLandmarkPoint,
  pLower1: FGSLandmarkPoint
): number {
  const v1 = euclideanDistance(pUpper1, pLower1);
  const v2 = euclideanDistance(pUpper2, pLower2);
  const horiz = euclideanDistance(pOuter, pInner);
  if (horiz < 1e-6) return 0;
  return (v1 + v2) / (2.0 * horiz);
}

/**
 * 計算完整 48 點無尺度幾何特徵與 FGS 五大動作單元評分
 */
export function calculateFGSGeometryAndScores(
  landmarks: FGSLandmarkPoint[],
  baselineMetrics?: Partial<FGSGeometricMetrics> | null
): FGSAnalysisResult {
  // 1. 無尺度標準化基準 D_base (左眼內角 P15 與右眼內角 P19 之歐氏距離)
  const p15 = getPoint(landmarks, 15);
  const p19 = getPoint(landmarks, 19);
  const rawBaseDist = euclideanDistance(p15, p19);
  const D_base = Math.max(rawBaseDist, 0.04);

  // 2. 眼眶收緊度 (Orbital Tightening) — 左右眼縱橫比 EAR
  // 左眼: 外角11, 上瞼外12, 上瞼內14, 內角15, 下瞼內16, 下瞼外18 (同時納入上瞼中13/下瞼中17平均)
  const p11 = getPoint(landmarks, 11);
  const p12 = getPoint(landmarks, 12);
  const p13 = getPoint(landmarks, 13);
  const p14 = getPoint(landmarks, 14);
  const p16 = getPoint(landmarks, 16);
  const p17 = getPoint(landmarks, 17);
  const p18 = getPoint(landmarks, 18);

  const leftEAROuterInner = computeSingleEyeEAR(p11, p12, p14, p15, p16, p18);
  const leftCenterVert = euclideanDistance(p13, p17) / Math.max(euclideanDistance(p11, p15), 1e-6);
  const leftEAR = Number(((leftEAROuterInner * 0.65 + leftCenterVert * 0.35)).toFixed(4));

  // 右眼: 內角19, 上瞼內20, 上瞼中21, 上瞼外22, 外角23, 下瞼外24, 下瞼中25, 下瞼內26
  const p20 = getPoint(landmarks, 20);
  const p21 = getPoint(landmarks, 21);
  const p22 = getPoint(landmarks, 22);
  const p23 = getPoint(landmarks, 23);
  const p24 = getPoint(landmarks, 24);
  const p25 = getPoint(landmarks, 25);
  const p26 = getPoint(landmarks, 26);

  const rightEAROuterInner = computeSingleEyeEAR(p23, p22, p20, p19, p26, p24);
  const rightCenterVert = euclideanDistance(p21, p25) / Math.max(euclideanDistance(p23, p19), 1e-6);
  const rightEAR = Number(((rightEAROuterInner * 0.65 + rightCenterVert * 0.35)).toFixed(4));

  const meanEAR = Number(((leftEAR + rightEAR) / 2).toFixed(4));
  const earSymmetryRatio = Number(
    (Math.abs(leftEAR - rightEAR) / Math.max(leftEAR, rightEAR, 0.01)).toFixed(4)
  );

  // 3. 耳朵位置 (Ear Position) — 耳軸外旋角 θ_ear 與雙耳展開比
  const p1 = getPoint(landmarks, 1); // 左耳外根
  const p3 = getPoint(landmarks, 3); // 左耳尖
  const p5 = getPoint(landmarks, 5); // 左耳內根
  const p6 = getPoint(landmarks, 6); // 右耳內根
  const p8 = getPoint(landmarks, 8); // 右耳尖
  const p10 = getPoint(landmarks, 10); // 右耳外根

  // 計算耳根中點至耳尖向量與垂直向上軸之夾角 (外展角度越大代表耳朵越向兩側壓平/飛機耳)
  const leftEarBaseMid = { x: (p1.x + p5.x) / 2, y: (p1.y + p5.y) / 2 };
  const rightEarBaseMid = { x: (p6.x + p10.x) / 2, y: (p6.y + p10.y) / 2 };
  const leftVerticalRef = { x: leftEarBaseMid.x, y: leftEarBaseMid.y - D_base };
  const rightVerticalRef = { x: rightEarBaseMid.x, y: rightEarBaseMid.y - D_base };

  const leftEarAngleDeg = Number(vectorAngleDeg(leftEarBaseMid, leftVerticalRef, p3).toFixed(1));
  const rightEarAngleDeg = Number(vectorAngleDeg(rightEarBaseMid, rightVerticalRef, p8).toFixed(1));
  const meanEarAngleDeg = Number(((leftEarAngleDeg + rightEarAngleDeg) / 2).toFixed(1));

  const earSpanRatio = Number((euclideanDistance(p3, p8) / D_base).toFixed(3));
  const meanEarRootY = (p5.y + p6.y) / 2;
  const meanEarTipY = (p3.y + p8.y) / 2;
  const earTipDropRatio = Number(((meanEarRootY - meanEarTipY) / D_base).toFixed(3));

  // 4. 口鼻緊張度 (Muzzle Tension) — 鬍鬚墊寬高扁平比 R_muzzle
  // R_muzzle = ||P_cheek_left(40) - P_cheek_right(47)|| / ||P_nose_bridge(27) - P_chin(38)||
  const p27 = getPoint(landmarks, 27); // 鼻根中心
  const p31 = getPoint(landmarks, 31); // 鼻尖正中
  const p38 = getPoint(landmarks, 38); // 下巴下緣正中
  const p40 = getPoint(landmarks, 40); // 左鬍鬚墊外緣
  const p41 = getPoint(landmarks, 41); // 左鬍鬚墊下緣
  const p42 = getPoint(landmarks, 42); // 左鬍鬚墊內緣
  const p45 = getPoint(landmarks, 45); // 右鬍鬚墊內緣
  const p46 = getPoint(landmarks, 46); // 右鬍鬚墊下緣
  const p47 = getPoint(landmarks, 47); // 右鬍鬚墊外緣

  const cheekWidth = euclideanDistance(p40, p47);
  const noseBridgeToChin = Math.max(euclideanDistance(p27, p38), D_base * 0.5);
  const muzzleRatio = Number((cheekWidth / noseBridgeToChin).toFixed(3));

  // 鬍鬚墊扁平橢圓率: 口鼻水平展開寬度 vs 鼻尖到下巴高度
  const noseTipToChin = Math.max(euclideanDistance(p31, p38), D_base * 0.2);
  const muzzleEllipticity = Number((cheekWidth / noseTipToChin).toFixed(3));

  // 5. 鬍鬚位置與頭部傾角
  // 鬍鬚墊前傾緊張角: 由鼻尖(31)至左右鬍鬚墊外下緣(41, 46)之張開夾角
  const whiskerForwardAngleDeg = Number(vectorAngleDeg(p31, p41, p46).toFixed(1));

  // 雙眼中心連線水平傾角 Roll Angle
  const leftEyeCenter = { x: (p11.x + p15.x) / 2, y: (p11.y + p15.y) / 2 };
  const rightEyeCenter = { x: (p19.x + p23.x) / 2, y: (p19.y + p23.y) / 2 };
  const headRollAngleDeg = Number(
    ((Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x) * 180) / Math.PI).toFixed(1)
  );

  // 頭部俯仰比例 (雙眼中心連線中點到鼻尖距離 / D_base)
  const midEyes = {
    x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
    y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
  };
  const headPitchRatio = Number((euclideanDistance(midEyes, p31) / D_base).toFixed(3));

  const avgConfidence = Number(
    (
      landmarks.reduce((acc, pt) => acc + (typeof pt.conf === 'number' ? pt.conf : 0.9), 0) /
      Math.max(landmarks.length, 1)
    ).toFixed(3)
  );

  const metrics: FGSGeometricMetrics = {
    interOcularBaseDist: Number(D_base.toFixed(4)),
    leftEAR,
    rightEAR,
    meanEAR,
    earSymmetryRatio,
    leftEarAngleDeg,
    rightEarAngleDeg,
    meanEarAngleDeg,
    earSpanRatio,
    earTipDropRatio,
    muzzleRatio,
    muzzleEllipticity,
    whiskerForwardAngleDeg,
    headRollAngleDeg,
    headPitchRatio,
    avgConfidence,
  };

  // 與個體平時 0 分健康基線比對 (若無個體基線則採用標準健康成貓幾何常模)
  const refEAR = baselineMetrics?.meanEAR ?? 0.52;
  const refEarSpan = baselineMetrics?.earSpanRatio ?? 2.05;
  const refMuzzleRatio = baselineMetrics?.muzzleRatio ?? 0.92;
  const refWhiskerAngle = baselineMetrics?.whiskerForwardAngleDeg ?? 108;
  const refHeadPitch = baselineMetrics?.headPitchRatio ?? 0.78;

  const meanEARDeltaPct = Number((((meanEAR - refEAR) / refEAR) * 100).toFixed(1));
  const earSpanDeltaPct = Number((((earSpanRatio - refEarSpan) / refEarSpan) * 100).toFixed(1));
  const muzzleRatioDeltaPct = Number((((muzzleRatio - refMuzzleRatio) / refMuzzleRatio) * 100).toFixed(1));
  const whiskerAngleDeltaPct = Number(
    (((whiskerForwardAngleDeg - refWhiskerAngle) / refWhiskerAngle) * 100).toFixed(1)
  );
  const headPitchDeltaPct = Number((((headPitchRatio - refHeadPitch) / refHeadPitch) * 100).toFixed(1));

  const baselineDelta: FGSBaselineDelta | null = baselineMetrics
    ? {
        meanEARDeltaPct,
        earSpanDeltaPct,
        muzzleRatioDeltaPct,
        whiskerAngleDeltaPct,
        headPitchDeltaPct,
      }
    : {
        meanEARDeltaPct,
        earSpanDeltaPct,
        muzzleRatioDeltaPct,
        whiskerAngleDeltaPct,
        headPitchDeltaPct,
      };

  // 計算五大動作單元 (AU) 得分 (0 / 1 / 2)
  // 1) 眼眶收緊度 (Orbital Tightening):
  // 若單眼或雙眼 EAR 較基線下降 15%~35% 判定為 1/2；下降 >35% 判定為 2/2
  const minEyeEAR = Math.min(leftEAR, rightEAR);
  const worstEyeDropPct = ((refEAR - minEyeEAR) / refEAR) * 100;
  let orbitalScore: 0 | 1 | 2 = 0;
  if (worstEyeDropPct > 35 || meanEAR < 0.31) {
    orbitalScore = 2;
  } else if (worstEyeDropPct >= 15 || meanEAR < 0.43 || earSymmetryRatio > 0.14) {
    orbitalScore = 1;
  }

  // 2) 耳朵位置 (Ear Position):
  let earScore: 0 | 1 | 2 = 0;
  if (meanEarAngleDeg > 42 || earTipDropRatio < 0.68 || earSpanDeltaPct > 18) {
    earScore = 2;
  } else if (meanEarAngleDeg >= 26 || earTipDropRatio < 0.92 || earSpanDeltaPct >= 8) {
    earScore = 1;
  }

  // 3) 口鼻緊張度 (Muzzle Tension):
  let muzzleScore: 0 | 1 | 2 = 0;
  if (muzzleRatio > 1.16 || muzzleRatioDeltaPct > 20) {
    muzzleScore = 2;
  } else if (muzzleRatio >= 1.01 || muzzleRatioDeltaPct >= 9) {
    muzzleScore = 1;
  }

  // 4) 鬍鬚位置 (Whisker Change):
  let whiskerScore: 0 | 1 | 2 = 0;
  if (whiskerForwardAngleDeg > 132 || whiskerAngleDeltaPct > 18) {
    whiskerScore = 2;
  } else if (whiskerForwardAngleDeg >= 118 || whiskerAngleDeltaPct >= 8) {
    whiskerScore = 1;
  }

  // 5) 頭部位置 (Head Position):
  let headScore: 0 | 1 | 2 = 0;
  if (headPitchRatio > 0.98 || Math.abs(headRollAngleDeg) > 16) {
    headScore = 2;
  } else if (headPitchRatio >= 0.86 || Math.abs(headRollAngleDeg) >= 9) {
    headScore = 1;
  }

  const total = earScore + orbitalScore + muzzleScore + whiskerScore + headScore;
  const scores: FGSScores = {
    ear: earScore,
    orbital: orbitalScore,
    muzzle: muzzleScore,
    whisker: whiskerScore,
    head: headScore,
    total,
  };

  // 防呆相機警語 (Camera Warnings)
  const cameraWarnings: string[] = [];
  if (Math.abs(headRollAngleDeg) > 10) {
    cameraWarnings.push('roll_tilt_detected');
  }
  if (headPitchRatio < 0.58) {
    cameraWarnings.push('low_angle_detected');
  }
  if (avgConfidence < 0.65) {
    cameraWarnings.push('long_hair_occlusion');
  }

  // 自動生成臨床級客觀觀察描述 (遵守《獸醫師法》非診斷規範)
  const observations: string[] = [];
  if (earSymmetryRatio >= 0.12) {
    if (leftEAR < rightEAR) {
      observations.push(`左眼相對略窄（左眼 EAR ${leftEAR.toFixed(2)} vs 右眼 ${rightEAR.toFixed(2)}）`);
    } else {
      observations.push(`右眼相對略窄（右眼 EAR ${rightEAR.toFixed(2)} vs 左眼 ${leftEAR.toFixed(2)}）`);
    }
  } else if (orbitalScore === 2) {
    observations.push(`雙眼眼瞼明顯收緊（平均 EAR ${meanEAR.toFixed(2)}，較基線下降 ${Math.abs(meanEARDeltaPct).toFixed(1)}%）`);
  } else if (orbitalScore === 1) {
    observations.push(`眼眶呈現輕度收緊（平均 EAR ${meanEAR.toFixed(2)}）`);
  } else {
    observations.push(`雙眼輪廓開闊對稱（平均 EAR ${meanEAR.toFixed(2)}）`);
  }

  if (earScore === 2) {
    observations.push(`雙耳明顯向兩側外旋壓低（外展角 ${meanEarAngleDeg.toFixed(1)}°）`);
  } else if (earScore === 1) {
    observations.push(`雙耳尖略微外展（外展角 ${meanEarAngleDeg.toFixed(1)}°）`);
  } else {
    observations.push(`雙耳朝前自然直立（外展角 ${meanEarAngleDeg.toFixed(1)}°）`);
  }

  if (muzzleScore >= 1) {
    observations.push(`口鼻鬍鬚墊略呈橫向橢圓緊繃（扁平比 R=${muzzleRatio.toFixed(2)}）`);
  } else {
    observations.push(`口鼻與兩頰輪廓放鬆圓潤（扁平比 R=${muzzleRatio.toFixed(2)}）`);
  }

  let urgencyLevel: 'green' | 'yellow' | 'red' = 'green';
  if (total >= 4) {
    urgencyLevel = 'red';
  } else if (total >= 2) {
    urgencyLevel = 'yellow';
  }

  return {
    metrics,
    scores,
    baselineDelta,
    cameraWarnings,
    observationNotes: observations.join('；') + '。',
    urgencyLevel,
  };
}

/**
 * 產生預設 0 分健康基線與不同臨床情境的真實比例 48 點座標
 * 用於初始化基線與後台標註微調工作台
 */
export function createPresetLandmarks(
  preset: 'baseline_0' | 'mild_asymmetric_3' | 'pain_alert_5'
): FGSLandmarkPoint[] {
  const earDrop = preset === 'pain_alert_5' ? 0.048 : preset === 'mild_asymmetric_3' ? 0.018 : 0;
  const earSpread = preset === 'pain_alert_5' ? 0.055 : preset === 'mild_asymmetric_3' ? 0.022 : 0;
  const leftEyeSq = preset === 'pain_alert_5' ? 0.018 : preset === 'mild_asymmetric_3' ? 0.015 : 0;
  const rightEyeSq = preset === 'pain_alert_5' ? 0.017 : preset === 'mild_asymmetric_3' ? 0.004 : 0;
  const muzzleStretch = preset === 'pain_alert_5' ? 0.036 : preset === 'mild_asymmetric_3' ? 0.016 : 0;
  const headDrop = preset === 'pain_alert_5' ? 0.026 : preset === 'mild_asymmetric_3' ? 0.008 : 0;

  const rawCoords: Record<number, [number, number, number]> = {
    // 01–10 雙耳與耳根
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

    // 11–18 左眼輪廓 (8 點)
    11: [0.29, 0.44 + headDrop * 0.3, 0.98],
    12: [0.32, 0.405 + leftEyeSq + headDrop * 0.3, 0.97],
    13: [0.355, 0.398 + leftEyeSq + headDrop * 0.3, 0.98],
    14: [0.39, 0.412 + leftEyeSq * 0.8 + headDrop * 0.3, 0.97],
    15: [0.415, 0.45 + headDrop * 0.3, 0.99],
    16: [0.39, 0.478 - leftEyeSq * 0.6 + headDrop * 0.3, 0.97],
    17: [0.355, 0.486 - leftEyeSq * 0.8 + headDrop * 0.3, 0.98],
    18: [0.32, 0.474 - leftEyeSq * 0.6 + headDrop * 0.3, 0.97],

    // 19–26 右眼輪廓 (8 點)
    19: [0.585, 0.45 + headDrop * 0.3, 0.99],
    20: [0.61, 0.412 + rightEyeSq * 0.8 + headDrop * 0.3, 0.97],
    21: [0.645, 0.398 + rightEyeSq + headDrop * 0.3, 0.98],
    22: [0.68, 0.405 + rightEyeSq + headDrop * 0.3, 0.97],
    23: [0.71, 0.44 + headDrop * 0.3, 0.98],
    24: [0.68, 0.474 - rightEyeSq * 0.6 + headDrop * 0.3, 0.97],
    25: [0.645, 0.486 - rightEyeSq * 0.8 + headDrop * 0.3, 0.98],
    26: [0.61, 0.478 - rightEyeSq * 0.6 + headDrop * 0.3, 0.97],

    // 27–34 鼻樑與鼻頭 (8 點)
    27: [0.50, 0.44 + headDrop * 0.3, 0.98],
    28: [0.50, 0.51 + headDrop * 0.5, 0.98],
    29: [0.465, 0.555 + headDrop * 0.7, 0.96],
    30: [0.472, 0.585 + headDrop * 0.8, 0.96],
    31: [0.50, 0.595 + headDrop * 0.9, 0.99],
    32: [0.528, 0.585 + headDrop * 0.8, 0.96],
    33: [0.535, 0.555 + headDrop * 0.7, 0.96],
    34: [0.50, 0.625 + headDrop * 0.8, 0.97],

    // 35–38 口唇與下巴 (4 點)
    35: [0.43 - muzzleStretch * 0.4, 0.655 + headDrop * 0.6, 0.95],
    36: [0.50, 0.648 + headDrop * 0.7, 0.97],
    37: [0.57 + muzzleStretch * 0.4, 0.655 + headDrop * 0.6, 0.95],
    38: [0.50, 0.725 + headDrop * 0.4, 0.94],

    // 39–48 兩側頰部與鬍鬚墊 (10 點)
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

  return LANDMARK_DEFINITIONS.map((def) => {
    const [x, y, conf] = rawCoords[def.id] || [0.5, 0.5, 0.9];
    return {
      id: def.id,
      region: def.region,
      label: def.label,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      conf,
      visibility: 2,
    };
  });
}
