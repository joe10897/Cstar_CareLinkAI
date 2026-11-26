/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CARELINK_ASSETS,
  PARTNER_CLINICS,
  type PetProfile,
} from '../services/carelinkStore';

export interface SitterPortalPageProps {
  selectedPet: PetProfile;
  onTriggerTap: () => void;
  onTriggerConfirm: () => void;
  onNotify: (msg: string, detail?: string) => void;
}

export const SitterPortalPage: React.FC<SitterPortalPageProps> = ({
  selectedPet,
  onTriggerTap,
  onTriggerConfirm,
  onNotify,
}) => {
  const navigate = useNavigate();
  const [onlineReady, setOnlineReady] = useState(true);
  const [newOrderStatus, setNewOrderStatus] = useState<'pending' | 'accepted' | 'declined'>(
    'pending'
  );
  const [sopChecks, setSopChecks] = useState<Record<string, boolean>>({
    step1_gps: true,
    step2_water: true,
    step3_subq: true,
    step4_fgs: false,
  });

  const completedSopCount = Object.values(sopChecks).filter(Boolean).length;
  const emergencyClinic = PARTNER_CLINICS[2] || PARTNER_CLINICS[0];

  return (
    <>
      {/* 1. Mode Switch & Top Sitter Status Strip */}
      <div className="stitch-haptic-row">
        <span className="stitch-sitter-mode-label">
          <span className="stitch-pet-dot" aria-hidden="true" />
          <span>專業照護模式 ON</span>
        </span>
        <Link to="/app/sitters" className="stitch-pill-toggle" onClick={onTriggerTap}>
          <span>切換回飼主端視角</span>
        </Link>
      </div>

      {/* 2. Sitter Overview Card (Matches stitch_export/sitter_portal/screen.png) */}
      <section className="stitch-card" aria-labelledby="sitter-portal-heading">
        <div className="stitch-pet-row">
          <div className="stitch-pet-identity">
            <div className="stitch-avatar-wrap">
              <img
                src={CARELINK_ASSETS.sitterLinAvatar}
                alt="執勤保姆 林芷晴"
                className="stitch-avatar-img"
                width={52}
                height={52}
              />
              <span className="stitch-online-badge" aria-hidden="true" />
            </div>
            <div className="stitch-pet-meta">
              <div className="stitch-pet-name-line">
                <h1 id="sitter-portal-heading" className="stitch-pet-name">
                  林芷晴
                </h1>
                <span className="status-chip status-chip--green">獸醫助理認證</span>
              </div>
              <p className="stitch-pet-sub">高級特殊醫療照護護理師 ‧ 執業 4 年</p>
            </div>
          </div>

          <button
            type="button"
            className={onlineReady ? 'stitch-pill-toggle is-on' : 'stitch-pill-toggle'}
            onClick={() => {
              onTriggerTap();
              const next = !onlineReady;
              setOnlineReady(next);
              onNotify(next ? '已切換為開放接案中' : '已切換為休息暫停派單');
            }}
          >
            <span
              className={onlineReady ? 'stitch-pet-dot' : 'stitch-pet-dot stitch-pet-dot--warn'}
              aria-hidden="true"
            />
            <span>{onlineReady ? '接案中' : '休息中'}</span>
          </button>
        </div>

        <div className="stitch-kpi-3col">
          <div className="stitch-kpi-mini stitch-kpi-mini--flat">
            <span className="stitch-kpi-mini__label">本月接案</span>
            <strong className="mono-val" style={{ fontSize: '18px' }}>
              28 <span className="brand-subtitle">場</span>
            </strong>
          </div>
          <div className="stitch-kpi-mini stitch-kpi-mini--flat">
            <span className="stitch-kpi-mini__label">滿意度</span>
            <strong className="mono-val" style={{ fontSize: '18px' }}>
              5.0 <span className="brand-subtitle">(142)</span>
            </strong>
          </div>
          <div className="stitch-kpi-mini stitch-kpi-mini--flat">
            <span className="stitch-kpi-mini__label">預估累計收入</span>
            <strong className="mono-val" style={{ fontSize: '15px', color: 'var(--color-brand-primary)' }}>
              NT$ 32,800
            </strong>
          </div>
        </div>
      </section>

      {/* 3. Upcoming Dispatch Hero Card with Spruce Top Accent */}
      <section className="stitch-card stitch-card--accent-top" aria-labelledby="active-mission-heading">
        <div className="stitch-pet-row">
          <span className="status-chip status-chip--water">即將出發 ‧ 尚餘 45 分</span>
          <span className="mono-val brand-subtitle">今日 14:00 - 15:30</span>
        </div>

        <div className="stitch-subbox">
          <div className="stitch-pet-row">
            <div className="stitch-pet-identity">
              <img
                src={selectedPet.baseline_image_url}
                alt={selectedPet.name}
                className="stitch-thumb-sq"
                width={56}
                height={56}
              />
              <div className="stitch-pet-meta">
                <div className="stitch-pet-name-line">
                  <h2 id="active-mission-heading" style={{ fontSize: '15px', fontWeight: 700 }}>
                    {selectedPet.short_name || selectedPet.name}
                  </h2>
                  <span className="brand-subtitle">{selectedPet.breed} ‧ 8歲</span>
                </div>
                <div className="pet-pill-group">
                  <span className="status-chip status-chip--red">重度護理</span>
                  <span className="brand-subtitle">皮下輸液 + 餵藥</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="stitch-subbox">
          <div className="stitch-pet-row">
            <div className="stitch-pet-meta">
              <strong style={{ fontSize: '13.5px' }}>新北市板橋區縣民大道二段 88 號</strong>
              <span className="brand-subtitle">海悅花園大廈 12 樓 ‧ 支援 GPS 到府簽到</span>
            </div>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                onTriggerTap();
                onNotify('已開啟到府路線導航', '新北市板橋區縣民大道二段 88 號');
              }}
            >
              導航
            </button>
          </div>
        </div>

        <div className="stitch-handover-box">
          <div className="stitch-pet-row">
            <strong style={{ fontSize: '12.5px', color: 'var(--color-brand-primary)' }}>
              專屬照護交接包 (家長已授權解鎖)
            </strong>
            <span className="brand-subtitle mono-val">效期至 18:00</span>
          </div>
          <div className="split-grid-2">
            <span className="stitch-handover-pill">禁忌：高鈉點心肉泥</span>
            <span className="stitch-handover-pill">輸液：23G 蝶翼針</span>
          </div>
          <div className="stitch-handover-pill">
            急診指定：{emergencyClinic.name} (24H) ‧ {emergencyClinic.phone}
          </div>
        </div>

        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={() => {
            onTriggerConfirm();
            navigate('/app/fgs-scan');
          }}
        >
          開啟執勤打卡室
        </button>
      </section>

      {/* 4. New Order Dispatch Request Card */}
      <section className="stitch-card" aria-labelledby="dispatch-order-heading">
        <div className="stitch-pet-row">
          <h2 id="dispatch-order-heading" style={{ fontSize: '15px', fontWeight: 700 }}>
            新訂單即時媒合
          </h2>
          <span className="brand-subtitle">1 筆等待回應</span>
        </div>

        <div className="stitch-subbox">
          <div className="stitch-pet-row">
            <div className="stitch-pet-identity">
              <img
                src={CARELINK_ASSETS.yuanyuanAvatar}
                alt="圓圓 赤柴犬"
                className="stitch-avatar-img"
                width={44}
                height={44}
              />
              <div className="stitch-pet-meta">
                <strong style={{ fontSize: '14px' }}>圓圓 ‧ 柴犬 ‧ 3歲</strong>
                <span className="brand-subtitle">台北市大安區 ‧ 單趟 45 分鐘</span>
              </div>
            </div>
            <strong className="mono-val" style={{ fontSize: '16px', color: 'var(--color-brand-primary)' }}>
              NT$ 750
            </strong>
          </div>
          <span className="brand-subtitle">
            預約時間：明日 (週四) 12:30 - 13:15 ‧ 散步放電 30 分鐘 + 鮮食加熱
          </span>
        </div>

        {newOrderStatus === 'pending' ? (
          <div className="split-grid-2">
            <button
              type="button"
              className="stitch-soft-action"
              onClick={() => {
                onTriggerTap();
                setNewOrderStatus('declined');
                onNotify('已婉拒圓圓接案請求');
              }}
            >
              婉拒
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onTriggerConfirm();
                setNewOrderStatus('accepted');
                onNotify('已接受預約', '圓圓明日午間排程已加入您的工作行事曆');
              }}
            >
              接受預約媒合
            </button>
          </div>
        ) : (
          <div className="ledger-row">
            <span className={newOrderStatus === 'accepted' ? 'status-chip status-chip--green' : 'engine-badge'}>
              {newOrderStatus === 'accepted' ? '已確認接單' : '已略過'}
            </span>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setNewOrderStatus('pending')}
            >
              重設狀態
            </button>
          </div>
        )}
      </section>

      {/* 5. 4-Step Medical Sitter SOP Checklist with Numbered Badges */}
      <section className="stitch-card" aria-labelledby="sop-checklist-heading">
        <div className="stitch-pet-row">
          <h2 id="sop-checklist-heading" style={{ fontSize: '15px', fontWeight: 700 }}>
            到府專業護理 SOP 四步驟
          </h2>
          <span className="stitch-list-count mono-val">臨床安全保證 {completedSopCount}/4</span>
        </div>

        <div className="ledger-list">
          {[
            {
              key: 'step1_gps',
              num: '1',
              title: 'GPS 到府到達打卡',
              desc: '半徑 50 公尺基站核對，自動推播飼主',
            },
            {
              key: 'step2_water',
              num: '2',
              title: '環境安全巡查與排泄紀錄',
              desc: '確認門窗緊閉、換新飲用水與便便排量',
            },
            {
              key: 'step3_subq',
              num: '3',
              title: '特約醫療照護執行 (若有)',
              desc: '皮下輸液 100ml 或投藥全程存證',
            },
            {
              key: 'step4_fgs',
              num: '4',
              title: '必備：AI 貓臉 48 點 FGS 平安照',
              desc: '即時分析眼耳口頰 0/10 痛感指數回報',
            },
          ].map((item) => (
            <label
              key={item.key}
              className={item.key === 'step4_fgs' ? 'stitch-sop-row stitch-sop-row--highlight' : 'stitch-sop-row'}
            >
              <span className="stitch-sop-num mono-val">{item.num}</span>
              <span className="stitch-pet-meta">
                <strong style={{ fontSize: '13.5px' }}>{item.title}</strong>
                <span className="brand-subtitle">{item.desc}</span>
              </span>
              <input
                type="checkbox"
                checked={sopChecks[item.key]}
                onChange={() => {
                  onTriggerTap();
                  setSopChecks((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }));
                }}
              />
            </label>
          ))}
        </div>
      </section>

      {/* 6. Official Trust Badges (Matches stitch_export/sitter_portal/screen.png) */}
      <section className="stitch-card" aria-label="官方守護信任保障">
        <div className="stitch-pet-row">
          <strong style={{ fontSize: '14px' }}>官方守護信任保障</strong>
          <span className="stitch-list-count">全項通過</span>
        </div>
        <div className="stitch-kpi-3col">
          <div className="stitch-trust-mini">
            <strong style={{ fontSize: '12.5px' }}>無刑事紀錄</strong>
            <span className="brand-subtitle">良民證每年審核</span>
          </div>
          <div className="stitch-trust-mini">
            <strong style={{ fontSize: '12.5px' }}>獸醫助理認證</strong>
            <span className="brand-subtitle">特殊照護證照生效</span>
          </div>
          <div className="stitch-trust-mini">
            <strong style={{ fontSize: '12.5px' }}>百萬責任險</strong>
            <span className="brand-subtitle">到府專案承保中</span>
          </div>
        </div>
      </section>
    </>
  );
};
