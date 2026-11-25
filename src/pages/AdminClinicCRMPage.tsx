/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useEffect, useState } from 'react';
import {
  FGSAnnotationCanvas,
  type CanvasThemeMode,
} from '../components/FGSAnnotationCanvas';
import {
  carelinkStore,
  type ClinicReferral,
} from '../services/carelinkStore';

export const AdminClinicCRMPage: React.FC = () => {
  const [referrals, setReferrals] = useState<ClinicReferral[]>(() =>
    carelinkStore.getClinicReferrals()
  );
  const [selectedReferralId, setSelectedReferralId] = useState<string>(
    () => carelinkStore.getClinicReferrals()[0]?.id || 'ref-301'
  );
  const [themeMode, setThemeMode] = useState<CanvasThemeMode>('darkroom');
  const [realtimePulse, setRealtimePulse] = useState<string>(
    'Supabase Realtime 頻道 (clinic-referrals) 連線監聽中'
  );

  useEffect(() => {
    const unsubscribe = carelinkStore.subscribeReferrals((updated) => {
      setReferrals(updated);
      if (updated[0]) {
        setSelectedReferralId(updated[0].id);
      }
      setRealtimePulse(
        `收到即時轉診推播更新（${new Date().toLocaleTimeString('zh-Hant', { hour12: false })}），紅燈病患已自動置頂`
      );
    });
    return unsubscribe;
  }, []);

  const activeReferral =
    referrals.find((r) => r.id === selectedReferralId) || referrals[0];

  const allFgsRecords = carelinkStore.getFGSRecords();
  const linkedFgs =
    allFgsRecords.find((r) => r.id === activeReferral?.latest_fgs_record_id) ||
    allFgsRecords.find((r) => r.pet_id === activeReferral?.pet_id) ||
    allFgsRecords[0];

  const linkedBloodRecords = carelinkStore.getBloodTestRecords(
    activeReferral?.pet_id
  );
  const displayBloodRecords =
    linkedBloodRecords.length > 0
      ? linkedBloodRecords
      : carelinkStore.getBloodTestRecords();

  const handleStatusChange = (
    referralId: string,
    status: 'pending' | 'accepted' | 'completed'
  ): void => {
    const updated = carelinkStore.updateReferralStatus(referralId, status);
    setReferrals(updated);
  };

  const handleSimulateEmergencyPush = (): void => {
    const created = carelinkStore.createClinicReferral({
      pet_id: 'pet-mochi-002',
      pet_name: 'Mochi（麻糬）',
      breed: '金吉拉長毛貓（14 歲）',
      age_years: 14,
      clinic_id: 'clinic-taipei-01',
      clinic_name: '安禾高齡貓專科動物醫院',
      urgency_level: 'red',
      trigger_reason:
        '飼主半夜急診預審推播：貓臉 FGS 檢測總分 7/10（眼眶收緊 2/2、雙耳外旋 2/2、口鼻緊繃 2/2），呼吸頻率加快',
      latest_fgs_record_id: 'fgs-rec-102',
      fgs_total_score: 7,
      crea_value: 3.1,
      sdma_value: 20,
    });
    setSelectedReferralId(created.id);
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>B2B 合作動物醫院看診前預審看板 (Clinic CRM)</h1>
          <p className="lead">
            透過 Supabase Realtime 訂閱即時轉診通知，紅燈病患（FGS &ge; 4 分）零延遲置頂顯示，獸醫師可於病患到院前同步調閱跨院血檢折線與貓臉 48 點分析紀錄。
          </p>
        </div>
        <div className="pet-pill-group">
          <span className="engine-badge">{realtimePulse}</span>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSimulateEmergencyPush}
          >
            模擬紅燈急診推播
          </button>
        </div>
      </div>

      <div className="workspace-grid">
        {/* 左側：到院前預審分流隊列（紅燈自動置頂） */}
        <section className="surface-panel">
          <div className="section-header">
            <h2>即時到院前預審分流隊列</h2>
            <span className="status-chip status-chip--red">
              紅燈病患自動置頂 ({referrals.filter((r) => r.urgency_level === 'red').length} 件)
            </span>
          </div>

          <div className="ledger-list">
            {referrals.map((ref) => {
              const isSelected = ref.id === activeReferral?.id;
              return (
                <div
                  key={ref.id}
                  className="ledger-row"
                  style={{
                    background: isSelected ? 'var(--color-paper-2)' : 'transparent',
                    paddingInline: 'var(--space-sm)',
                    borderRadius: 'var(--radius-input)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div className="pet-pill-group">
                      <span
                        className={
                          ref.urgency_level === 'red'
                            ? 'status-chip status-chip--red'
                            : ref.urgency_level === 'yellow'
                              ? 'status-chip status-chip--yellow'
                              : 'status-chip status-chip--green'
                        }
                      >
                        {ref.urgency_level === 'red'
                          ? '紅燈急診預警'
                          : ref.urgency_level === 'yellow'
                            ? '黃燈門診預審'
                            : '綠燈常規'}
                      </span>
                      <strong>{ref.pet_name}</strong>
                      <span className="brand-subtitle">{ref.breed}</span>
                    </div>

                    <p style={{ marginTop: 'var(--space-2xs)' }}>{ref.trigger_reason}</p>
                    <p className="mono-val" style={{ marginTop: 'var(--space-2xs)' }}>
                      FGS 總分: {ref.fgs_total_score}/10 / CREA: {ref.crea_value} mg/dL / SDMA:{' '}
                      {ref.sdma_value} µg/dL / 封包碼: {ref.share_token}
                    </p>
                  </div>

                  <div className="pet-pill-group">
                    <button
                      type="button"
                      className={isSelected ? 'btn btn--primary' : 'btn'}
                      onClick={() => setSelectedReferralId(ref.id)}
                    >
                      調閱病歷與 48 點圖譜
                    </button>
                    {ref.status === 'pending' && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleStatusChange(ref.id, 'accepted')}
                      >
                        確認接單預審
                      </button>
                    )}
                    {ref.status === 'accepted' && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleStatusChange(ref.id, 'completed')}
                      >
                        標記完診
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 右側：選中病患之 48 點貓臉分析與跨院血檢對照 */}
        <section className="surface-panel">
          {activeReferral && linkedFgs && (
            <>
              <div className="section-header">
                <div>
                  <h2>
                    病患預審詳情：{activeReferral.pet_name}
                  </h2>
                  <p className="brand-subtitle">
                    轉診接收院所：{activeReferral.clinic_name} / 狀態：
                    {activeReferral.status === 'pending'
                      ? '待預審接單'
                      : activeReferral.status === 'accepted'
                        ? '獸醫師已接單準備診間'
                        : '已完成看診'}
                  </p>
                </div>
                <span className="status-chip status-chip--red">
                  FGS {activeReferral.fgs_total_score} / 10 分
                </span>
              </div>

              <FGSAnnotationCanvas
                imageUrl={linkedFgs.image_url}
                landmarks={linkedFgs.verified_landmarks || linkedFgs.raw_onnx_landmarks}
                themeMode={themeMode}
                onThemeModeChange={setThemeMode}
              />

              <div className="surface-tray" style={{ marginTop: 'var(--space-md)' }}>
                <h3>到院前 AI 貓臉幾何摘要</h3>
                <p style={{ marginTop: 'var(--space-2xs)' }}>
                  {linkedFgs.ai_observation_notes}
                </p>
                <p className="mono-val" style={{ marginTop: 'var(--space-2xs)' }}>
                  左眼 EAR {linkedFgs.geometric_metrics.leftEAR.toFixed(2)} / 右眼 EAR{' '}
                  {linkedFgs.geometric_metrics.rightEAR.toFixed(2)} / 耳軸外展角{' '}
                  {linkedFgs.geometric_metrics.meanEarAngleDeg}° / 口鼻扁平比 R={' '}
                  {linkedFgs.geometric_metrics.muzzleRatio.toFixed(2)}
                </p>
              </div>

              <div style={{ marginTop: 'var(--space-md)' }}>
                <h3>跨院紙本血檢歷史對照表</h3>
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
                      {displayBloodRecords.map((b) => (
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
            </>
          )}
        </section>
      </div>
    </div>
  );
};
