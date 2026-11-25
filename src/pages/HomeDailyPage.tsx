/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  carelinkStore,
  PARTNER_CLINICS,
  type DailyCareLog,
  type PetProfile,
} from '../services/carelinkStore';
import { useR2Upload } from '../hooks/useR2Upload';
import { BottomSheetDrawer } from '../components/overlays/BottomSheetDrawer';
import { ActionSheetModal } from '../components/overlays/ActionSheetModal';

export interface HomeDailyPageProps {
  selectedPet: PetProfile;
  hapticEnabled: boolean;
  onToggleHaptic: () => void;
  onTriggerTap: () => void;
  onTriggerConfirm: () => void;
  onNotify: (msg: string, detail?: string) => void;
}

const BRISTOL_LABELS: Record<1 | 4 | 6 | 7, string> = {
  1: '乾硬顆粒',
  4: '3型香腸狀',
  6: '糊狀軟便',
  7: '急性水便',
};

const renderBristolIcon = (scale: 1 | 4 | 6 | 7): React.ReactNode => {
  if (scale === 1) {
    return (
      <svg width="20" height="14" viewBox="0 0 24 14" fill="currentColor" aria-hidden="true">
        <circle cx="6" cy="7" r="2.8" />
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="17.5" cy="8.5" r="2.6" />
      </svg>
    );
  }
  if (scale === 4) {
    return (
      <svg width="20" height="14" viewBox="0 0 24 14" fill="currentColor" aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="5" rx="2.5" />
      </svg>
    );
  }
  if (scale === 6) {
    return (
      <svg width="20" height="14" viewBox="0 0 24 14" fill="currentColor" aria-hidden="true">
        <path d="M4 9c1.5-3 4-4 6-2 2 1.8 4-2 6.5-1.5 2 .5 3 2 3.5 3.5H4Z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="14" viewBox="0 0 24 14" fill="currentColor" aria-hidden="true">
      <path d="M3 8.5c3-2 6 1.5 9 0s6-1.5 9 .5v2.5H3V8.5Z" />
    </svg>
  );
};

export const HomeDailyPage: React.FC<HomeDailyPageProps> = ({
  selectedPet,
  hapticEnabled,
  onToggleHaptic,
  onTriggerTap,
  onTriggerConfirm,
  onNotify,
}) => {
  const navigate = useNavigate();
  const { isUploading, uploadImageToR2 } = useR2Upload();

  const [careLog, setCareLog] = useState<DailyCareLog>(() =>
    carelinkStore.getDailyCareLog(selectedPet.id)
  );
  const [bannerVisible, setBannerVisible] = useState(true);
  const [subqDrawerOpen, setSubqDrawerOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [uploadedMemoThumb, setUploadedMemoThumb] = useState<string | null>(null);

  useEffect(() => {
    setCareLog(carelinkStore.getDailyCareLog(selectedPet.id));
  }, [selectedPet.id]);

  const latestFgs =
    carelinkStore.getFGSRecords().find((r) => r.pet_id === selectedPet.id) ||
    carelinkStore.getFGSRecords()[0];

  const updateLog = (patch: Partial<DailyCareLog>): DailyCareLog => {
    const next: DailyCareLog = { ...careLog, ...patch };
    setCareLog(next);
    carelinkStore.saveDailyCareLog(next);
    return next;
  };

  const handleAddWater = (amountMl: number): void => {
    onTriggerTap();
    const nextWater = Math.min(400, careLog.water_ml + amountMl);
    updateLog({ water_ml: nextWater });
    setBannerVisible(true);
    if (nextWater >= careLog.water_target_ml) {
      onTriggerConfirm();
      onNotify(
        `今日飲水目標已達成 (${nextWater} / ${careLog.water_target_ml} ml)`,
        '已同步更新至跨院腎臟病歷與保姆交接包'
      );
    } else {
      onNotify(`已記錄飲水 +${amountMl}ml`, `目前累計 ${nextWater} / ${careLog.water_target_ml} ml`);
    }
  };

  const handleAppetiteChange = (level: 'normal' | 'half' | 'refused'): void => {
    onTriggerTap();
    updateLog({ appetite: level });
    const labelMap = {
      normal: '正常進食',
      half: '食量減半 (建議搭配貓臉快篩)',
      refused: '拒食逾 12 小時 (建議開啟 AI 問診)',
    };
    onNotify(`今日食慾已更新：${labelMap[level]}`);
  };

  const handleBristolChange = (scale: 1 | 4 | 6 | 7): void => {
    onTriggerTap();
    updateLog({ bristol_scale: scale });
    onNotify(`布里斯托排便型態已記錄為第 ${scale} 型`);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await uploadImageToR2(file, 'daily-care', selectedPet.id);
      setUploadedMemoThumb(uploaded.dataUrl);
      onTriggerConfirm();
      onNotify('日常異常影像已校正 EXIF 並備份至 R2', `物件鍵值: ${uploaded.r2ObjectKey}`);
    } catch {
      onNotify('影像讀取失敗，請選擇 JPG 或 PNG 照片');
    }
  };

  const waterRatioPct = Math.min(
    100,
    Math.round((careLog.water_ml / Math.max(1, careLog.water_target_ml)) * 100)
  );

  const appetiteLabel =
    careLog.appetite === 'normal' ? '正常' : careLog.appetite === 'half' ? '減半' : '拒食';
  const bristolLabel = BRISTOL_LABELS[careLog.bristol_scale] || '3型香腸狀';
  const latestScore = latestFgs?.scores.total ?? 0;
  const fgsStatusText =
    latestScore >= 4
      ? '疼痛警示'
      : latestScore >= 2
      ? '微幅緊張觀察'
      : '無疼痛徵兆';

  return (
    <>
      {bannerVisible && (
        <div className="stitch-toast-banner" role="status">
          <div className="stitch-toast-banner__left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-landmark-whisker-dot)" strokeWidth="2.4" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span className="stitch-toast-banner__text mono-val">
              飲水已達 {waterRatioPct}% ‧ 皮下輸液 {careLog.subq_fluid_ml}ml 已記帳
            </span>
          </div>
          <button
            type="button"
            className="stitch-toast-close"
            aria-label="關閉頂部狀態橫幅"
            onClick={() => setBannerVisible(false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="stitch-haptic-row">
        <button
          type="button"
          className="stitch-haptic-pill"
          onClick={() => {
            onToggleHaptic();
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2.1" aria-hidden="true">
            <rect x="6" y="4" width="12" height="16" rx="2" />
            <path d="M2 8v8M22 8v8" />
          </svg>
          <span>觸覺與提示音：{hapticEnabled ? '開啟中' : '已靜音'}</span>
          <span
            className={
              hapticEnabled ? 'stitch-pet-dot' : 'stitch-pet-dot stitch-pet-dot--warn'
            }
            aria-hidden="true"
          />
        </button>
        <span className="stitch-haptic-note mono-val">Web Audio 溫潤反饋</span>
      </div>

      {/* 1. Compact Pet Status Row Card (Matches stitch_export/_/screen.png) */}
      <section className="stitch-card" aria-labelledby="home-pet-status-heading">
        <div className="stitch-pet-row">
          <div className="stitch-pet-identity">
            <div className="stitch-avatar-wrap">
              <img
                src={selectedPet.baseline_image_url}
                alt={selectedPet.name}
                className="stitch-avatar-img"
                width={48}
                height={48}
              />
              <span className="stitch-online-badge" aria-hidden="true" />
            </div>
            <div className="stitch-pet-meta">
              <div className="stitch-pet-name-line">
                <h1 id="home-pet-status-heading" className="stitch-pet-name">
                  {selectedPet.short_name || selectedPet.name}
                </h1>
                <span className="stitch-age-tag mono-val">
                  {selectedPet.age_label || '8y 2m'}
                </span>
              </div>
              <p className="stitch-pet-sub">
                {selectedPet.breed} ‧ {selectedPet.chronic_conditions[0] || 'IRIS 腎病第 2 期'}
              </p>
            </div>
          </div>

          <div className="stitch-pet-actions">
            <button
              type="button"
              className={careLog.sitter_handover_active ? 'stitch-pill-toggle is-on' : 'stitch-pill-toggle'}
              onClick={() => {
                const next = !careLog.sitter_handover_active;
                updateLog({ sitter_handover_active: next });
                onTriggerConfirm();
                onNotify(
                  next ? '已開放保姆交接包授權' : '已暫停保姆交接包授權'
                );
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
                <path d="M12 21s-7-4.4-9-8.5C1.5 9.2 3.7 6 7 6c1.9 0 3.4 1 5 2.7C13.6 7 15.1 6 17 6c3.3 0 5.5 3.2 4 6.5-2 4.1-9 8.5-9 8.5Z" />
              </svg>
              <span>保姆交接</span>
            </button>
            <button
              type="button"
              className="stitch-more-btn"
              aria-label="開啟多模態快捷選單"
              onClick={() => {
                onTriggerTap();
                setActionSheetOpen(true);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Prominent Hero Sage-Spruce FGS Card */}
      <section className="stitch-hero-fgs" aria-labelledby="hero-fgs-heading">
        <div className="stitch-hero-fgs__top">
          <div>
            <span className="stitch-hero-fgs__chip mono-val">CV 48-Point Mesh</span>
            <h2 id="hero-fgs-heading" className="stitch-hero-fgs__title">
              AI 貓臉表情 FGS 疼痛快篩
            </h2>
            <p className="stitch-hero-fgs__desc">
              藉由五官特徵點量測耳朵位置、眼眶緊繃與口吻緊張度
            </p>
          </div>

          <Link
            to="/app/fgs-scan"
            className="stitch-hero-orb"
            aria-label="立即啟動貓臉 48 點相機快篩"
            onClick={onTriggerTap}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </Link>
        </div>

        <div className="stitch-hero-fgs__bottom">
          <span className="stitch-hero-fgs__status mono-val">
            <span
              className={latestScore >= 4 ? 'stitch-hero-dot stitch-hero-dot--warn' : 'stitch-hero-dot'}
              aria-hidden="true"
            />
            <span>上次快篩：{latestScore}/10 ({fgsStatusText})</span>
          </span>
          <Link to="/app/fgs-scan" className="stitch-hero-cta" onClick={onTriggerTap}>
            <span>立即評估</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* 3. Side-by-Side 2-Col Water + Appetite Bento */}
      <section className="stitch-bento-2col" aria-label="飲水與食慾日常快記">
        <div className="stitch-bento-tile">
          <div className="stitch-bento-head">
            <span className="stitch-bento-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-water)" strokeWidth="2.2" aria-hidden="true">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
              飲水進度
            </span>
            <span className="stitch-bento-val mono-val">{careLog.water_ml} ml</span>
          </div>

          <div className="stitch-water-progress-wrap">
            <div
              className="stitch-slim-track"
              role="progressbar"
              aria-valuenow={careLog.water_ml}
              aria-valuemin={0}
              aria-valuemax={careLog.water_target_ml}
              aria-label={`今日飲水進度 ${waterRatioPct}%`}
            >
              <div className="stitch-slim-fill" style={{ width: `${waterRatioPct}%` }}>
                <span className="stitch-slim-tip" aria-hidden="true" />
              </div>
            </div>
            <div className="stitch-scale-row mono-val">
              <span>0</span>
              <span>目標 {careLog.water_target_ml}ml</span>
            </div>
          </div>

          <button
            type="button"
            className="stitch-quick-add"
            onClick={() => handleAddWater(50)}
          >
            + 快捷 +50ml
          </button>
        </div>

        <div className="stitch-bento-tile">
          <div className="stitch-bento-head">
            <span className="stitch-bento-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-status-warn)" strokeWidth="2.2" aria-hidden="true">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
              今日食慾
            </span>
            <span
              className={
                careLog.appetite === 'normal'
                  ? 'status-chip status-chip--green'
                  : careLog.appetite === 'half'
                  ? 'status-chip status-chip--yellow'
                  : 'status-chip status-chip--red'
              }
            >
              {appetiteLabel}
            </span>
          </div>

          <div className="stitch-segment-3" role="group" aria-label="食慾狀態選擇">
            {[
              { id: 'normal' as const, label: '正常' },
              { id: 'half' as const, label: '減半' },
              { id: 'refused' as const, label: '拒食' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={careLog.appetite === item.id ? 'stitch-seg-option is-active' : 'stitch-seg-option'}
                onClick={() => handleAppetiteChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <span className="brand-subtitle">
            {careLog.appetite === 'normal'
              ? '早：主食罐 45g (完食)'
              : careLog.appetite === 'half'
              ? '僅舔食肉泥，建議晚間複查'
              : '已連續空腹，建議啟動 AI 分流'}
          </span>
        </div>
      </section>

      {/* 4. Collapsible Clinical Accordions (Closed by default to preserve Stitch clean cadence) */}
      <div className="stitch-list-head">
        <span className="stitch-list-title">進階日常病歷與觀察 (可折疊詳看)</span>
        <span className="stitch-list-count mono-val">3 個分類</span>
      </div>

      <section aria-label="日常醫療打卡明細">
        <details className="stitch-accordion">
          <summary className="stitch-accordion__summary">
            <div className="stitch-accordion__left">
              <div className="stitch-acc-tile stitch-acc-tile--warn" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
              <div className="stitch-acc-text">
                <div className="stitch-acc-title-row">
                  <span className="stitch-acc-title">排泄健康與布里斯托大便對照</span>
                  <span className="status-chip status-chip--green">正常</span>
                </div>
                <span className="stitch-acc-sub mono-val">
                  尿塊 ×{careLog.urine_clumps} (中球) ‧ {bristolLabel} ‧ <span className="stitch-acc-link">點擊展開圖解</span>
                </span>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>

          <div className="stitch-accordion__body">
            <div className="bristol-grid-4">
              {([1, 4, 6, 7] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  className={careLog.bristol_scale === scale ? 'bristol-chip-btn is-active' : 'bristol-chip-btn'}
                  onClick={() => handleBristolChange(scale)}
                >
                  {renderBristolIcon(scale)}
                  <span>{scale}型</span>
                </button>
              ))}
            </div>

            <div className="ledger-row">
              <span className="brand-subtitle">今日貓砂尿塊統計</span>
              <div className="pet-pill-group">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    onTriggerTap();
                    updateLog({ urine_clumps: Math.max(0, careLog.urine_clumps - 1) });
                  }}
                >
                  -1
                </button>
                <strong className="mono-val">{careLog.urine_clumps} 塊</strong>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    onTriggerTap();
                    updateLog({ urine_clumps: careLog.urine_clumps + 1 });
                  }}
                >
                  +1
                </button>
              </div>
            </div>
          </div>
        </details>

        <details className="stitch-accordion" style={{ marginTop: '10px' }}>
          <summary className="stitch-accordion__summary">
            <div className="stitch-accordion__left">
              <div className="stitch-acc-tile stitch-acc-tile--ear" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                  <path d="M18 2l4 4" />
                  <path d="M17 7l3-3" />
                  <path d="M19 9L8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
                  <path d="M9 11l4 4" />
                  <path d="M5 19l-3 3" />
                </svg>
              </div>
              <div className="stitch-acc-text">
                <div className="stitch-acc-title-row">
                  <span className="stitch-acc-title">體重趨勢與每日用藥 / 皮下輸液</span>
                  <span className="status-chip status-chip--green">
                    {careLog.med_evening_bp_done ? '2/2 完成' : '1/2 完成'}
                  </span>
                </div>
                <span className="stitch-acc-sub mono-val">
                  皮下 {careLog.subq_fluid_ml}ml [已完成] ‧ 晚降血壓 [{careLog.med_evening_bp_done ? '已服' : '待服'}] ‧ {careLog.weight_kg.toFixed(2)}kg
                </span>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>

          <div className="stitch-accordion__body" style={{ paddingTop: '10px' }}>
            <label className="ledger-row">
              <span>早 08:00 皮下點滴 {careLog.subq_fluid_ml}ml</span>
              <input
                type="checkbox"
                checked={careLog.subq_fluid_ml >= careLog.subq_target_ml}
                onChange={(e) => {
                  onTriggerConfirm();
                  updateLog({ subq_fluid_ml: e.target.checked ? careLog.subq_target_ml : 0 });
                }}
              />
            </label>
            <label className="ledger-row">
              <span>晚 21:00 降血壓藥半顆 (飯後 30 分鐘)</span>
              <input
                type="checkbox"
                checked={careLog.med_evening_bp_done}
                onChange={(e) => {
                  onTriggerConfirm();
                  updateLog({ med_evening_bp_done: e.target.checked });
                }}
              />
            </label>
            <div className="stitch-subbox">
              <div className="stitch-scale-row">
                <span>近 7 日體重穩態曲線</span>
                <strong className="mono-val">{careLog.weight_kg.toFixed(2)} kg</strong>
              </div>
              <svg viewBox="0 0 180 34" aria-label="近 7 日體重趨勢折線圖" style={{ width: '100%', height: '34px', display: 'block' }}>
                <line x1="0" y1="24" x2="180" y2="24" stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth="1" />
                <polyline
                  fill="none"
                  stroke="#1F4E3D"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="6,20 35,19 64,22 93,17 122,17 151,14 174,13"
                />
                <circle cx="174" cy="13" r="3.5" fill="#15803D" />
              </svg>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                onTriggerTap();
                setSubqDrawerOpen(true);
              }}
            >
              調整輸液刻度與體重紀錄
            </button>
          </div>
        </details>

        <details className="stitch-accordion" style={{ marginTop: '10px' }}>
          <summary className="stitch-accordion__summary">
            <div className="stitch-accordion__left">
              <div className="stitch-acc-tile stitch-acc-tile--mint" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div className="stitch-acc-text">
                <div className="stitch-acc-title-row">
                  <span className="stitch-acc-title">當日異常觀察與備註 (給保姆/獸醫)</span>
                </div>
                <span className="stitch-acc-sub">
                  精神活力良好 ‧ 呼吸頻率 22次/分 ‧ 點擊記錄異常或拍照
                </span>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>

          <div className="stitch-accordion__body" style={{ paddingTop: '10px' }}>
            <textarea
              className="input-field"
              aria-label="日常症狀文字觀察"
              value={careLog.memo_text}
              onChange={(e) => updateLog({ memo_text: e.target.value })}
              placeholder="記錄食慾細節、呼吸或嘔吐狀況..."
            />
            <div className="split-grid-2">
              <label className="btn">
                <span>{isUploading ? '上傳中...' : '附加症狀相片 R2'}</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePhotoUpload}
                />
              </label>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  onTriggerConfirm();
                  onNotify('日常異常筆記已儲存至雲端時間軸');
                }}
              >
                儲存觀察筆記
              </button>
            </div>
            {uploadedMemoThumb && (
              <img
                src={uploadedMemoThumb}
                alt="已上傳的異常影像縮圖"
                className="memo-upload-preview"
              />
            )}
          </div>
        </details>
      </section>

      <BottomSheetDrawer
        open={subqDrawerOpen}
        title="皮下輸液劑量與體重調整"
        subtitle={`為 ${selectedPet.short_name || selectedPet.name} 設定今日臨床基準參數`}
        onClose={() => setSubqDrawerOpen(false)}
      >
        <div className="stitch-bento-2col">
          {[50, 100, 120, 150].map((ml) => (
            <button
              key={ml}
              type="button"
              className={careLog.subq_fluid_ml === ml ? 'btn btn--primary' : 'btn'}
              onClick={() => {
                onTriggerTap();
                updateLog({ subq_fluid_ml: ml });
              }}
            >
              輸液 {ml} ml
            </button>
          ))}
        </div>
        <div className="ledger-row" style={{ marginTop: '10px' }}>
          <span>今日量測體重</span>
          <div className="pet-pill-group">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => updateLog({ weight_kg: Number((careLog.weight_kg - 0.1).toFixed(1)) })}
            >
              -0.1
            </button>
            <strong className="mono-val">{careLog.weight_kg.toFixed(1)} kg</strong>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => updateLog({ weight_kg: Number((careLog.weight_kg + 0.1).toFixed(1)) })}
            >
              +0.1
            </button>
          </div>
        </div>
      </BottomSheetDrawer>

      <ActionSheetModal
        open={actionSheetOpen}
        petName={selectedPet.short_name || selectedPet.name}
        onClose={() => setActionSheetOpen(false)}
        onUploadVomitPhoto={() => navigate('/app/chat')}
        onExportVetPdf={() => navigate('/app/trends')}
        onCreateEmergencyReferral={() => {
          const clinic = PARTNER_CLINICS[0];
          const ref = carelinkStore.createClinicReferral({
            pet_id: selectedPet.id,
            pet_name: selectedPet.name,
            breed: selectedPet.breed,
            age_years: 8,
            clinic_id: clinic.id,
            clinic_name: clinic.name,
            urgency_level: 'yellow',
            trigger_reason: `飼主於日常看板快速發起轉診預審 (飲水 ${careLog.water_ml}ml)`,
            latest_fgs_record_id: latestFgs?.id || 'fgs-rec-101',
            fgs_total_score: latestScore,
            crea_value: 2.3,
            sdma_value: 14,
          });
          onTriggerConfirm();
          onNotify(`已發起預審推播 (${ref.share_token})`, clinic.name);
        }}
      />
    </>
  );
};
