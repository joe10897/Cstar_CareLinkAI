/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  carelinkStore,
  PARTNER_CLINICS,
  type PetProfile,
} from '../services/carelinkStore';

export interface PetProfilePageProps {
  pets: PetProfile[];
  selectedPet: PetProfile;
  onSelectPet: (petId: string) => void;
  onTriggerTap: () => void;
  onTriggerConfirm: () => void;
  onNotify: (msg: string, detail?: string) => void;
}

export const PetProfilePage: React.FC<PetProfilePageProps> = ({
  pets,
  selectedPet,
  onSelectPet,
  onTriggerTap,
  onTriggerConfirm,
  onNotify,
}) => {
  const navigate = useNavigate();
  const [lineSyncEnabled, setLineSyncEnabled] = useState(true);
  const [fhirAutoExport, setFhirAutoExport] = useState(true);

  const latestBlood = carelinkStore
    .getBloodTestRecords(selectedPet.id)
    .slice(-1)[0];
  const latestFgs =
    carelinkStore.getFGSRecords().find((r) => r.pet_id === selectedPet.id) ||
    carelinkStore.getFGSRecords()[0];

  const handleGenerateCloudReferralPacket = (): void => {
    const clinic = PARTNER_CLINICS[0];
    const created = carelinkStore.createClinicReferral({
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      breed: selectedPet.breed,
      age_years: 8,
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      urgency_level: 'yellow',
      trigger_reason: `飼主於毛孩健康管理中心產出跨院 EHR 轉診快取包 (晶片 ${selectedPet.microchip_id || '900138001049281'})`,
      latest_fgs_record_id: latestFgs?.id || 'fgs-rec-101',
      fgs_total_score: latestFgs?.scores.total ?? 0,
      crea_value: latestBlood?.metrics.CREA.val ?? 2.3,
      sdma_value: latestBlood?.metrics.SDMA.val ?? 14,
    });
    onTriggerConfirm();
    onNotify(
      `已產出跨院轉診雲端快取包 (${created.share_token})`,
      `已推播至 ${clinic.name}`
    );
  };

  return (
    <>
      {/* 1. Multi-Pet Switcher Horizontal Row (Matches stitch_export/profile/code.html) */}
      <div>
        <div className="stitch-list-head" style={{ marginBottom: '6px' }}>
          <span className="stitch-list-title">家庭毛孩成員 ({pets.length})</span>
          <span className="stitch-list-count">點擊立即切換視角</span>
        </div>
        <div className="fgs-legend-scroll" role="group" aria-label="家庭毛孩切換">
          {pets.map((pet) => {
            const active = pet.id === selectedPet.id;
            return (
              <button
                key={pet.id}
                type="button"
                className={active ? 'btn btn--primary' : 'btn'}
                onClick={() => {
                  onTriggerTap();
                  onSelectPet(pet.id);
                }}
              >
                <span>{pet.short_name || pet.name}</span>
                <span className="mono-val">{pet.age_label || '高齡'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Pet Digital Profile Hero Card */}
      <section className="stitch-card" aria-labelledby="active-pet-card-heading">
        <div className="stitch-pet-row">
          <div className="stitch-pet-identity">
            <div className="stitch-avatar-wrap">
              <img
                src={selectedPet.baseline_image_url}
                alt={selectedPet.name}
                className="stitch-avatar-img"
                width={44}
                height={44}
              />
              <span className="stitch-online-badge" aria-hidden="true" />
            </div>
            <div className="stitch-pet-meta">
              <div className="stitch-pet-name-line">
                <h1 id="active-pet-card-heading" className="stitch-pet-name">
                  {selectedPet.name}
                </h1>
                <span className="status-chip status-chip--green">已絕育</span>
              </div>
              <p className="stitch-pet-sub mono-val">
                {selectedPet.breed} | #{selectedPet.microchip_id || '900138001049281'}
              </p>
            </div>
          </div>

          <strong className="mono-val" style={{ color: 'var(--color-brand-primary)' }}>
            4.2 kg
          </strong>
        </div>

        <div className="pet-pill-group">
          <span className="status-chip status-chip--yellow">
            {selectedPet.chronic_conditions[0] || 'IRIS II 慢性腎病'}
          </span>
          <span className="engine-badge">皮下輸液 100ml/日</span>
          <span className="engine-badge">低磷腎臟處方飲食用</span>
        </div>

        <div className="split-grid-2">
          <Link to="/app/trends" className="btn" onClick={onTriggerTap}>
            完整血檢數據庫
          </Link>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleGenerateCloudReferralPacket}
          >
            產出轉診快取包
          </button>
        </div>
      </section>

      {/* 3. 0-Baseline Calibration Card (Darkroom Preview) */}
      <section className="stitch-card" aria-labelledby="baseline-calib-heading">
        <div className="stitch-pet-row">
          <div>
            <h2 id="baseline-calib-heading" style={{ fontSize: '15px', fontWeight: 700 }}>
              0 分健康貓臉基準照
            </h2>
            <span className="brand-subtitle">Feline Grimace Scale Zero Baseline</span>
          </div>
          <span className="status-chip status-chip--green">校準合格</span>
        </div>

        <div className="stitch-toast-banner" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
            <img
              src={selectedPet.baseline_image_url}
              alt={`${selectedPet.name} 零分基準照`}
              style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <div className="mono-val" style={{ fontSize: '12px', fontWeight: 700 }}>
                Base-001 (EAR {selectedPet.baseline_metrics.leftEAR.toFixed(3)})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-on-dark-muted)' }}>
                雙耳前傾自然、眼眶放鬆、鬍鬚弧度平順
              </div>
            </div>
          </div>
          <span className="status-chip status-chip--green mono-val">0/10</span>
        </div>

        <div className="split-grid-2">
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/admin/fgs-dataset')}
          >
            檢視 48 點標註檔
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate('/app/fgs-scan')}
          >
            重拍基準貓臉
          </button>
        </div>
      </section>

      {/* 4. Clinic Access & Sync Matrix */}
      <section className="stitch-card" aria-labelledby="ehr-access-heading">
        <div className="stitch-pet-row">
          <h2 id="ehr-access-heading" style={{ fontSize: '15px', fontWeight: 700 }}>
            醫療院所與病歷同步
          </h2>
          <span className="status-chip status-chip--green">自動同步中</span>
        </div>

        <div className="stitch-subbox">
          <div className="stitch-pet-row">
            <strong>{PARTNER_CLINICS[0].name}</strong>
            <span className="engine-badge mono-val">#CK-7729-TW</span>
          </div>
          <span className="brand-subtitle">
            常駐專科 ‧ 電話 {PARTNER_CLINICS[0].phone}
          </span>
        </div>

        <label className="ledger-row">
          <span>LINE 官方帳號即時推播與打卡提醒</span>
          <input
            type="checkbox"
            checked={lineSyncEnabled}
            onChange={(e) => {
              onTriggerTap();
              setLineSyncEnabled(e.target.checked);
            }}
          />
        </label>

        <label className="ledger-row">
          <span>允許跨院自動匯出 HL7 FHIR 病歷摘要</span>
          <input
            type="checkbox"
            checked={fhirAutoExport}
            onChange={(e) => {
              onTriggerTap();
              setFhirAutoExport(e.target.checked);
            }}
          />
        </label>
      </section>
    </>
  );
};
