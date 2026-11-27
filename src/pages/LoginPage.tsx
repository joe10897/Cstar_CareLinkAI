/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export interface LoginPageProps {
  onTriggerTap: () => void;
  onTriggerConfirm: () => void;
  onNotify: (msg: string, detail?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onTriggerTap,
  onTriggerConfirm,
  onNotify,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, startDemo } = useAuth();

  const redirectTo =
    (location.state as { from?: string } | null)?.from || '/app/home';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('PETPULSE2026');
  const [role, setRole] = useState<'owner' | 'sitter'>('owner');
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState<'cat' | 'dog'>('cat');
  const [petBreed, setPetBreed] = useState('');
  const [petAgeLabel, setPetAgeLabel] = useState('7y');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    onTriggerTap();
    try {
      const user = await login(email.trim(), password);
      onTriggerConfirm();
      onNotify(
        `歡迎回來，${user.display_name}`,
        user.role === 'admin'
          ? '已載入管理員權限與測試者數據分析後台'
          : '已從 Cloudflare D1 同步您的毛孩健康病歷'
      );
      if (user.role === 'admin') {
        navigate('/admin/beta-analytics', { replace: true });
      } else if (user.role === 'sitter') {
        navigate('/sitter/portal', { replace: true });
      } else {
        navigate(redirectTo === '/login' ? '/app/home' : redirectTo, { replace: true });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '登入失敗，請檢查帳號密碼');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    onTriggerTap();
    try {
      const user = await register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || email.split('@')[0],
        inviteCode: inviteCode.trim() || undefined,
        role,
        petName: petName.trim() || undefined,
        petSpecies,
        petBreed: petBreed.trim() || undefined,
        petAgeLabel: petAgeLabel.trim() || '7y',
      });
      onTriggerConfirm();
      onNotify(
        `註冊完成！歡迎加入 PetPulse AI 封測`,
        `帳號 ${user.email} 已建立，所有操作將同步至雲端資料庫`
      );
      navigate(user.role === 'sitter' ? '/sitter/portal' : '/app/home', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '註冊失敗，請檢查輸入資料');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoStart = async (demoRole: 'owner' | 'sitter'): Promise<void> => {
    setErrorMsg(null);
    setIsSubmitting(true);
    onTriggerTap();
    try {
      const user = await startDemo(demoRole);
      onTriggerConfirm();
      onNotify(
        demoRole === 'sitter' ? '已啟動認證保姆展示沙盒' : '已啟動獨立體驗帳號（含咪寶／拿鐵／圓圓）',
        `體驗編號 ${user.display_name}，可完整測試真實 AI 模型`
      );
      navigate(demoRole === 'sitter' ? '/sitter/portal' : '/app/home', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '體驗帳號啟動失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stitch-login-stage">
      {/* Brand Header */}
      <section className="stitch-login-hero" aria-labelledby="login-brand-heading">
        <div className="stitch-login-emblem" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
          </svg>
        </div>

        <div className="stitch-login-brand-row">
          <strong className="stitch-login-brand">PetPulse AI</strong>
          <span className="stitch-pet-dot" aria-hidden="true" />
          <span className="brand-subtitle">全齡犬貓健康生態微服務</span>
        </div>

        <h1 id="login-brand-heading" className="stitch-login-title">
          全齡犬貓疼痛視覺初篩
          <br />
          雲端實測與真實 AI 驗證版
        </h1>

        <p className="brand-subtitle">
          48 點視覺初篩 ‧ 紙本血檢 OCR ‧ 雲端病歷同步 ‧ 20–30 位飼主封測計畫
        </p>

        <span className="stitch-engine-pill mono-val">
          <span className="stitch-pet-dot" aria-hidden="true" />
          <span>Cloudflare D1 + Workers AI Vision 連線中</span>
        </span>
      </section>

      {/* Mode Tabs + Auth Card */}
      <section className="stitch-card" aria-label="帳號登入與受邀測試註冊">
        <div className="stitch-seg-tabs" role="tablist" aria-label="切換登入或受邀註冊">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'stitch-seg-btn is-active' : 'stitch-seg-btn'}
            onClick={() => {
              onTriggerTap();
              setErrorMsg(null);
              setMode('login');
            }}
          >
            帳號登入
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'stitch-seg-btn is-active' : 'stitch-seg-btn'}
            onClick={() => {
              onTriggerTap();
              setErrorMsg(null);
              setMode('register');
            }}
          >
            受邀註冊（新用戶）
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="stitch-subbox"
            style={{
              borderColor: 'var(--color-status-alert)',
              backgroundColor: '#FEF2F2',
              color: '#991B1B',
            }}
          >
            <strong>驗證提醒：</strong> {errorMsg}
          </div>
        )}

        {mode === 'login' ? (
          <form
            onSubmit={handleLoginSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <label className="stitch-subbox">
              <span className="brand-subtitle">電子信箱 Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>

            <label className="stitch-subbox">
              <span className="brand-subtitle">密碼</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼（至少 6 碼）"
              />
            </label>

            <button
              type="submit"
              className="btn btn--primary btn--lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? '驗證登入並同步雲端病歷...' : '登入 PetPulse AI'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleRegisterSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <div className="split-grid-2">
              <label className="stitch-subbox">
                <span className="brand-subtitle">您的暱稱 *</span>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例：王小明"
                />
              </label>

              <label className="stitch-subbox">
                <span className="brand-subtitle">測試邀請碼（如 PETPULSE2026 / PP-01）</span>
                <input
                  type="text"
                  className="input-field mono-val"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="PETPULSE2026"
                />
              </label>
            </div>

            <label className="stitch-subbox">
              <span className="brand-subtitle">電子信箱 Email *</span>
              <input
                type="email"
                required
                autoComplete="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tester@example.com"
              />
            </label>

            <div className="split-grid-2">
              <label className="stitch-subbox">
                <span className="brand-subtitle">設定密碼（至少 6 碼）*</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                />
              </label>

              <label className="stitch-subbox">
                <span className="brand-subtitle">使用身分</span>
                <select
                  className="select-field"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'owner' | 'sitter')}
                >
                  <option value="owner">飼主（記錄毛孩日常與 AI 快篩）</option>
                  <option value="sitter">認證到府保姆（接案回報）</option>
                </select>
              </label>
            </div>

            {/* Optional instant first pet setup */}
            <div
              className="stitch-subbox"
              style={{
                backgroundColor: 'var(--color-paper-2)',
                borderStyle: 'dashed',
                gap: '8px',
              }}
            >
              <strong style={{ fontSize: '13px' }}>建立您的第一位毛孩檔案（選填，登入後亦可新增）</strong>
              <div className="split-grid-2">
                <input
                  type="text"
                  className="input-field"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="毛孩名字（例：豆花）"
                  aria-label="毛孩名字"
                />
                <select
                  className="select-field"
                  value={petSpecies}
                  onChange={(e) => setPetSpecies(e.target.value as 'cat' | 'dog')}
                  aria-label="毛孩物種"
                >
                  <option value="cat">貓咪（Cat）</option>
                  <option value="dog">狗狗（Dog）</option>
                </select>
              </div>
              <div className="split-grid-2">
                <input
                  type="text"
                  className="input-field"
                  value={petBreed}
                  onChange={(e) => setPetBreed(e.target.value)}
                  placeholder="品種（例：橘貓米克斯 / 柴犬）"
                  aria-label="毛孩品種"
                />
                <input
                  type="text"
                  className="input-field mono-val"
                  value={petAgeLabel}
                  onChange={(e) => setPetAgeLabel(e.target.value)}
                  placeholder="年齡（例：9y）"
                  aria-label="毛孩年齡"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? '建立雲端帳號與毛孩檔案中...' : '完成註冊並進入系統'}
            </button>
          </form>
        )}
      </section>

      {/* One-Click Demo Sandbox */}
      <section className="stitch-login-actions" aria-label="快速展示沙盒入口">
        <button
          type="button"
          className="stitch-google-card"
          disabled={isSubmitting}
          onClick={() => void handleDemoStart('owner')}
        >
          <span
            className="stitch-google-card__icon"
            style={{ background: 'var(--color-brand-primary)', color: '#fff', borderRadius: '10px' }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </span>
          <span className="stitch-auth-card__copy">
            <strong>一鍵展示體驗（免填註冊）</strong>
            <span>自動建立獨立沙盒帳號，預載咪寶／拿鐵／圓圓示範病歷</span>
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2.2" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <div className="stitch-login-links">
          <button
            type="button"
            className="stitch-text-link"
            disabled={isSubmitting}
            onClick={() => void handleDemoStart('sitter')}
          >
            保姆工作台體驗
          </button>
          <span className="stitch-login-divider" aria-hidden="true" />
          <button
            type="button"
            className="stitch-text-link"
            onClick={() => {
              setMode('login');
              setEmail('admin@petpulse.ai');
              onNotify('管理員請輸入 admin@petpulse.ai 與管理員密碼登入');
            }}
          >
            團隊管理員後台登入
          </button>
        </div>
      </section>

      {/* Trust & Data Notice */}
      <div className="stitch-card">
        <div className="stitch-pet-row">
          <span className="stitch-trust-inline">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-status-safe)" strokeWidth="2.1" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span className="brand-subtitle">
              PBKDF2 加密認證 ‧ 所有測試紀錄自動保存於 Cloudflare D1 雲端資料庫
            </span>
          </span>
        </div>
      </div>

      <footer className="stitch-login-footer">
        <p>符合台灣《獸醫師法》規範：本服務僅供居家初篩與照護紀錄，不構成獸醫醫療診斷</p>
        <p className="mono-val">PetPulse AI Beta Study 2026 · TLS 1.3</p>
      </footer>
    </div>
  );
};
