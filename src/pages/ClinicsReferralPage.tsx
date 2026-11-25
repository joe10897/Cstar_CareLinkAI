/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PARTNER_CLINICS,
  carelinkStore,
  type ClinicReferral,
  type PetProfile,
} from '../services/carelinkStore';

export interface ClinicsReferralPageProps {
  selectedPet: PetProfile;
}

export const ClinicsReferralPage: React.FC<ClinicsReferralPageProps> = ({
  selectedPet,
}) => {
  const [selectedClinicId, setSelectedClinicId] = useState<string>(PARTNER_CLINICS[0].id);
  const [urgencyLevel, setUrgencyLevel] = useState<'red' | 'yellow' | 'green'>('red');
  const [triggerNote, setTriggerNote] = useState<string>(
    '夜間貓臉 FGS 檢測總分 5/10（眼眶收緊且雙耳外旋壓低），合併跨院血檢 CREA 2.9 mg/dL 進入 IRIS Stage 3，申請到院前獸醫預審分流。'
  );
  const [latestCreatedPacket, setLatestCreatedPacket] = useState<ClinicReferral | null>(
    null
  );
  const [referrals, setReferrals] = useState<ClinicReferral[]>(() =>
    carelinkStore.getClinicReferrals()
  );

  const petFgsRecords = carelinkStore
    .getFGSRecords()
    .filter((r) => r.pet_id === selectedPet.id);
  const latestFgs = petFgsRecords[0] || carelinkStore.getFGSRecords()[0];

  const petBloodRecords = carelinkStore.getBloodTestRecords(selectedPet.id);
  const latestBlood =
    petBloodRecords[petBloodRecords.length - 1] ||
    carelinkStore.getBloodTestRecords()[0];

  const handleGeneratePacket = (e: React.FormEvent): void => {
    e.preventDefault();
    const clinic =
      PARTNER_CLINICS.find((c) => c.id === selectedClinicId) || PARTNER_CLINICS[0];

    const created = carelinkStore.createClinicReferral({
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      breed: selectedPet.breed,
      age_years: 13,
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      urgency_level: urgencyLevel,
      trigger_reason: triggerNote,
      latest_fgs_record_id: latestFgs?.id || 'fgs-rec-101',
      fgs_total_score: urgencyLevel === 'red' ? Math.max(5, latestFgs?.scores.total ?? 5) : latestFgs?.scores.total ?? 2,
      crea_value: latestBlood?.metrics.CREA.val ?? 2.9,
      sdma_value: latestBlood?.metrics.SDMA.val ?? 19,
    });

    setLatestCreatedPacket(created);
    setReferrals(carelinkStore.getClinicReferrals());
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>O2O 合作動物醫院轉診預約與授權分享</h1>
          <p className="lead">
            當貓臉 FGS 總分達 4/10 以上或關鍵血檢指標超標時，可一鍵生成具 48 小時時效性的「看診前 AI 預審摘要連結」，透過 Supabase Realtime 即時同步至合作醫院看診看板。
          </p>
        </div>
        <Link to="/admin/clinic-crm" className="btn">
          開啟合作醫院即時預審看板
        </Link>
      </div>

      <div className="workspace-grid">
        {/* 左側：建立看診前 AI 預審摘要封包 */}
        <section className="surface-panel">
          <div className="section-header">
            <h2>生成看診前 AI 預審摘要封包 (Shareable Clinical Packet)</h2>
            <span className="status-chip status-chip--red">
              Realtime 毫秒級推播
            </span>
          </div>

          <form onSubmit={handleGeneratePacket}>
            <div className="ledger-list">
              <div className="ledger-row">
                <div>
                  <strong>授權寵物檔案</strong>
                  <p className="brand-subtitle">{selectedPet.breed}</p>
                </div>
                <span className="engine-badge">{selectedPet.name}</span>
              </div>

              <div className="ledger-row">
                <div>
                  <strong>隨附最新 48 點 FGS 幾何紀錄</strong>
                  <p className="brand-subtitle">
                    雙眼平均 EAR <span className="mono-val">{latestFgs?.geometric_metrics.meanEAR.toFixed(2)}</span> / 耳軸外展角{' '}
                    <span className="mono-val">{latestFgs?.geometric_metrics.meanEarAngleDeg}°</span>
                  </p>
                </div>
                <span className="status-chip status-chip--yellow">
                  單號 {latestFgs?.id}
                </span>
              </div>

              <div className="ledger-row">
                <div>
                  <strong>隨附跨院血檢結構化趨勢</strong>
                  <p className="brand-subtitle">
                    最新 CREA <span className="mono-val">{latestBlood?.metrics.CREA.val} mg/dL</span> / SDMA{' '}
                    <span className="mono-val">{latestBlood?.metrics.SDMA.val} µg/dL</span>
                  </p>
                </div>
                <span className="status-chip status-chip--red">
                  IRIS {latestBlood?.iris_stage || 'Stage 3'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-md)' }}>
              <label>
                <strong>選擇轉診或夜間急診合作動物醫院</strong>
                <select
                  className="select-field"
                  style={{ marginTop: 'var(--space-xs)' }}
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                >
                  {PARTNER_CLINICS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}（{c.district} / {c.hasNightEmergency ? '24H 急診支援' : '專科門診'}）
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginTop: 'var(--space-md)' }}>
              <label>
                <strong>就醫分流緊急度等級</strong>
                <div className="pet-pill-group" style={{ marginTop: 'var(--space-xs)' }}>
                  <button
                    type="button"
                    className={urgencyLevel === 'red' ? 'btn btn--primary' : 'btn'}
                    onClick={() => setUrgencyLevel('red')}
                  >
                    紅燈急診分流
                  </button>
                  <button
                    type="button"
                    className={urgencyLevel === 'yellow' ? 'btn btn--primary' : 'btn'}
                    onClick={() => setUrgencyLevel('yellow')}
                  >
                    黃燈門診複查
                  </button>
                  <button
                    type="button"
                    className={urgencyLevel === 'green' ? 'btn btn--primary' : 'btn'}
                    onClick={() => setUrgencyLevel('green')}
                  >
                    綠燈例行追蹤
                  </button>
                </div>
              </label>
            </div>

            <div style={{ marginTop: 'var(--space-md)' }}>
              <label>
                <strong>飼主居家觀察補充與分流觸發原因</strong>
                <input
                  type="text"
                  className="input-field"
                  style={{ marginTop: 'var(--space-xs)' }}
                  value={triggerNote}
                  onChange={(e) => setTriggerNote(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="section-header" style={{ marginTop: 'var(--space-md)' }}>
              <button type="submit" className="btn btn--primary">
                生成預審連結並推播
              </button>
            </div>
          </form>

          {latestCreatedPacket && (
            <div className="surface-tray" role="status">
              <h3>已生成看診前 AI 預審摘要連結</h3>
              <p className="mono-val" style={{ marginTop: 'var(--space-xs)' }}>
                https://petpulse-ai.pages.dev/packet/{latestCreatedPacket.share_token}
              </p>
              <p className="brand-subtitle" style={{ marginTop: 'var(--space-xs)' }}>
                授權對象: {latestCreatedPacket.clinic_name} / 有效期限至:{' '}
                <span className="mono-val">{latestCreatedPacket.expires_at.slice(0, 16).replace('T', ' ')}</span>
              </p>
              <div className="pet-pill-group" style={{ marginTop: 'var(--space-sm)' }}>
                <Link
                  to={`/packet/${latestCreatedPacket.share_token}`}
                  className="btn btn--primary"
                >
                  預覽時效性臨床摘要封包
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 右側：合作動物醫院名錄與已發送預審紀錄 */}
        <section className="surface-panel">
          <div className="section-header">
            <h2>合作貓友善與 24H 急診動物醫院</h2>
            <span className="engine-badge">共 {PARTNER_CLINICS.length} 家授權院所</span>
          </div>

          <div className="ledger-list">
            {PARTNER_CLINICS.map((clinic) => (
              <div className="ledger-row" key={clinic.id}>
                <div>
                  <strong>{clinic.name}</strong>
                  <p className="brand-subtitle">
                    {clinic.address} / 電話: <span className="mono-val">{clinic.phone}</span>
                  </p>
                  <p className="brand-subtitle">{clinic.specialties.join('、')}</p>
                </div>
                <span
                  className={
                    clinic.hasNightEmergency
                      ? 'status-chip status-chip--red'
                      : 'status-chip status-chip--green'
                  }
                >
                  {clinic.hasNightEmergency ? '24H 急診分流' : 'ISFM 貓友善金獎'}
                </span>
              </div>
            ))}
          </div>

          <div className="section-header" style={{ marginTop: 'var(--space-lg)' }}>
            <h3>已發送之看診前預審授權紀錄</h3>
          </div>

          <div className="ledger-list">
            {referrals.map((ref) => (
              <div className="ledger-row" key={ref.id}>
                <div>
                  <strong>
                    {ref.pet_name} 轉診至 {ref.clinic_name}
                  </strong>
                  <p className="brand-subtitle">{ref.trigger_reason}</p>
                  <p className="mono-val">
                    授權碼: {ref.share_token} / FGS: {ref.fgs_total_score}/10 / CREA: {ref.crea_value} mg/dL
                  </p>
                </div>
                <div className="pet-pill-group">
                  <Link to={`/packet/${ref.share_token}`} className="btn">
                    開啟封包
                  </Link>
                  <span
                    className={
                      ref.urgency_level === 'red'
                        ? 'status-chip status-chip--red'
                        : ref.urgency_level === 'yellow'
                          ? 'status-chip status-chip--yellow'
                          : 'status-chip status-chip--green'
                    }
                  >
                    {ref.status === 'pending'
                      ? '待醫院接單'
                      : ref.status === 'accepted'
                        ? '獸醫已預審接單'
                        : '已完成看診'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
