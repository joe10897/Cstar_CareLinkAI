/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CARELINK_ASSETS,
  PARTNER_CLINICS,
  type PetProfile,
} from '../services/carelinkStore';
import { createPresetLandmarks } from '../utils/fgsGeometryCalculator';
import { FGSAnnotationCanvas } from '../components/FGSAnnotationCanvas';
import { BottomSheetDrawer } from '../components/overlays/BottomSheetDrawer';

export interface SitterHandoverPageProps {
  selectedPet: PetProfile;
  onTriggerTap: () => void;
  onTriggerConfirm: () => void;
  onNotify: (msg: string, detail?: string) => void;
}

export const SitterHandoverPage: React.FC<SitterHandoverPageProps> = ({
  selectedPet,
  onTriggerTap,
  onTriggerConfirm,
  onNotify,
}) => {
  const [handoverDrawerOpen, setHandoverDrawerOpen] = useState(false);
  const [fgsHudOpen, setFgsHudOpen] = useState(false);
  const [sitterMessageText, setSitterMessageText] = useState('');

  const baselinePoints = createPresetLandmarks('baseline_0');
  const baselinePortrait = CARELINK_ASSETS.fgsPortrait;
  const primaryClinic = PARTNER_CLINICS[0];

  return (
    <>
      {/* 1. Live Check-in Notification Banner (Matches stitch_export/bottom_sheet/code.html) */}
      <div className="stitch-toast-banner" role="status">
        <div className="stitch-toast-banner__left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span className="stitch-toast-banner__text">
            保姆剛完成 10:50 貓臉平安照打卡，FGS 0/10
          </span>
        </div>
        <button
          type="button"
          className="stitch-toast-cta"
          onClick={() => {
            onTriggerTap();
            setFgsHudOpen(true);
          }}
        >
          查看
        </button>
      </div>

      {/* 2. Sitter Credential Hero Card (林芷晴) */}
      <section className="stitch-card" aria-labelledby="sitter-hero-heading">
        <div className="stitch-pet-row">
          <div className="stitch-pet-identity">
            <div className="stitch-avatar-wrap">
              <img
                src={CARELINK_ASSETS.sitterLinAvatar}
                alt="執勤保姆 林芷晴"
                className="stitch-avatar-img"
                width={48}
                height={48}
              />
              <span className="stitch-online-badge" aria-hidden="true" />
            </div>
            <div className="stitch-pet-meta">
              <div className="stitch-pet-name-line">
                <h1 id="sitter-hero-heading" className="stitch-pet-name">
                  林芷晴
                </h1>
                <span className="status-chip status-chip--green">獸醫助理認證</span>
              </div>
              <p className="stitch-pet-sub">到府專職護理師 ‧ 累計照護 142 場次</p>
            </div>
          </div>

          <span className="status-chip status-chip--green">進行中</span>
        </div>

        <div className="stitch-kpi-3col">
          <div className="stitch-kpi-mini">
            <span className="stitch-kpi-mini__label">預約時長</span>
            <strong className="mono-val" style={{ fontSize: '13px' }}>
              10:00 - 11:30
            </strong>
          </div>
          <div className="stitch-kpi-mini">
            <span className="stitch-kpi-mini__label">客廳溫濕度</span>
            <strong className="mono-val" style={{ fontSize: '13px' }}>
              24°C / 58%
            </strong>
          </div>
          <div className="stitch-kpi-mini">
            <span className="stitch-kpi-mini__label">排程狀態</span>
            <strong className="mono-val" style={{ fontSize: '13px', color: 'var(--color-status-safe)' }}>
              4 / 4 項就緒
            </strong>
          </div>
        </div>
      </section>

      {/* 3. Handover Packet Trigger Card */}
      <div className="stitch-card">
        <div className="stitch-pet-row">
          <div className="stitch-pet-meta">
            <strong style={{ fontSize: '14px' }}>
              {selectedPet.short_name || selectedPet.name}專屬照護交接包
            </strong>
            <span className="brand-subtitle">
              禁忌食材 / 輸液位置 / {primaryClinic.name}急診通道
            </span>
          </div>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              onTriggerTap();
              setHandoverDrawerOpen(true);
            }}
          >
            展開交接包
          </button>
        </div>
      </div>

      {/* 4. Live Timeline Section */}
      <div className="stitch-list-head">
        <span className="stitch-list-title">即時到府照護動態</span>
        <span className="stitch-list-count mono-val">最後同步 10:52:14</span>
      </div>

      <section className="stitch-timeline" aria-label="保姆現場服務時間軸">
        <div className="stitch-timeline-item stitch-card">
          <span className="stitch-timeline-node" aria-hidden="true" />
          <div className="stitch-pet-row">
            <div className="pet-pill-group">
              <strong className="mono-val">10:50</strong>
              <span className="status-chip status-chip--green">AI 48 點平安快篩</span>
            </div>
            <span className="mono-val" style={{ fontSize: '12px', fontWeight: 700 }}>
              FGS 0 / 10
            </span>
          </div>

          <img
            src={baselinePortrait}
            alt="10:50 保姆上傳之貓臉平安照"
            className="memo-upload-preview"
          />

          <div className="stitch-kpi-3col">
            <div className="stitch-subbox">
              <span className="brand-subtitle">耳朵姿態</span>
              <strong style={{ fontSize: '12px' }}>前傾自然 (0)</strong>
            </div>
            <div className="stitch-subbox">
              <span className="brand-subtitle">眼周張力</span>
              <strong style={{ fontSize: '12px' }}>明亮放鬆 (0)</strong>
            </div>
            <div className="stitch-subbox">
              <span className="brand-subtitle">鬍鬚位置</span>
              <strong style={{ fontSize: '12px' }}>舒展下垂 (0)</strong>
            </div>
          </div>

          <p className="brand-subtitle">
            保姆回報：輸液後主動翻肚呼嚕，眼神柔和無瞇眼，離戶前精神狀況極佳。
          </p>

          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              onTriggerTap();
              setFgsHudOpen(true);
            }}
          >
            放大檢視 48 點神經幾何細節
          </button>
        </div>

        <div className="stitch-timeline-item stitch-card">
          <span className="stitch-timeline-node" aria-hidden="true" />
          <div className="stitch-pet-row">
            <strong className="mono-val">10:35</strong>
            <span className="engine-badge">醫療照護完成</span>
          </div>
          <div className="stitch-timeline-media">
            <img
              src={CARELINK_ASSETS.subqFluidThumb}
              alt="皮下輸液 100ml 器材實拍存證"
              className="stitch-thumb-sq"
              width={72}
              height={72}
            />
            <div className="stitch-pet-meta">
              <strong style={{ fontSize: '14px' }}>完成皮下輸液 100ml</strong>
              <p className="brand-subtitle">
                使用 23G 蝶翼針於肩胛左側皮下慢速注入乳酸林格氏液，全程配合未掙扎。
              </p>
            </div>
          </div>
        </div>

        <div className="stitch-timeline-item stitch-card">
          <span className="stitch-timeline-node" aria-hidden="true" />
          <div className="stitch-pet-row">
            <strong className="mono-val">10:15</strong>
            <span className="engine-badge">營養補給</span>
          </div>
          <div className="stitch-timeline-media">
            <img
              src={CARELINK_ASSETS.catFoodBowlThumb}
              alt="低磷鮮食與過濾活水碗實拍"
              className="stitch-thumb-sq"
              width={72}
              height={72}
            />
            <div className="stitch-pet-meta">
              <strong style={{ fontSize: '14px' }}>低磷鮮食 60g 與過濾活水補注 150ml</strong>
              <p className="brand-subtitle">已清洗水碗更換濾水，主食完食度 100%。</p>
            </div>
          </div>
        </div>

        <div className="stitch-timeline-item stitch-card">
          <span className="stitch-timeline-node" aria-hidden="true" />
          <div className="stitch-pet-row">
            <strong className="mono-val">10:00</strong>
            <span className="status-chip status-chip--green">GPS 校驗符合</span>
          </div>
          <p className="brand-subtitle">
            抵達現場並完成雙手消毒與門窗防護檢查，室溫調整至 24°C。
          </p>
        </div>
      </section>

      {/* 5. Quick Actions & Message */}
      <section className="stitch-card" aria-label="即時聯繫與端點切換">
        <div className="stitch-composer-row">
          <input
            type="text"
            className="input-field"
            style={{ flex: 1 }}
            value={sitterMessageText}
            onChange={(e) => setSitterMessageText(e.target.value)}
            placeholder="傳送即時叮嚀給到府保姆林芷晴..."
            aria-label="傳送叮嚀訊息"
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              if (!sitterMessageText.trim()) return;
              onTriggerConfirm();
              onNotify('已透過 LINE 頻道傳送即時叮嚀', sitterMessageText.trim());
              setSitterMessageText('');
            }}
          >
            傳送
          </button>
        </div>

        <div className="split-grid-2">
          <Link to="/sitter/portal" className="btn" onClick={onTriggerTap}>
            切換保姆工作台
          </Link>
          <a href="tel:0226723456" className="btn btn--primary">
            連線特約醫院急診
          </a>
        </div>
      </section>

      <BottomSheetDrawer
        open={handoverDrawerOpen}
        title={`${selectedPet.short_name || selectedPet.name}專屬照護交接包`}
        subtitle="醫囑飲食禁忌、緊急聯絡醫院與減壓操作指南"
        onClose={() => setHandoverDrawerOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="stitch-subbox">
            <span className="status-chip status-chip--red" style={{ width: 'fit-content' }}>
              醫療飲食禁忌
            </span>
            <p className="brand-subtitle">
              嚴禁餵食高磷高鈉肉泥、柴魚乾與含洋蔥成分食物。每日皮下輸液維持 100ml，不可過度加壓。
            </p>
          </div>
          <div className="stitch-subbox">
            <strong>配合急診院所：{primaryClinic.name}</strong>
            <span className="brand-subtitle">
              聯絡電話：{primaryClinic.phone} ({primaryClinic.hasNightEmergency ? '24H 急診通道' : '門診預約'})
            </span>
          </div>
          <div className="stitch-subbox">
            <strong>情緒減壓指南</strong>
            <span className="brand-subtitle">
              清掃貓砂前請關閉電動家電；偏好輕撫耳後與下巴，避開尾根觸碰。
            </span>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={() => setHandoverDrawerOpen(false)}
          >
            已閱畢確認
          </button>
        </div>
      </BottomSheetDrawer>

      <BottomSheetDrawer
        open={fgsHudOpen}
        title="10:50 保姆回傳：FGS 48 點神經幾何報告"
        subtitle="總分 0 / 10 (無疼痛徴兆) | 置信度 98.4%"
        onClose={() => setFgsHudOpen(false)}
      >
        <FGSAnnotationCanvas
          imageUrl={baselinePortrait}
          landmarks={baselinePoints}
          editable={false}
          themeMode="darkroom"
          hideBuiltInChrome={true}
        />
      </BottomSheetDrawer>
    </>
  );
};
