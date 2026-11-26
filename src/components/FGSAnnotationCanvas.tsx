/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FGSLandmarkPoint, FGSRegion } from '../utils/fgsGeometryCalculator';

export type CanvasThemeMode = 'darkroom' | 'clinical-light';

export interface FGSAnnotationCanvasProps {
  imageUrl: string;
  landmarks: FGSLandmarkPoint[];
  baselineLandmarks?: FGSLandmarkPoint[] | null;
  showBaselineOverlay?: boolean;
  themeMode: CanvasThemeMode;
  onThemeModeChange?: (mode: CanvasThemeMode) => void;
  editable?: boolean;
  selectedPointId?: number | null;
  onSelectPoint?: (id: number | null) => void;
  onUpdateLandmarks?: (updated: FGSLandmarkPoint[]) => void;
  enableLoupe?: boolean;
  activeRegionFilter?: 'all' | FGSRegion;
  earAspectRatio?: number;
  hideBuiltInChrome?: boolean;
}

const CONTOUR_GROUPS: ReadonlyArray<{ points: number[]; closed: boolean; region: FGSRegion }> = [
  { points: [1, 2, 3, 4, 5], closed: false, region: 'ears' },
  { points: [6, 7, 8, 9, 10], closed: false, region: 'ears' },
  { points: [11, 12, 13, 14, 15, 16, 17, 18], closed: true, region: 'eyes' },
  { points: [19, 20, 21, 22, 23, 24, 25, 26], closed: true, region: 'eyes' },
  { points: [27, 28, 31, 34], closed: false, region: 'nose' },
  { points: [29, 30, 31, 32, 33], closed: false, region: 'nose' },
  { points: [35, 36, 37, 38], closed: true, region: 'mouth' },
  { points: [39, 40, 41, 42, 43], closed: false, region: 'whiskers' },
  { points: [48, 47, 46, 45, 44], closed: false, region: 'whiskers' },
];

const CONSUMER_CALLOUT_IDS = new Set([2, 5, 7, 10, 14, 18, 22, 26, 31, 37, 40, 45]);

function readTokenColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val || fallback;
}

export const FGSAnnotationCanvas: React.FC<FGSAnnotationCanvasProps> = ({
  imageUrl,
  landmarks,
  baselineLandmarks,
  showBaselineOverlay = false,
  themeMode,
  onThemeModeChange,
  editable = false,
  selectedPointId = null,
  onSelectPoint,
  onUpdateLandmarks,
  enableLoupe = true,
  activeRegionFilter = 'all',
  earAspectRatio,
  hideBuiltInChrome = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const [imageReadyVersion, setImageReadyVersion] = useState(0);

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingPointId, setDraggingPointId] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchDistanceRef = useRef<number | null>(null);
  const [cursorNormPos, setCursorNormPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      setImageReadyVersion((v) => v + 1);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const getRegionColor = useCallback(
    (region: FGSRegion, mode: CanvasThemeMode): string => {
      if (mode === 'clinical-light') {
        if (region === 'eyes') return readTokenColor('--color-landmark-eye', '#0369A1');
        if (region === 'ears') return readTokenColor('--color-landmark-ear', '#6D28D9');
        if (region === 'whiskers') return readTokenColor('--color-landmark-whisker', '#047857');
        if (region === 'nose') return readTokenColor('--color-landmark-nose', '#B45309');
        return readTokenColor('--color-landmark-mouth', '#BE123C');
      }
      // 深色暗房檢測模式：對應五色臨床解剖標註
      switch (region) {
        case 'ears':
          return readTokenColor('--color-landmark-ear-dot', '#8B5CF6');
        case 'eyes':
          return readTokenColor('--color-landmark-eye-dot', '#38BDF8');
        case 'nose':
          return readTokenColor('--color-landmark-nose-dot', '#F59E0B');
        case 'mouth':
          return readTokenColor('--color-landmark-mouth-dot', '#F43F5E');
        case 'whiskers':
          return readTokenColor('--color-landmark-whisker-dot', '#34D399');
      }
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const darkBg = readTokenColor('--color-bg-dark', '#1E242B');
    const lightBg = readTokenColor('--color-paper', '#FFFFFF');
    const inkColor = readTokenColor('--color-text-primary', '#18181B');
    const ruleColor = readTokenColor('--color-border-strong', 'rgba(24,24,27,0.25)');
    const accentColor = readTokenColor('--color-brand-primary', '#1F4E3D');

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = themeMode === 'darkroom' ? darkBg : lightBg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2 + pan.x, H / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);

    // 繪製底圖 (維持原比例 cover 裁切，避免貓臉變形)
    if (loadedImageRef.current) {
      const img = loadedImageRef.current;
      const imgW = img.naturalWidth || img.width || W;
      const imgH = img.naturalHeight || img.height || H;
      const canvasRatio = W / H;
      const imgRatio = imgW / imgH;

      let sx = 0;
      let sy = 0;
      let sw = imgW;
      let sh = imgH;
      if (imgRatio > canvasRatio) {
        sw = imgH * canvasRatio;
        sx = (imgW - sw) / 2;
      } else {
        sh = imgW / canvasRatio;
        sy = Math.max(0, (imgH - sh) * 0.42);
      }

      ctx.save();
      ctx.globalAlpha = themeMode === 'clinical-light' ? 0.32 : 0.94;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      ctx.restore();

      if (themeMode === 'darkroom') {
        const vig = ctx.createLinearGradient(0, 0, 0, H);
        vig.addColorStop(0, 'rgba(19, 24, 29, 0.56)');
        vig.addColorStop(0.22, 'rgba(19, 24, 29, 0.06)');
        vig.addColorStop(0.75, 'rgba(19, 24, 29, 0.08)');
        vig.addColorStop(1, 'rgba(19, 24, 29, 0.72)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // 繪製平時 0 分健康基線對照點 (虛線與半透明圓點)
    if (showBaselineOverlay && baselineLandmarks && baselineLandmarks.length > 0) {
      ctx.save();
      ctx.strokeStyle = ruleColor;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5 / zoom;
      for (const pt of baselineLandmarks) {
        const cur = landmarks.find((p) => p.id === pt.id);
        if (cur) {
          ctx.beginPath();
          ctx.moveTo(pt.x * W, pt.y * H);
          ctx.lineTo(cur.x * W, cur.y * H);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 繪製無尺度標準化基準線 D_base (左眼內角 P15 <-> 右眼內角 P19)
    const p15 = landmarks.find((p) => p.id === 15);
    const p19 = landmarks.find((p) => p.id === 19);
    if (p15 && p19 && (!hideBuiltInChrome || activeRegionFilter === 'eyes')) {
      ctx.save();
      ctx.strokeStyle = themeMode === 'darkroom' ? 'rgba(56, 189, 248, 0.55)' : accentColor;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.moveTo(p15.x * W, p15.y * H);
      ctx.lineTo(p19.x * W, p19.y * H);
      ctx.stroke();
      ctx.restore();
    }

    // 繪製解剖區域幾何連線
    for (const group of CONTOUR_GROUPS) {
      if (activeRegionFilter !== 'all' && group.region !== activeRegionFilter) continue;
      const pts = group.points
        .map((id) => landmarks.find((p) => p.id === id))
        .filter((p): p is FGSLandmarkPoint => Boolean(p));
      if (pts.length < 2) continue;

      ctx.save();
      ctx.strokeStyle = getRegionColor(group.region, themeMode);
      ctx.globalAlpha = themeMode === 'darkroom' ? 0.82 : 0.9;
      ctx.lineWidth = (group.region === 'eyes' || group.region === 'mouth' ? 2.0 : 1.5) / zoom;
      if (group.region === 'ears' || group.region === 'whiskers') {
        ctx.setLineDash([5 / zoom, 4 / zoom]);
      }
      ctx.beginPath();
      ctx.moveTo(pts[0].x * W, pts[0].y * H);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * W, pts[i].y * H);
      }
      if (group.closed) {
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    }

    // 繪製 48 個關鍵點與 Stitch 風格編號膠囊標籤
    for (const pt of landmarks) {
      if (activeRegionFilter !== 'all' && pt.region !== activeRegionFilter) continue;
      const px = pt.x * W;
      const py = pt.y * H;
      const isSelected = selectedPointId === pt.id || draggingPointId === pt.id;
      const isCallout =
        !hideBuiltInChrome ||
        activeRegionFilter !== 'all' ||
        isSelected ||
        CONSUMER_CALLOUT_IDS.has(pt.id);
      const radius = (isSelected ? 7.5 : isCallout ? 5.2 : 3.2) / zoom;
      const color = getRegionColor(pt.region, themeMode);

      ctx.save();
      if (themeMode === 'darkroom' && (isCallout || isSelected)) {
        ctx.beginPath();
        ctx.arc(px, py, radius + 3.5 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.28;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = (isSelected ? 2.2 : 1.2) / zoom;
      ctx.strokeStyle = themeMode === 'darkroom' ? 'rgba(255, 255, 255, 0.85)' : lightBg;
      ctx.stroke();

      if (isCallout) {
        const fontSize = Math.max(10, Math.round((hideBuiltInChrome ? 13 : 11) / zoom));
        ctx.font = `700 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
        const numStr = pt.id < 10 ? `0${pt.id}` : `${pt.id}`;
        const textW = ctx.measureText(numStr).width;
        const padX = 5 / zoom;
        const padY = 2.5 / zoom;
        const boxW = textW + padX * 2;
        const boxH = fontSize + padY * 2;
        const offsetBelow = pt.id === 31 || pt.id === 37 || pt.id === 38;
        const bx = px - boxW / 2;
        const by = offsetBelow ? py + radius + 5 / zoom : py - radius - boxH - 5 / zoom;

        ctx.fillStyle = themeMode === 'darkroom' ? 'rgba(19, 24, 29, 0.86)' : 'rgba(255, 255, 255, 0.92)';
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 4 / zoom);
        ctx.fill();

        ctx.fillStyle = themeMode === 'darkroom' ? color : inkColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(numStr, px, by + boxH / 2 + 0.5 / zoom);
      }
      ctx.restore();
    }

    ctx.restore();

    // 若處於後台標註微調模式且有游標位置，繪製右上角局部放大鏡 (Loupe Magnifier)
    if (editable && enableLoupe && cursorNormPos) {
      const loupeRadius = 68;
      const loupeCenterX = W - loupeRadius - 18;
      const loupeCenterY = loupeRadius + 18;
      const srcX = cursorNormPos.x * W;
      const srcY = cursorNormPos.y * H;

      ctx.save();
      ctx.beginPath();
      ctx.arc(loupeCenterX, loupeCenterY, loupeRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = themeMode === 'darkroom' ? darkBg : lightBg;
      ctx.fillRect(
        loupeCenterX - loupeRadius,
        loupeCenterY - loupeRadius,
        loupeRadius * 2,
        loupeRadius * 2
      );

      if (loadedImageRef.current) {
        const cropHalf = 42;
        ctx.drawImage(
          loadedImageRef.current,
          Math.max(0, srcX - cropHalf),
          Math.max(0, srcY - cropHalf),
          cropHalf * 2,
          cropHalf * 2,
          loupeCenterX - loupeRadius,
          loupeCenterY - loupeRadius,
          loupeRadius * 2,
          loupeRadius * 2
        );
      }

      // 十字準星
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(loupeCenterX - 18, loupeCenterY);
      ctx.lineTo(loupeCenterX + 18, loupeCenterY);
      ctx.moveTo(loupeCenterX, loupeCenterY - 18);
      ctx.lineTo(loupeCenterX, loupeCenterY + 18);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(loupeCenterX, loupeCenterY, loupeRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = accentColor;
      ctx.stroke();
      ctx.restore();
    }
  }, [
    landmarks,
    baselineLandmarks,
    showBaselineOverlay,
    themeMode,
    zoom,
    pan,
    selectedPointId,
    draggingPointId,
    editable,
    enableLoupe,
    cursorNormPos,
    imageReadyVersion,
    getRegionColor,
    activeRegionFilter,
    hideBuiltInChrome,
  ]);

  const clientToNormalized = (clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0.5, y: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const rawX = (clientX - rect.left) * scaleX;
    const rawY = (clientY - rect.top) * scaleY;

    const worldX = (rawX - canvas.width / 2 - pan.x) / zoom + canvas.width / 2;
    const worldY = (rawY - canvas.height / 2 - pan.y) / zoom + canvas.height / 2;
    return {
      x: Math.max(0.01, Math.min(0.99, worldX / canvas.width)),
      y: Math.max(0.01, Math.min(0.99, worldY / canvas.height)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const norm = clientToNormalized(e.clientX, e.clientY);
    setCursorNormPos(norm);

    // 尋找距離點擊處最近的 48 點座標
    let nearest: FGSLandmarkPoint | null = null;
    let minDist = 0.032 / zoom;
    for (const pt of landmarks) {
      const dist = Math.hypot(pt.x - norm.x, pt.y - norm.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = pt;
      }
    }

    if (nearest) {
      onSelectPoint?.(nearest.id);
      if (editable) {
        setDraggingPointId(nearest.id);
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    if (zoom > 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    const norm = clientToNormalized(e.clientX, e.clientY);
    setCursorNormPos(norm);

    if (editable && draggingPointId !== null && onUpdateLandmarks) {
      const updated = landmarks.map((pt) =>
        pt.id === draggingPointId
          ? {
              ...pt,
              x: Number(norm.x.toFixed(4)),
              y: Number(norm.y.toFixed(4)),
            }
          : pt
      );
      onUpdateLandmarks(updated);
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handlePointerUp = (): void => {
    setDraggingPointId(null);
    setIsPanning(false);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>): void => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (pinchDistanceRef.current !== null) {
        const ratio = dist / pinchDistanceRef.current;
        setZoom((z) => Math.max(1, Math.min(3.5, Number((z * ratio).toFixed(2)))));
      }
      pinchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = (): void => {
    pinchDistanceRef.current = null;
  };

  return (
    <div className={themeMode === 'clinical-light' ? 'canvas-stage canvas-stage--light' : 'canvas-stage'}>
      {!hideBuiltInChrome && (
        <div className="canvas-toolbar">
          <div className="pet-pill-group">
            <button
              type="button"
              className={themeMode === 'darkroom' ? 'btn btn--primary' : 'btn'}
              onClick={() => onThemeModeChange?.('darkroom')}
            >
              深色暗房五色模式
            </button>
            <button
              type="button"
              className={themeMode === 'clinical-light' ? 'btn btn--primary' : 'btn'}
              onClick={() => onThemeModeChange?.('clinical-light')}
            >
              淺色臨床報告模式
            </button>
          </div>

          <div className="pet-pill-group">
            <button
              type="button"
              className="btn"
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
            >
              縮小
            </button>
            <span className="engine-badge">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="btn"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
            >
              放大
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              重置視角
            </button>
          </div>
        </div>
      )}

      {!hideBuiltInChrome && earAspectRatio !== undefined && (
        <div className="canvas-hud-overlay">
          <div className="canvas-hud-pill">
            <span className="canvas-hud-label">眼眶縱橫比 Ear Ratio</span>
            <strong className="mono-val">{earAspectRatio.toFixed(3)}</strong>
          </div>
          <div className="canvas-hud-zoom-group">
            <button
              type="button"
              className="canvas-hud-btn"
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
              aria-label="縮小畫布"
            >
              -
            </button>
            <span className="mono-val">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="canvas-hud-btn"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
              aria-label="放大畫布"
            >
              +
            </button>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={720}
        height={hideBuiltInChrome ? 864 : 720}
        aria-label="貓臉 48 點幾何關鍵點標註畫布"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setCursorNormPos(null);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {!hideBuiltInChrome && (
        <div className="legend-row">
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--ears" />
            01 至 10 雙耳與耳根 (10 點)
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--eyes" />
            11 至 26 雙眼輪廓 (16 點)
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--nose" />
            27 至 34 鼻樑與鼻頭 (8 點)
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--mouth" />
            35 至 38 口唇與下巴 (4 點)
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--whiskers" />
            39 至 48 兩側頰部與鬍鬚墊 (10 點)
          </span>
        </div>
      )}
    </div>
  );
};
