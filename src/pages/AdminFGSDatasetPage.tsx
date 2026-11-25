/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import {
  FGSAnnotationCanvas,
  type CanvasThemeMode,
} from '../components/FGSAnnotationCanvas';
import {
  calculateFGSGeometryAndScores,
  type FGSLandmarkPoint,
} from '../utils/fgsGeometryCalculator';
import { carelinkStore, type FGSRecord } from '../services/carelinkStore';

function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const AdminFGSDatasetPage: React.FC = () => {
  const [records, setRecords] = useState<FGSRecord[]>(() =>
    carelinkStore.getFGSRecords()
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    () => carelinkStore.getFGSRecords()[0]?.id || 'fgs-rec-101'
  );
  const activeRecord =
    records.find((r) => r.id === selectedRecordId) || records[0];

  const [workingLandmarks, setWorkingLandmarks] = useState<FGSLandmarkPoint[]>(
    () =>
      activeRecord?.verified_landmarks ||
      activeRecord?.raw_onnx_landmarks ||
      []
  );
  const [selectedPointId, setSelectedPointId] = useState<number | null>(3);
  const [themeMode, setThemeMode] = useState<CanvasThemeMode>('darkroom');
  const [annotatorName, setAnnotatorName] = useState<string>(
    '林獸醫師 (PetPulse CV 標註組)'
  );
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleSelectRecord = (rec: FGSRecord): void => {
    setSelectedRecordId(rec.id);
    setWorkingLandmarks(rec.verified_landmarks || rec.raw_onnx_landmarks);
    setExportStatus(null);
  };

  const liveAnalysis = calculateFGSGeometryAndScores(workingLandmarks, null);
  const currentPoint =
    workingLandmarks.find((p) => p.id === selectedPointId) || workingLandmarks[0];

  const handleSaveVerification = (): void => {
    if (!activeRecord) return;
    const updated = carelinkStore.saveVerifiedFGSRecord(
      activeRecord.id,
      workingLandmarks,
      liveAnalysis.metrics,
      liveAnalysis.scores,
      liveAnalysis.observationNotes,
      annotatorName
    );
    setRecords(updated);
    setExportStatus(
      `已儲存單號 ${activeRecord.id} 之 48 點人工微調座標（標註狀態 is_verified = true）。`
    );
  };

  const handleExportCSV = (): void => {
    const csv = carelinkStore.exportVerifiedLandmarksCSV();
    triggerFileDownload(csv.filename, csv.content, 'text/csv;charset=utf-8;');
    setExportStatus(
      `已匯出標準 CSV 訓練集：${csv.filename}（共 ${csv.rowCount} 筆關鍵點座標列）。`
    );
  };

  const handleExportYoloPose = (): void => {
    const bundle = carelinkStore.exportYoloPoseBundle();
    triggerFileDownload(
      bundle.filename,
      bundle.content,
      'application/json;charset=utf-8;'
    );
    setExportStatus(
      `已匯出 YOLO-Pose 48 點訓練集：${bundle.filename}（共 ${bundle.recordCount} 張已驗證影像）。`
    );
  };

  const verifiedCount = records.filter((r) => r.is_verified).length;

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Human-in-the-Loop 48 點貓臉座標微調工作台</h1>
          <p className="lead">
            支援滑鼠與觸控筆於畫布直接拖曳編號 01 至 48 關鍵點，內建右上角局部放大鏡檢視長毛貓耳根與嘴角遮擋，拖曳時即時重算無尺度幾何指標。
          </p>
        </div>
        <div className="pet-pill-group">
          <button type="button" className="btn btn--primary" onClick={handleExportCSV}>
            匯出 CSV ({verifiedCount} 筆)
          </button>
          <button type="button" className="btn" onClick={handleExportYoloPose}>
            匯出 YOLO 訓練集
          </button>
        </div>
      </div>

      {exportStatus && (
        <div className="compliance-banner" role="status" style={{ marginBottom: 'var(--space-md)' }}>
          <span>{exportStatus}</span>
        </div>
      )}

      {/* 樣本切換列 */}
      <div className="pet-pill-group" style={{ marginBottom: 'var(--space-md)' }}>
        {records.map((rec) => (
          <button
            key={rec.id}
            type="button"
            className={rec.id === activeRecord?.id ? 'btn btn--primary' : 'btn'}
            onClick={() => handleSelectRecord(rec)}
          >
            {rec.id} ({rec.is_verified ? '已驗證' : '待覆核'})
          </button>
        ))}
      </div>

      <div className="workspace-grid">
        {/* 左側：可拖曳 48 點畫布 + 放大鏡檢視 (Loupe Magnifier) */}
        <section className="surface-panel">
          <div className="section-header">
            <div>
              <h2>48 點互動式標註畫布（含局部放大鏡）</h2>
              <p className="brand-subtitle">
                直接拖曳任一編號點即可即時更新右側幾何量測；右上角圓形放大鏡輔助對齊長毛遮擋邊緣
              </p>
            </div>
            <span
              className={
                activeRecord?.is_verified
                  ? 'status-chip status-chip--green'
                  : 'status-chip status-chip--yellow'
              }
            >
              {activeRecord?.is_verified ? 'is_verified = true' : '待人工微調'}
            </span>
          </div>

          {activeRecord && (
            <FGSAnnotationCanvas
              imageUrl={activeRecord.image_url}
              landmarks={workingLandmarks}
              themeMode={themeMode}
              onThemeModeChange={setThemeMode}
              editable={true}
              enableLoupe={true}
              selectedPointId={selectedPointId}
              onSelectPoint={setSelectedPointId}
              onUpdateLandmarks={setWorkingLandmarks}
            />
          )}

          {currentPoint && (
            <div className="split-grid-2" style={{ marginTop: 'var(--space-md)' }}>
              <div className="surface-tray">
                <h3>
                  選取點位: #{currentPoint.id} {currentPoint.label} ({currentPoint.region})
                </h3>
                <p className="mono-val" style={{ marginTop: 'var(--space-xs)' }}>
                  x_norm: {currentPoint.x.toFixed(4)} / y_norm: {currentPoint.y.toFixed(4)} / conf:{' '}
                  {currentPoint.conf.toFixed(3)}
                </p>
              </div>

              <div className="surface-tray">
                <label>
                  <strong>關鍵點可見度標記 (YOLO Visibility)</strong>
                  <select
                    className="select-field"
                    style={{ marginTop: 'var(--space-xs)' }}
                    value={currentPoint.visibility ?? 2}
                    onChange={(e) => {
                      const vis = Number(e.target.value) as 0 | 1 | 2;
                      setWorkingLandmarks((prev) =>
                        prev.map((pt) =>
                          pt.id === currentPoint.id ? { ...pt, visibility: vis } : pt
                        )
                      );
                    }}
                  >
                    <option value={2}>2: 清晰可見 (Visible)</option>
                    <option value={1}>1: 長毛或姿態遮擋 (Occluded)</option>
                    <option value={0}>0: 超出畫面未標註 (Unlabeled)</option>
                  </select>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* 右側：即時幾何重算面板與訓練集簽核 */}
        <section className="surface-panel">
          <div className="section-header">
            <div>
              <h2>即時無尺度幾何重算面板</h2>
              <p className="brand-subtitle">
                無尺度內眼角基準距離 D_base ={' '}
                <span className="mono-val">{liveAnalysis.metrics.interOcularBaseDist}</span>
              </p>
            </div>
            <span className="status-chip status-chip--red">
              即時總分 {liveAnalysis.scores.total} / 10
            </span>
          </div>

          <div className="ledger-list">
            <div className="ledger-row">
              <span>左眼縱橫比 (Left EAR)</span>
              <strong className="mono-val">{liveAnalysis.metrics.leftEAR.toFixed(4)}</strong>
            </div>
            <div className="ledger-row">
              <span>右眼縱橫比 (Right EAR)</span>
              <strong className="mono-val">{liveAnalysis.metrics.rightEAR.toFixed(4)}</strong>
            </div>
            <div className="ledger-row">
              <span>雙眼不對稱比 |L-R|/max</span>
              <strong className="mono-val">
                {(liveAnalysis.metrics.earSymmetryRatio * 100).toFixed(1)}%
              </strong>
            </div>
            <div className="ledger-row">
              <span>左耳 / 右耳外展角 (θ_ear)</span>
              <strong className="mono-val">
                {liveAnalysis.metrics.leftEarAngleDeg}° / {liveAnalysis.metrics.rightEarAngleDeg}°
              </strong>
            </div>
            <div className="ledger-row">
              <span>雙耳尖展開比 (Span / D_base)</span>
              <strong className="mono-val">{liveAnalysis.metrics.earSpanRatio.toFixed(3)}</strong>
            </div>
            <div className="ledger-row">
              <span>口鼻鬍鬚墊寬高扁平比 (R_muzzle)</span>
              <strong className="mono-val">{liveAnalysis.metrics.muzzleRatio.toFixed(3)}</strong>
            </div>
            <div className="ledger-row">
              <span>鬍鬚墊橢圓率 (Ellipticity)</span>
              <strong className="mono-val">{liveAnalysis.metrics.muzzleEllipticity.toFixed(3)}</strong>
            </div>
            <div className="ledger-row">
              <span>鬍鬚前傾聚合角</span>
              <strong className="mono-val">{liveAnalysis.metrics.whiskerForwardAngleDeg}°</strong>
            </div>
            <div className="ledger-row">
              <span>雙眼水平傾角 (Head Roll)</span>
              <strong className="mono-val">{liveAnalysis.metrics.headRollAngleDeg}°</strong>
            </div>
          </div>

          <div className="surface-tray" style={{ marginTop: 'var(--space-md)' }}>
            <h3>即時自動生成臨床觀察備註</h3>
            <p style={{ marginTop: 'var(--space-xs)' }}>{liveAnalysis.observationNotes}</p>
          </div>

          <div style={{ marginTop: 'var(--space-md)' }}>
            <label>
              <strong>標註審核人員簽章</strong>
              <input
                type="text"
                className="input-field"
                style={{ marginTop: 'var(--space-xs)' }}
                value={annotatorName}
                onChange={(e) => setAnnotatorName(e.target.value)}
              />
            </label>
          </div>

          <div className="section-header" style={{ marginTop: 'var(--space-md)' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSaveVerification}
            >
              儲存微調座標並標記已驗證
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
