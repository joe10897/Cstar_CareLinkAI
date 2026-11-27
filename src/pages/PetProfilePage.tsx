/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  carelinkStore,
  PARTNER_CLINICS,
  type PetProfile,
} from '../services/carelinkStore';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

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
  const { user, isAdmin, hasSubmittedSurvey, logout, refreshWorkspace } = useAuth();
  const [lineSyncEnabled, setLineSyncEnabled] = useState(true);
  const [fhirAutoExport, setFhirAutoExport] = useState(true);
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetSpecies, setNewPetSpecies] = useState<'cat' | 'dog'>('cat');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [newPetAge, setNewPetAge] = useState('5y');
  const [newPetWeight, setNewPetWeight] = useState('4.5');
  const [newPetCoat, setNewPetCoat] = useState<'short' | 'long'>('short');
  const [newPetCondition, setNewPetCondition] = useState('');
  const [isCreatingPet, setIsCreatingPet] = useState(false);

  const latestBlood = carelinkStore
    .getBloodTestRecords(selectedPet.id)
    .slice(-1)[0];
  const latestFgs =
    carelinkStore.getFGSRecords().find((r) => r.pet_id === selectedPet.id) ||
    carelinkStore.getFGSRecords()[0];

  const handleCreatePet = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newPetName.trim()) return;
    setIsCreatingPet(true);
    onTriggerTap();
    try {
      const created = await apiClient.createPet({
        name: newPetName.trim(),
        species: newPetSpecies,
        breed: newPetBreed.trim() || (newPetSpecies === 'dog' ? '米克斯犬' : '米克斯貓'),
        age_label: newPetAge.trim() || '5y',
        weight_kg: Number(newPetWeight) || 4.5,
        coat_length: newPetCoat,
        chronic_conditions: newPetCondition.trim()
          ? newPetCondition.split(/[、,，]/).map((s) => s.trim()).filter(Boolean)
          : ['居家健康定期追蹤'],
      });
      await refreshWorkspace();
      onSelectPet(created.id);
      setNewPetName('');
      setNewPetBreed('');
      setNewPetCondition('');
      setShowAddPet(false);
      onTriggerConfirm();
      onNotify(`已新增毛孩檔案「${newPetName.trim()}」`, '已同步儲存於 Cloudflare D1 資料庫');
    } catch (err) {
      onNotify('新增毛孩失敗', err instanceof Error ? err.message : undefined);
    } finally {
      setIsCreatingPet(false);
    }
  };

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
      trigger_reason: `飼主於毛孩管理中心產出跨院轉診摘要包 (晶片 ${selectedPet.microchip_id || '未填'})`,
      latest_fgs_record_id: latestFgs?.id || '',
      fgs_total_score: latestFgs?.scores.total ?? 0,
      crea_value: latestBlood?.metrics.CREA.val ?? 2.0,
      sdma_value: latestBlood?.metrics.SDMA.val ?? 14,
    });
    onTriggerConfirm();
    onNotify(
      `已產出跨院轉診雲端快取包 (${created.share_token})`,
      `已同步至 ${clinic.name}`
    );
  };

  const handleLogout = async (): Promise<void> => {
    onTriggerTap();
    await logout();
    onNotify('已安全登出 PetPulse AI 帳號');
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* 0. Authenticated User & Beta Study Account Card */}
      <section className="stitch-card" aria-label="目前登入帳號與封測回饋">
        <div className="stitch-pet-row">
          <div>
            <strong style={{ fontSize: '15px' }}>{user?.display_name || '測試飼主'}</strong>
            <p className="brand-subtitle mono-val">
              {user?.email || '未登入'}
              {user?.invite_code_used ? ` · 邀請碼 ${user.invite_code_used}` : ''}
            </p>
          </div>
          <span className="status-chip status-chip--green">
            {user?.role === 'admin' ? '管理員' : user?.is_demo ? '展示沙盒' : '正式封測用戶'}
          </span>
        </div>

        <div className="split-grid-2">
          <Link to="/app/feedback" className="btn btn--primary" onClick={onTriggerTap}>
            {hasSubmittedSurvey ? '再次填寫封測回饋' : '填寫 90 秒封測回饋問卷'}
          </Link>
          <button type="button" className="btn" onClick={() => void handleLogout()}>
            登出目前帳號
          </button>
        </div>

        {isAdmin && (
          <Link to="/admin/beta-analytics" className="btn" onClick={onTriggerTap}>
            開啟 20–30 位用戶實測數據與匯出中心 (Admin)
          </Link>
        )}
      </section>

      {/* 1. Multi-Pet Switcher + Add Pet Button */}
      <div>
        <div className="stitch-list-head" style={{ marginBottom: '6px' }}>
          <span className="stitch-list-title">家庭毛孩成員 ({pets.length})</span>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              onTriggerTap();
              setShowAddPet((v) => !v);
            }}
          >
            {showAddPet ? '收合表單' : '＋ 新增毛孩'}
          </button>
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

      {/* Add Pet Form */}
      {showAddPet && (
        <section className="stitch-card" aria-label="新增毛孩檔案">
          <h2 style={{ fontSize: '15px', fontWeight: 700 }}>建立新毛孩雲端健康檔案</h2>
          <form onSubmit={handleCreatePet} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="split-grid-2">
              <input
                type="text"
                required
                className="input-field"
                value={newPetName}
                onChange={(e) => setNewPetName(e.target.value)}
                placeholder="毛孩姓名（例：麻糬）*"
              />
              <select
                className="select-field"
                value={newPetSpecies}
                onChange={(e) => setNewPetSpecies(e.target.value as 'cat' | 'dog')}
              >
                <option value="cat">貓咪 (Cat)</option>
                <option value="dog">狗狗 (Dog)</option>
              </select>
            </div>
            <div className="split-grid-2">
              <input
                type="text"
                className="input-field"
                value={newPetBreed}
                onChange={(e) => setNewPetBreed(e.target.value)}
                placeholder="品種（例：美短 / 柴犬）"
              />
              <select
                className="select-field"
                value={newPetCoat}
                onChange={(e) => setNewPetCoat(e.target.value as 'short' | 'long')}
              >
                <option value="short">短毛</option>
                <option value="long">長毛（啟用遮擋補償）</option>
              </select>
            </div>
            <div className="split-grid-2">
              <input
                type="text"
                className="input-field mono-val"
                value={newPetAge}
                onChange={(e) => setNewPetAge(e.target.value)}
                placeholder="年齡（例：9y）"
              />
              <input
                type="number"
                step="0.1"
                className="input-field mono-val"
                value={newPetWeight}
                onChange={(e) => setNewPetWeight(e.target.value)}
                placeholder="體重 kg"
              />
            </div>
            <input
              type="text"
              className="input-field"
              value={newPetCondition}
              onChange={(e) => setNewPetCondition(e.target.value)}
              placeholder="慢性病或照護重點（選填，如：IRIS 腎病第 2 期、關節炎）"
            />
            <button type="submit" className="btn btn--primary" disabled={isCreatingPet}>
              {isCreatingPet ? '寫入雲端資料庫中...' : '確認新增毛孩檔案'}
            </button>
          </form>
        </section>
      )}

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
                <span className="status-chip status-chip--green">
                  {selectedPet.species === 'dog' ? '犬隻' : '貓咪'}
                </span>
              </div>
              <p className="stitch-pet-sub mono-val">
                {selectedPet.breed} | {selectedPet.age_label}
              </p>
            </div>
          </div>

          <strong className="mono-val" style={{ color: 'var(--color-brand-primary)' }}>
            {(selectedPet.weight_kg ?? 4.5).toFixed(1)} kg
          </strong>
        </div>

        <div className="pet-pill-group">
          {selectedPet.chronic_conditions.map((cond, idx) => (
            <span key={idx} className="status-chip status-chip--yellow">
              {cond}
            </span>
          ))}
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

      {/* 3. 0-Baseline Calibration Card */}
      <section className="stitch-card" aria-labelledby="baseline-calib-heading">
        <div className="stitch-pet-row">
          <div>
            <h2 id="baseline-calib-heading" style={{ fontSize: '15px', fontWeight: 700 }}>
              0 分健康臉部基準照
            </h2>
            <span className="brand-subtitle">Feline Grimace Scale Zero Baseline</span>
          </div>
          <span className="status-chip status-chip--green">雲端同步</span>
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
                Base-001 (EAR {(selectedPet.baseline_metrics?.leftEAR ?? 0.42).toFixed(3)})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-on-dark-muted)' }}>
                用於往後每次疼痛視覺初篩之個人化 Δ 基準對照
              </div>
            </div>
          </div>
          <span className="status-chip status-chip--green mono-val">0/10</span>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => navigate('/app/fgs-scan')}
        >
          拍攝或更新 0 分健康基準照
        </button>
      </section>

      {/* 4. Clinic Access & Sync Matrix */}
      <section className="stitch-card" aria-labelledby="ehr-access-heading">
        <div className="stitch-pet-row">
          <h2 id="ehr-access-heading" style={{ fontSize: '15px', fontWeight: 700 }}>
            醫療院所與病歷同步設定
          </h2>
          <span className="status-chip status-chip--green">D1 雲端同步</span>
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
          <span>每日照護與打卡推播提醒</span>
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
          <span>允許跨院自動匯出唯讀看診摘要封包</span>
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
