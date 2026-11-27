/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FGSAnnotationCanvas,
  type CanvasThemeMode,
} from '../components/FGSAnnotationCanvas';
import {
  carelinkStore,
  type BloodTestRecord,
  type ClinicReferral,
  type FGSRecord,
} from '../services/carelinkStore';
import { apiClient } from '../services/apiClient';
import { createPresetLandmarks } from '../utils/fgsGeometryCalculator';

export const ShareablePacketPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [themeMode, setThemeMode] = useState<CanvasThemeMode>('clinical-light');
  const [loading, setLoading] = useState(true);
  const [packet, setPacket] = useState<ClinicReferral | null>(null);
  const [linkedFgs, setLinkedFgs] = useState<FGSRecord | null>(null);
  const [displayBlood, setDisplayBlood] = useState<BloodTestRecord[]>([]);

  useEffect(() => {
    let active = true;
    const loadFromLocalFallback = () => {
      const referrals = carelinkStore.getClinicReferrals();
      const found = referrals.find((r) => r.share_token === shareToken) || referrals[0] || null;
      const fgsList = carelinkStore.getFGSRecords();
      const fgs =
        fgsList.find((r) => r.id === found?.latest_fgs_record_id) ||
        fgsList.find((r) => r.pet_id === found?.pet_id) ||
        fgsList[0] ||
        null;
      const bloods = carelinkStore.getBloodTestRecords(found?.pet_id);
      if (active) {
        setPacket(found);
        setLinkedFgs(fgs);
        setDisplayBlood(bloods);
      }
    };

    if (!shareToken) {
      loadFromLocalFallback();
      setLoading(false);
      return;
    }

    void apiClient
      .fetchPublicPacket(shareToken)
      .then((res) => {
        if (!active) return;
        setPacket(res.referral as unknown as ClinicReferral);
        setLinkedFgs((res.linkedFgs as unknown as FGSRecord) || null);
        setDisplayBlood((res.bloodRecords as unknown as BloodTestRecord[]) || []);
      })
      .catch(() => {
        loadFromLocalFallback();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shareToken]);

  if (loading) {
    return (
      <section className="surface-panel">
        <p className="brand-subtitle mono-val">正在從雲端讀取看診預審封包 {shareToken}...</p>
      </section>
    );
  }

  if (!packet) {
    return (
      <section className="surface-panel">
        <h2>找不到對應之預審授權封包</h2>
        <p className="lead">該時效性連結可能已過期或查無此通行碼。</p>
        <div className="section-header" style={{ marginTop: 'var(--space-md)' }}>
          <Link to="/app/home" className="btn btn--primary">
            返回 PetPulse AI 首頁
          </Link>
        </div>
      </section>
    );
  }

  const landmarks =
    linkedFgs?.verified_landmarks ||
    linkedFgs?.raw_onnx_landmarks ||
    createPresetLandmarks('baseline_0');

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>看診前 AI 預審臨床摘要封包</h1>
          <p className="lead">
            此為飼主授權分享之時效性就醫分流摘要（封包識別碼:{' '}
            <span className="mono-val">{packet.share_token}</span>），供接診獸醫師跨裝置即時檢視 48 點視覺指標與跨院血檢趨勢。
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
        </div>
      </div>

      <div className="workspace-grid">
        <section className="surface-panel">
          <div className="section-header">
            <div>
              <h2>病患 48 點臉部視覺量測圖譜</h2>
              <p className="brand-subtitle">
                病患: {packet.pet_name} ({packet.breed}) / 接收院所: {packet.clinic_name}
              </p>
            </div>
            <span className="engine-badge">FGS 總分 {packet.fgs_total_score} / 10</span>
          </div>

          <FGSAnnotationCanvas
            imageUrl={linkedFgs?.image_url || '/images/fgs-ragdoll-portrait.jpg'}
            landmarks={landmarks}
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
          />

          <div className="surface-tray" style={{ marginTop: 'var(--space-md)' }}>
            <h3>分流觸發原因與居家觀察</h3>
            <p style={{ marginTop: 'var(--space-2xs)' }}>{packet.trigger_reason}</p>
            {linkedFgs?.ai_observation_notes && (
              <p className="brand-subtitle" style={{ marginTop: 'var(--space-2xs)' }}>
                AI 視覺觀察: {linkedFgs.ai_observation_notes}
              </p>
            )}
          </div>
        </section>

        <section className="surface-panel">
          <div className="section-header">
            <div>
              <h2>無尺度幾何指標與跨院血檢紀錄</h2>
              <p className="brand-subtitle">
                授權有效期限至:{' '}
                <span className="mono-val">
                  {String(packet.expires_at).slice(0, 16).replace('T', ' ')}
                </span>
              </p>
            </div>
            <span className="status-chip status-chip--green">雲端唯讀授權</span>
          </div>

          {linkedFgs?.geometric_metrics && (
            <div className="ledger-list">
              <div className="ledger-row">
                <span>內眼角標準化基準 (D_base)</span>
                <strong className="mono-val">{linkedFgs.geometric_metrics.interOcularBaseDist}</strong>
              </div>
              <div className="ledger-row">
                <span>左眼 / 右眼縱橫比 (EAR)</span>
                <strong className="mono-val">
                  {(linkedFgs.geometric_metrics.leftEAR ?? 0).toFixed(2)} /{' '}
                  {(linkedFgs.geometric_metrics.rightEAR ?? 0).toFixed(2)}
                </strong>
              </div>
              <div className="ledger-row">
                <span>平均耳尖外展角 (θ_ear)</span>
                <strong className="mono-val">{linkedFgs.geometric_metrics.meanEarAngleDeg ?? 0}°</strong>
              </div>
              <div className="ledger-row">
                <span>鬍鬚墊寬高扁平比 (R_muzzle)</span>
                <strong className="mono-val">{(linkedFgs.geometric_metrics.muzzleRatio ?? 0).toFixed(2)}</strong>
              </div>
            </div>
          )}

          <div style={{ marginTop: 'var(--space-md)' }}>
            <h3>跨院血檢歷史數值 ({displayBlood.length})</h3>
            {displayBlood.length === 0 ? (
              <p className="brand-subtitle" style={{ marginTop: '6px' }}>尚無歷史血檢紀錄。</p>
            ) : (
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
                        <td>{b.clinic_name.slice(0, 6)}</td>
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
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
