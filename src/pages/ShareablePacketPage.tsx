/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FGSAnnotationCanvas,
  type CanvasThemeMode,
} from '../components/FGSAnnotationCanvas';
import { carelinkStore } from '../services/carelinkStore';

export const ShareablePacketPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [themeMode, setThemeMode] = useState<CanvasThemeMode>('clinical-light');

  const referrals = carelinkStore.getClinicReferrals();
  const packet =
    referrals.find((r) => r.share_token === shareToken) || referrals[0];

  const fgsRecords = carelinkStore.getFGSRecords();
  const linkedFgs =
    fgsRecords.find((r) => r.id === packet?.latest_fgs_record_id) ||
    fgsRecords.find((r) => r.pet_id === packet?.pet_id) ||
    fgsRecords[0];

  const bloodRecords = carelinkStore.getBloodTestRecords(packet?.pet_id);
  const displayBlood =
    bloodRecords.length > 0
      ? bloodRecords
      : carelinkStore.getBloodTestRecords();

  if (!packet || !linkedFgs) {
    return (
      <section className="surface-panel">
        <h2>找不到對應之預審授權封包</h2>
        <p className="lead">該時效性連結可能已過期或尚無資料。</p>
        <div className="section-header" style={{ marginTop: 'var(--space-md)' }}>
          <Link to="/app/clinics" className="btn btn--primary">
            返回合作醫院轉診頁
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>看診前 AI 預審臨床摘要封包</h1>
          <p className="lead">
            此為飼主授權分享之時效性就醫分流摘要（封包識別碼:{' '}
            <span className="mono-val">{packet.share_token}</span>），供接診獸醫師於病患到院前快速掌握貓臉 48 點幾何變化與跨院血檢趨勢。
          </p>
        </div>
        <div className="pet-pill-group">
          <span
            className={
              packet.urgency_level === 'red'
                ? 'status-chip status-chip--red'
                : packet.urgency_level === 'yellow'
                  ? 'status-chip status-chip--yellow'
                  : 'status-chip status-chip--green'
            }
          >
            {packet.urgency_level === 'red'
              ? '紅燈急診預警'
              : packet.urgency_level === 'yellow'
                ? '黃燈門診預審'
                : '綠燈例行追蹤'}
          </span>
          <Link to="/admin/clinic-crm" className="btn">
            於醫院 CRM 開啟
          </Link>
        </div>
      </div>

      <div className="workspace-grid">
        <section className="surface-panel">
          <div className="section-header">
            <div>
              <h2>病患 48 點貓臉幾何量測圖譜</h2>
              <p className="brand-subtitle">
                病患: {packet.pet_name} ({packet.breed}) / 接收院所: {packet.clinic_name}
              </p>
            </div>
            <span className="engine-badge">
              FGS 總分 {packet.fgs_total_score} / 10
            </span>
          </div>

          <FGSAnnotationCanvas
            imageUrl={linkedFgs.image_url}
            landmarks={linkedFgs.verified_landmarks || linkedFgs.raw_onnx_landmarks}
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
          />

          <div className="surface-tray" style={{ marginTop: 'var(--space-md)' }}>
            <h3>分流觸發原因與居家觀察</h3>
            <p style={{ marginTop: 'var(--space-2xs)' }}>{packet.trigger_reason}</p>
            <p className="brand-subtitle" style={{ marginTop: 'var(--space-2xs)' }}>
              AI 幾何觀察: {linkedFgs.ai_observation_notes}
            </p>
          </div>
        </section>

        <section className="surface-panel">
          <div className="section-header">
            <div>
              <h2>無尺度幾何指標與跨院血檢紀錄</h2>
              <p className="brand-subtitle">
                授權有效期限至:{' '}
                <span className="mono-val">
                  {packet.expires_at.slice(0, 16).replace('T', ' ')}
                </span>
              </p>
            </div>
            <span className="status-chip status-chip--green">飼主已授權檢視</span>
          </div>

          <div className="ledger-list">
            <div className="ledger-row">
              <span>內眼角標準化基準 (D_base)</span>
              <strong className="mono-val">
                {linkedFgs.geometric_metrics.interOcularBaseDist}
              </strong>
            </div>
            <div className="ledger-row">
              <span>左眼 / 右眼縱橫比 (EAR)</span>
              <strong className="mono-val">
                {linkedFgs.geometric_metrics.leftEAR.toFixed(2)} /{' '}
                {linkedFgs.geometric_metrics.rightEAR.toFixed(2)}
              </strong>
            </div>
            <div className="ledger-row">
              <span>平均耳尖外展角 (θ_ear)</span>
              <strong className="mono-val">
                {linkedFgs.geometric_metrics.meanEarAngleDeg}°
              </strong>
            </div>
            <div className="ledger-row">
              <span>鬍鬚墊寬高扁平比 (R_muzzle)</span>
              <strong className="mono-val">
                {linkedFgs.geometric_metrics.muzzleRatio.toFixed(2)}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-md)' }}>
            <h3>跨院紙本血檢歷史數值</h3>
            <div className="data-table-wrap" style={{ marginTop: 'var(--space-xs)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>醫院</th>
                    <th>CREA / SDMA</th>
                    <th>BUN / PHOS</th>
                  </tr>
                </thead>
                <tbody>
                  {displayBlood.map((b) => (
                    <tr key={b.id}>
                      <td className="num">{b.test_date.slice(5)}</td>
                      <td>{b.clinic_name.slice(0, 4)}</td>
                      <td className="num">
                        {b.metrics.CREA.val.toFixed(1)} / {b.metrics.SDMA.val} ({b.iris_stage})
                      </td>
                      <td className="num">
                        {b.metrics.BUN.val} / {b.metrics.PHOS.val.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-header" style={{ marginTop: 'var(--space-md)' }}>
            <Link to="/app/clinics" className="btn">
              返回飼主轉診頁
            </Link>
            <Link to="/admin/clinic-crm" className="btn btn--primary">
              切換至獸醫預審看板處理
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
