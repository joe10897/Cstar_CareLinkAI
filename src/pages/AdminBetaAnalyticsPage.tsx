/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, type AdminBetaSummary } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

export const AdminBetaAnalyticsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [summary, setSummary] = useState<AdminBetaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'surveys' | 'invites' | 'events'>('users');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminBetaSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法讀取測試分析數據');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void fetchSummary();
    } else {
      setLoading(false);
    }
  }, [isAdmin, fetchSummary]);

  const handleExport = async (
    dataset: 'all' | 'users' | 'surveys' | 'events' | 'fgs' | 'care' | 'blood' | 'chat',
    format: 'json' | 'csv'
  ): Promise<void> => {
    try {
      const filename = await apiClient.downloadAdminExport(dataset, format);
      setStatusMsg(`已匯出真實資料庫檔案：${filename}`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : '匯出失敗');
    }
  };

  const handleCopyInviteTemplate = async (code: string): Promise<void> => {
    const url = window.location.origin + '/login';
    const text = `誠摯邀請您參與「PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務」封測體驗！\n網址：${url}\n步驟：點選「受邀註冊」→ 輸入專屬邀請碼【${code}】→ 體驗日常打卡、上傳毛孩正面照進行 AI 臉部初篩、AI 問診，最後填寫「封測回饋」即完成！`;
    try {
      await navigator.clipboard.writeText(text);
      setStatusMsg(`已複製邀請碼 ${code} 的 LINE/社群邀請文案至剪貼簿`);
    } catch {
      setStatusMsg(`邀請碼 ${code}（請手動分享網址 ${url}）`);
    }
  };

  if (!isAdmin) {
    return (
      <section className="surface-panel">
        <h1>20–30 位用戶實測數據中心（僅限管理員）</h1>
        <p className="lead" style={{ marginTop: '8px' }}>
          目前登入帳號為 <strong className="mono-val">{user?.email || '未登入'}</strong>（權限：{user?.role || 'guest'}）。請以系統管理員帳號（<span className="mono-val">admin@petpulse.ai</span>）登入後檢視完整受測名單、操作行為軌跡與匯出 CSV/JSON 報表。
        </p>
        <div className="pet-pill-group" style={{ marginTop: '14px' }}>
          <Link to="/login" className="btn btn--primary">
            切換為管理員登入
          </Link>
          <Link to="/app/home" className="btn">
            返回飼主端
          </Link>
        </div>
      </section>
    );
  }

  const c = summary?.counts;
  const avg = summary?.surveyAverages;
  const targetBetaUsers = 30;
  const progressPct = Math.min(100, Math.round(((c?.real_testers || 0) / targetBetaUsers) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="section-header">
        <div>
          <h1>PetPulse AI 20–30 位用戶實測數據與匯出中心</h1>
          <p className="lead">
            即時彙整 Cloudflare D1 雲端資料庫中每位受邀測試者的註冊資料、真實 AI 呼叫紀錄、操作行為軌跡與 Van Westendorp 定價問卷。
          </p>
        </div>
        <div className="pet-pill-group">
          <button type="button" className="btn" onClick={() => void fetchSummary()} disabled={loading}>
            {loading ? '更新中...' : '重新整理數據'}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleExport('all', 'json')}
          >
            匯出完整 JSON 備份
          </button>
        </div>
      </div>

      {error && (
        <div className="compliance-banner" role="alert">
          <span>錯誤：{error}</span>
        </div>
      )}

      {statusMsg && (
        <div className="compliance-banner" role="status">
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Top KPI Grid */}
      <section className="surface-panel">
        <div className="section-header">
          <div>
            <h2>受邀測試進度（目標 20–30 位真實用戶）</h2>
            <p className="brand-subtitle">
              正式註冊測試者 <strong className="mono-val">{c?.real_testers ?? 0}</strong> / 30 位（另有展示沙盒 {c?.demo_users ?? 0} 位）
            </p>
          </div>
          <span className="status-chip status-chip--green mono-val">{progressPct}% 達成</span>
        </div>

        <div className="stitch-slim-track" style={{ marginBottom: '14px' }}>
          <div className="stitch-slim-fill" style={{ width: `${Math.max(4, progressPct)}%` }} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
          }}
        >
          {[
            { label: '正式受邀用戶', val: c?.real_testers ?? 0, unit: '人' },
            { label: '建檔毛孩數', val: c?.total_pets ?? 0, unit: '隻' },
            { label: 'FGS 真實 AI 紀錄', val: c?.total_fgs_records ?? 0, unit: '筆' },
            { label: '血檢 OCR 紀錄', val: c?.total_blood_records ?? 0, unit: '筆' },
            { label: 'AI 問診提問數', val: c?.total_ai_chats ?? 0, unit: '則' },
            { label: '日常照護打卡', val: c?.total_care_logs ?? 0, unit: '筆' },
            { label: '雲端上傳影像', val: c?.total_media_uploads ?? 0, unit: '張' },
            { label: '總行為軌跡事件', val: c?.total_events ?? 0, unit: '筆' },
            { label: '回饋問卷回收', val: c?.total_surveys ?? 0, unit: '份' },
          ].map((item) => (
            <div key={item.label} className="stitch-kpi-mini">
              <span className="stitch-kpi-mini__label">{item.label}</span>
              <div>
                <span className="stitch-kpi-mini__num mono-val">{item.val}</span>{' '}
                <span className="brand-subtitle">{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CSV Export Bar + Survey Averages */}
      <div className="workspace-grid">
        <section className="surface-panel">
          <h2>一鍵匯出 Excel 相容 CSV 資料表（含 UTF-8 BOM）</h2>
          <p className="brand-subtitle" style={{ marginTop: '4px', marginBottom: '12px' }}>
            直接匯入 Excel、Google Sheets 或 Python 產出 C★STAR 決賽實證圖表。
          </p>
          <div className="pet-pill-group" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--sm" onClick={() => void handleExport('users', 'csv')}>
              匯出用戶名單 CSV
            </button>
            <button type="button" className="btn btn--sm" onClick={() => void handleExport('surveys', 'csv')}>
              匯出問卷與定價 CSV
            </button>
            <button type="button" className="btn btn--sm" onClick={() => void handleExport('events', 'csv')}>
              匯出行為軌跡 CSV
            </button>
            <button type="button" className="btn btn--sm" onClick={() => void handleExport('fgs', 'csv')}>
              匯出 FGS 掃描 CSV
            </button>
            <button type="button" className="btn btn--sm" onClick={() => void handleExport('blood', 'csv')}>
              匯出血檢 OCR CSV
            </button>
            <button type="button" className="btn btn--sm" onClick={() => void handleExport('care', 'csv')}>
              匯出日常打卡 CSV
            </button>
            <button type="button" className="btn btn--sm" onClick={() => void handleExport('chat', 'csv')}>
              匯出 AI 問診 CSV
            </button>
          </div>
        </section>

        <section className="surface-panel">
          <h2>問卷量化指標與 Van Westendorp 定價均值</h2>
          <div className="ledger-list" style={{ marginTop: '8px' }}>
            <div className="ledger-row">
              <span>系統易用性 / FGS 信任度 / OCR 實用度</span>
              <strong className="mono-val">
                {avg?.usability_score ?? 0} / {avg?.fgs_trust_score ?? 0} / {avg?.ocr_helpfulness_score ?? 0}（滿分 5）
              </strong>
            </div>
            <div className="ledger-row">
              <span>平均推薦意願 (NPS 0–10)</span>
              <strong className="mono-val">{avg?.nps_score ?? 0} / 10</strong>
            </div>
            <div className="ledger-row">
              <span>Van Westendorp 甜蜜月費區間 (划算 ~ 偏貴)</span>
              <strong className="mono-val">
                NT$ {avg?.vw_bargain_ntd ?? 0} ~ NT$ {avg?.vw_expensive_ntd ?? 0} / 月
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* Tabbed Detail Inspector */}
      <section className="surface-panel">
        <div className="pet-pill-group" style={{ marginBottom: '14px' }}>
          {[
            { id: 'users' as const, label: `測試用戶總表 (${summary?.users.length ?? 0})` },
            { id: 'invites' as const, label: `30 組邀請碼派發 (${summary?.inviteCodes.length ?? 0})` },
            { id: 'surveys' as const, label: `問卷與痛點原話 (${summary?.surveys.length ?? 0})` },
            { id: 'events' as const, label: `即時操作軌跡 (${summary?.recentEvents.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'btn btn--primary btn--sm' : 'btn btn--sm'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>用戶 / Email</th>
                  <th>邀請碼 / 梯次</th>
                  <th>毛孩</th>
                  <th>打卡</th>
                  <th>FGS</th>
                  <th>血檢</th>
                  <th>AI問診</th>
                  <th>總事件</th>
                  <th>問卷</th>
                  <th>最後登入</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.users || []).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.display_name}</strong>
                      <div className="brand-subtitle mono-val">{u.email}</div>
                    </td>
                    <td>
                      <span className="engine-badge mono-val">{u.invite_code_used || 'OPEN'}</span>
                      <div className="brand-subtitle">{u.is_demo ? '展示沙盒' : u.cohort_label}</div>
                    </td>
                    <td className="num">{u.pets_count}</td>
                    <td className="num">{u.care_logs_count}</td>
                    <td className="num">{u.fgs_count}</td>
                    <td className="num">{u.blood_count}</td>
                    <td className="num">{u.chat_count}</td>
                    <td className="num">{u.events_count}</td>
                    <td>
                      <span className={u.survey_count > 0 ? 'status-chip status-chip--green' : 'status-chip status-chip--yellow'}>
                        {u.survey_count > 0 ? '已填' : '未填'}
                      </span>
                    </td>
                    <td className="num">{String(u.last_login_at).slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>邀請碼</th>
                  <th>所屬梯次</th>
                  <th>備註</th>
                  <th>已使用 / 上限</th>
                  <th>快速操作</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.inviteCodes || []).map((ic) => (
                  <tr key={ic.code}>
                    <td className="mono-val">
                      <strong>{ic.code}</strong>
                    </td>
                    <td>{ic.cohort_label}</td>
                    <td>{ic.assigned_note}</td>
                    <td className="num">
                      {ic.used_count} / {ic.max_uses}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => void handleCopyInviteTemplate(ic.code)}
                      >
                        複製邀請文案
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'surveys' && (
          <div className="ledger-list">
            {(summary?.surveys || []).length === 0 ? (
              <p className="brand-subtitle">尚未收到測試者問卷，邀請用戶造訪「/app/feedback」填寫後將即時呈現於此。</p>
            ) : (
              (summary?.surveys || []).map((s, idx) => (
                <div key={String(s.id || idx)} className="stitch-subbox">
                  <div className="stitch-pet-row">
                    <strong>
                      {String(s.display_name || '')} ({String(s.invite_code_used || 'OPEN')}) · {String(s.pet_species)} / {String(s.pet_age_group)}
                    </strong>
                    <span className="status-chip status-chip--green mono-val">
                      易用 {String(s.usability_score)}/5 · NPS {String(s.nps_score)}/10 · 划算 NT${String(s.vw_bargain_ntd)}
                    </span>
                  </div>
                  <p style={{ marginTop: '4px' }}>
                    <strong>最喜歡功能：</strong>
                    {String(s.most_useful_feature || '')}（訂閱意願：{String(s.willing_to_subscribe || '')}）
                  </p>
                  {Boolean(s.pain_point_quote) && (
                    <p style={{ marginTop: '4px' }}>
                      <strong>痛點原話：</strong>「{String(s.pain_point_quote)}」
                    </p>
                  )}
                  {Boolean(s.improvement_suggestion) && (
                    <p className="brand-subtitle" style={{ marginTop: '4px' }}>
                      建議：{String(s.improvement_suggestion)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>時間 (UTC)</th>
                  <th>用戶</th>
                  <th>事件類型</th>
                  <th>頁面路徑</th>
                  <th>明細 Metadata</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.recentEvents || []).map((ev) => (
                  <tr key={ev.id}>
                    <td className="num">{ev.created_at.slice(0, 19).replace('T', ' ')}</td>
                    <td>
                      {ev.display_name} <span className="brand-subtitle">({ev.invite_code_used || '-'})</span>
                    </td>
                    <td className="mono-val">{ev.event_type}</td>
                    <td className="mono-val">{ev.page_path}</td>
                    <td className="mono-val" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.metadata_json}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
