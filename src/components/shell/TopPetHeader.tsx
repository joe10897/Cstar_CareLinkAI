/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CARELINK_ASSETS, type PetProfile } from '../../services/carelinkStore';
import { useAuth } from '../../contexts/AuthContext';

export interface TopPetHeaderProps {
  pets: PetProfile[];
  selectedPet: PetProfile;
  onSelectPet: (petId: string) => void;
  hapticEnabled: boolean;
  onToggleHaptic: () => void;
  redAlertCount?: number;
}

interface RouteHeaderMeta {
  title: string;
  subtitle?: string;
  isFgsStack?: boolean;
  isSitterPortal?: boolean;
}

function getHeaderMeta(pathname: string): RouteHeaderMeta {
  if (pathname.startsWith('/app/fgs-scan')) {
    return {
      title: 'AI 貓臉 48 點掃描',
      isFgsStack: true,
    };
  }
  if (pathname.startsWith('/app/chat')) {
    return { title: 'AI 智慧問診', subtitle: '智慧分流與照護建議' };
  }
  if (pathname.startsWith('/app/trends') || pathname.startsWith('/app/blood-test')) {
    return { title: '數據追蹤', subtitle: 'TRENDS & LABS' };
  }
  if (pathname.startsWith('/app/sitters') || pathname.startsWith('/app/sitter') || pathname.startsWith('/app/clinics')) {
    return { title: '到府保姆', subtitle: '認證照護與實況回報' };
  }
  if (pathname.startsWith('/app/profile')) {
    return { title: '毛孩檔案', subtitle: '帳號管理與健康基線' };
  }
  if (pathname.startsWith('/app/feedback')) {
    return { title: '封測回饋問卷', subtitle: '20–30 位受邀實測研究' };
  }
  if (pathname.startsWith('/admin/beta-analytics')) {
    return { title: '實測數據中心', subtitle: '20–30 位用戶行為與問卷分析' };
  }
  if (pathname.startsWith('/sitter/portal')) {
    return { title: '接案執勤大廳', subtitle: '認證到府保姆 · 執勤中', isSitterPortal: true };
  }
  if (pathname.startsWith('/admin/fgs-dataset')) {
    return { title: '48 點訓練集標註', subtitle: '獸醫師影像核對工作台' };
  }
  if (pathname.startsWith('/admin/clinic-crm')) {
    return { title: '合作醫院預審 CRM', subtitle: 'Supabase Realtime 轉診看板' };
  }
  if (pathname.startsWith('/packet/')) {
    return { title: '臨床雲端快取包', subtitle: '獸醫跨院唯讀病歷調閱' };
  }
  return { title: '日常打卡' };
}

export const TopPetHeader: React.FC<TopPetHeaderProps> = ({
  pets,
  selectedPet,
  onSelectPet,
  hapticEnabled,
  onToggleHaptic,
  redAlertCount = 0,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const path = location.pathname;
  const meta = getHeaderMeta(path);
  const isLoginRoute = path.startsWith('/login');
  const isAdminRoute = path.startsWith('/admin');
  const shortCondition = selectedPet.chronic_conditions[0]?.includes('Stage 3') ||
    selectedPet.chronic_conditions[0]?.includes('第 3 期')
    ? 'IRIS III'
    : selectedPet.chronic_conditions[0]?.includes('Stage 2') ||
      selectedPet.chronic_conditions[0]?.includes('第 2 期')
    ? 'IRIS II'
    : '健康追蹤';

  return (
    <>
      <nav className="desktop-mode-bar" aria-label="PetPulse AI 系統端點與角色切換列">
        <span className="desktop-mode-bar__label">PetPulse 工作空間切換</span>
        <Link
          to="/app/home"
          className={
            path.startsWith('/app') && !path.startsWith('/app/fgs-scan') && !path.startsWith('/app/feedback')
              ? 'desktop-mode-link is-active'
              : 'desktop-mode-link'
          }
        >
          飼主端 App
        </Link>
        <Link
          to="/app/fgs-scan"
          className={path.startsWith('/app/fgs-scan') ? 'desktop-mode-link is-active' : 'desktop-mode-link'}
        >
          48 點貓臉快篩
        </Link>
        <Link
          to="/sitter/portal"
          className={path.startsWith('/sitter') ? 'desktop-mode-link is-active' : 'desktop-mode-link'}
        >
          保姆工作台
        </Link>
        <Link
          to="/app/feedback"
          className={path.startsWith('/app/feedback') ? 'desktop-mode-link is-active' : 'desktop-mode-link'}
        >
          封測回饋問卷
        </Link>
        {isAdmin && (
          <Link
            to="/admin/beta-analytics"
            className={path.startsWith('/admin/beta-analytics') ? 'desktop-mode-link is-active' : 'desktop-mode-link'}
          >
            實測數據中心
          </Link>
        )}
        <Link
          to="/admin/fgs-dataset"
          className={path.startsWith('/admin/fgs-dataset') ? 'desktop-mode-link is-active' : 'desktop-mode-link'}
        >
          48 點標註後台
        </Link>
        <Link
          to="/admin/clinic-crm"
          className={path.startsWith('/admin/clinic-crm') ? 'desktop-mode-link is-active' : 'desktop-mode-link'}
        >
          <span>醫院預審 CRM</span>
          {redAlertCount > 0 && (
            <span className="status-chip status-chip--red mono-val">{redAlertCount}</span>
          )}
        </Link>
        {isAuthenticated ? (
          <button
            type="button"
            className="desktop-mode-link"
            onClick={() => {
              void logout().then(() => navigate('/login', { replace: true }));
            }}
          >
            {user?.display_name} · 登出
          </button>
        ) : (
          <Link
            to="/login"
            className={isLoginRoute ? 'desktop-mode-link is-active' : 'desktop-mode-link'}
          >
            登入 / 註冊
          </Link>
        )}
      </nav>

      {!isLoginRoute && !isAdminRoute && (
        <header className="stitch-top-header">
          <div className="stitch-top-header__inner">
            <div className="stitch-header-left">
              {meta.isFgsStack ? (
                <button
                  type="button"
                  className="stitch-back-btn stitch-back-btn--light"
                  aria-label="返回日常照護首頁"
                  onClick={() => navigate('/app/home')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              ) : meta.isSitterPortal ? (
                <span className="stitch-brand-emblem stitch-brand-emblem--mint" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 13.2c2.5 0 4.5 1.8 4.5 4.1 0 1.4-1 2.2-2.4 2.2H9.9c-1.4 0-2.4-.8-2.4-2.2 0-2.3 2-4.1 4.5-4.1Z" />
                    <circle cx="7.2" cy="10.2" r="1.7" />
                    <circle cx="10.5" cy="7.6" r="1.7" />
                    <circle cx="13.5" cy="7.6" r="1.7" />
                    <circle cx="16.8" cy="10.2" r="1.7" />
                  </svg>
                </span>
              ) : (
                <Link to="/app/home" className="stitch-brand-emblem" aria-label="PetPulse AI 首頁">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                    <circle cx="17.5" cy="6.5" r="2.2" fill="currentColor" />
                  </svg>
                </Link>
              )}

              <div className="stitch-header-titles">
                {meta.isSitterPortal && meta.subtitle ? (
                  <>
                    <span className="stitch-sitter-eyebrow">
                      <span className="stitch-pet-dot" aria-hidden="true" />
                      <span>{meta.subtitle}</span>
                    </span>
                    <span className="stitch-header-title">{meta.title}</span>
                  </>
                ) : (
                  <>
                    <span className="stitch-header-title">{meta.title}</span>
                    {meta.subtitle && (
                      <span className="stitch-header-sub">{meta.subtitle}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="stitch-header-right">
              {meta.isFgsStack ? (
                <button
                  type="button"
                  className="stitch-pet-trigger"
                  onClick={onToggleHaptic}
                  aria-label="切換震動與音效回饋"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="6" y="4" width="12" height="16" rx="2" />
                    <path d="M2 8v8M22 8v8" />
                  </svg>
                  <span className="mono-val">{hapticEnabled ? '震動反饋 ON' : '靜音模式'}</span>
                </button>
              ) : meta.isSitterPortal ? (
                <Link
                  to="/app/sitters"
                  className="stitch-icon-ghost"
                  aria-label="檢視飼主端到府實況通知"
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </Link>
              ) : (
                <button
                  type="button"
                  className="stitch-pet-trigger"
                  aria-expanded={dropdownOpen}
                  aria-label="切換目前檢視的毛孩成員"
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  <span
                    className={
                      shortCondition === '健康追蹤'
                        ? 'stitch-pet-dot'
                        : 'stitch-pet-dot stitch-pet-dot--warn'
                    }
                    aria-hidden="true"
                  />
                  <span className="stitch-pet-trigger__label">
                    {selectedPet.short_name || selectedPet.name}·{selectedPet.age_label?.split(' ')[0] || '8y'}·{shortCondition}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M7 15l5 5 5-5" />
                    <path d="M7 9l5-5 5 5" />
                  </svg>
                </button>
              )}

              <Link
                to="/app/profile"
                className="stitch-avatar-link"
                aria-label="開啟飼主與毛孩檔案"
                onClick={() => setDropdownOpen(false)}
              >
                <img
                  src={meta.isSitterPortal ? CARELINK_ASSETS.sitterLinAvatar : CARELINK_ASSETS.ownerAvatar}
                  alt={meta.isSitterPortal ? '認證保姆林芷晴' : '飼主個人檔案'}
                  width={34}
                  height={34}
                />
              </Link>
            </div>

            {dropdownOpen && (
              <div className="stitch-pet-dropdown" role="menu" aria-label="選擇家庭毛孩成員">
                {pets.map((pet) => {
                  const selected = pet.id === selectedPet.id;
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      className={selected ? 'stitch-pet-option is-selected' : 'stitch-pet-option'}
                      onClick={() => {
                        onSelectPet(pet.id);
                        setDropdownOpen(false);
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={pet.baseline_image_url}
                          alt=""
                          width={24}
                          height={24}
                          style={{ borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span>{pet.short_name || pet.name} ({pet.breed})</span>
                      </span>
                      <span className="mono-val">{pet.age_label || '高齡'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>
      )}
    </>
  );
};
