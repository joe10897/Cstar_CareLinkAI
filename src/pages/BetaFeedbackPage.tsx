/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, type BetaFeedbackPayload } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

export interface BetaFeedbackPageProps {
  onTriggerTap: () => void;
  onTriggerConfirm: () => void;
  onNotify: (msg: string, detail?: string) => void;
}

const FEATURES = [
  'AI 48點臉部疼痛初篩',
  '跨院紙本血檢 OCR 數位化',
  'AI 結合病歷智慧分流問診',
  '日常飲水／食慾／皮下輸液打卡',
  '獸醫唯讀轉診摘要包 (QR/連結)',
];

export const BetaFeedbackPage: React.FC<BetaFeedbackPageProps> = ({
  onTriggerTap,
  onTriggerConfirm,
  onNotify,
}) => {
  const navigate = useNavigate();
  const { user, markSurveySubmitted } = useAuth();

  const [form, setForm] = useState<BetaFeedbackPayload>({
    pet_species: 'cat',
    pet_age_group: '7-11歲熟齡',
    has_chronic_disease: false,
    usability_score: 5,
    fgs_trust_score: 4,
    ocr_helpfulness_score: 5,
    nps_score: 9,
    vw_too_cheap_ntd: 49,
    vw_bargain_ntd: 99,
    vw_expensive_ntd: 199,
    vw_too_expensive_ntd: 299,
    most_useful_feature: FEATURES[0],
    pain_point_quote: '',
    improvement_suggestion: '',
    willing_to_subscribe: 'yes_149',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousSubmissions, setPreviousSubmissions] = useState<Array<Record<string, unknown>>>([]);
  const [submittedOk, setSubmittedOk] = useState(false);

  useEffect(() => {
    void apiClient
      .getMyBetaFeedback()
      .then((res) => setPreviousSubmissions(res.surveys || []))
      .catch(() => null);
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    onTriggerTap();
    try {
      const res = await apiClient.submitBetaFeedback(form);
      setSubmittedOk(true);
      markSurveySubmitted();
      setPreviousSubmissions((prev) => [{ id: res.id, created_at: res.created_at, ...form }, ...prev]);
      onTriggerConfirm();
      onNotify('感謝完成封測回饋問卷！', '您的回覆與定價評估已加密儲存至雲端研究資料庫');
    } catch (err) {
      onNotify('送出失敗，請稍後再試', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="stitch-hero-fgs" aria-labelledby="beta-survey-heading">
        <div className="stitch-hero-fgs__top">
          <div>
            <span className="stitch-hero-fgs__chip mono-val">BETA COHORT FEEDBACK · N=20~30</span>
            <h1 id="beta-survey-heading" className="stitch-hero-fgs__title">
              受邀測試者體驗與定價回饋
            </h1>
            <p className="stitch-hero-fgs__desc">
              您的真實操作意見與定價區間將直接用於優化 PetPulse AI 並作為產品實證統計（約需 90 秒）。
            </p>
          </div>
        </div>
        <div className="stitch-hero-fgs__bottom">
          <span className="stitch-hero-fgs__status mono-val">
            <span className="stitch-hero-dot" aria-hidden="true" />
            <span>
              受訪帳號：{user?.display_name || '測試飼主'}
              {user?.invite_code_used ? ` · 邀請碼 ${user.invite_code_used}` : ''}
            </span>
          </span>
          {previousSubmissions.length > 0 && (
            <span className="status-chip status-chip--green">已填寫 {previousSubmissions.length} 次</span>
          )}
        </div>
      </section>

      {submittedOk && (
        <section className="stitch-card" role="status">
          <div className="stitch-pet-row">
            <strong>感謝您的寶貴回饋！問卷已成功入庫</strong>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/app/home')}>
              返回首頁
            </button>
          </div>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {/* Part 1: Pet background */}
        <section className="stitch-card">
          <h2 style={{ fontSize: '15px', fontWeight: 700 }}>1. 飼養背景</h2>

          <div className="split-grid-2">
            <label className="stitch-subbox">
              <span className="brand-subtitle">家中毛孩物種</span>
              <select
                className="select-field"
                value={form.pet_species}
                onChange={(e) => setForm((f) => ({ ...f, pet_species: e.target.value }))}
              >
                <option value="cat">貓咪</option>
                <option value="dog">狗狗</option>
                <option value="both">貓狗皆有</option>
              </select>
            </label>

            <label className="stitch-subbox">
              <span className="brand-subtitle">主要照顧毛孩年齡層</span>
              <select
                className="select-field"
                value={form.pet_age_group}
                onChange={(e) => setForm((f) => ({ ...f, pet_age_group: e.target.value }))}
              >
                <option value="0-6歲成年前">0–6 歲（青壯年）</option>
                <option value="7-11歲熟齡">7–11 歲（熟齡期）</option>
                <option value="12歲以上高齡">12 歲以上（高齡照護）</option>
              </select>
            </label>
          </div>

          <label className="ledger-row">
            <span>目前是否有慢性病追蹤需求（如腎病 CKD、心臟病、關節炎、口腔問題）</span>
            <input
              type="checkbox"
              checked={form.has_chronic_disease}
              onChange={(e) => setForm((f) => ({ ...f, has_chronic_disease: e.target.checked }))}
            />
          </label>
        </section>

        {/* Part 2: Experience & AI trust */}
        <section className="stitch-card">
          <h2 style={{ fontSize: '15px', fontWeight: 700 }}>2. 實際操作體驗評分</h2>

          {[
            { key: 'usability_score' as const, label: '整體介面直覺與流暢度（1=很難用，5=非常流暢）' },
            { key: 'fgs_trust_score' as const, label: 'AI 48 點臉部疼痛初篩與視覺說明信任度（1–5 分）' },
            { key: 'ocr_helpfulness_score' as const, label: '跨院血檢 OCR 與雙軌趨勢圖實用性（1–5 分）' },
          ].map((item) => (
            <div key={item.key} className="stitch-subbox">
              <div className="stitch-pet-row">
                <span className="brand-subtitle">{item.label}</span>
                <strong className="mono-val">{form[item.key]} / 5</strong>
              </div>
              <div className="pet-pill-group">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={form[item.key] === score ? 'btn btn--primary btn--sm' : 'btn btn--sm'}
                    onClick={() => {
                      onTriggerTap();
                      setForm((f) => ({ ...f, [item.key]: score }));
                    }}
                  >
                    {score} 分
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="stitch-subbox">
            <div className="stitch-pet-row">
              <span className="brand-subtitle">您有多願意將 PetPulse AI 推薦給其他毛孩飼主？（NPS 0–10）</span>
              <strong className="mono-val">{form.nps_score} / 10</strong>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={form.nps_score}
              onChange={(e) => setForm((f) => ({ ...f, nps_score: Number(e.target.value) }))}
            />
          </div>

          <label className="stitch-subbox">
            <span className="brand-subtitle">操作完後，您覺得最有價值的單一功能是？</span>
            <select
              className="select-field"
              value={form.most_useful_feature}
              onChange={(e) => setForm((f) => ({ ...f, most_useful_feature: e.target.value }))}
            >
              {FEATURES.map((feat) => (
                <option key={feat} value={feat}>
                  {feat}
                </option>
              ))}
            </select>
          </label>
        </section>

        {/* Part 3: Van Westendorp Pricing Sensitivity */}
        <section className="stitch-card">
          <h2 style={{ fontSize: '15px', fontWeight: 700 }}>
            3. 月費定價接受度（Van Westendorp 價格測試，單位：NT$/月）
          </h2>
          <p className="brand-subtitle">
            假設包含無限次 AI 臉部疼痛初篩、跨院血檢 OCR 雲端追蹤與 AI 問診分流，請填入您心中的月費價格：
          </p>

          <div className="stitch-bento-2col">
            <label className="stitch-subbox">
              <span className="brand-subtitle">太便宜（會懷疑品質）NT$</span>
              <input
                type="number"
                min={0}
                max={2000}
                className="input-field mono-val"
                value={form.vw_too_cheap_ntd}
                onChange={(e) => setForm((f) => ({ ...f, vw_too_cheap_ntd: Number(e.target.value) }))}
              />
            </label>

            <label className="stitch-subbox">
              <span className="brand-subtitle">划算且非常願意買單 NT$</span>
              <input
                type="number"
                min={0}
                max={2000}
                className="input-field mono-val"
                value={form.vw_bargain_ntd}
                onChange={(e) => setForm((f) => ({ ...f, vw_bargain_ntd: Number(e.target.value) }))}
              />
            </label>

            <label className="stitch-subbox">
              <span className="brand-subtitle">開始覺得偏貴但仍考慮 NT$</span>
              <input
                type="number"
                min={0}
                max={3000}
                className="input-field mono-val"
                value={form.vw_expensive_ntd}
                onChange={(e) => setForm((f) => ({ ...f, vw_expensive_ntd: Number(e.target.value) }))}
              />
            </label>

            <label className="stitch-subbox">
              <span className="brand-subtitle">太貴絕對不會購買 NT$</span>
              <input
                type="number"
                min={0}
                max={5000}
                className="input-field mono-val"
                value={form.vw_too_expensive_ntd}
                onChange={(e) => setForm((f) => ({ ...f, vw_too_expensive_ntd: Number(e.target.value) }))}
              />
            </label>
          </div>

          <label className="stitch-subbox">
            <span className="brand-subtitle">若正式版定價 NT$ 149/月，您的訂閱意願？</span>
            <select
              className="select-field"
              value={form.willing_to_subscribe}
              onChange={(e) => setForm((f) => ({ ...f, willing_to_subscribe: e.target.value }))}
            >
              <option value="yes_149">願意訂閱（NT$ 149/月 可接受）</option>
              <option value="yes_99">若為 NT$ 99/月 以內會訂閱</option>
              <option value="free_only">希望先使用免費基本版</option>
              <option value="no">暫無付費需求</option>
            </select>
          </label>
        </section>

        {/* Part 4: Qualitative Quotes */}
        <section className="stitch-card">
          <h2 style={{ fontSize: '15px', fontWeight: 700 }}>4. 真實照護痛點與改進建議</h2>

          <label className="stitch-subbox">
            <span className="brand-subtitle">您照顧毛孩最常遇到的困擾是什麼？（例：半夜不確定該不該衝急診、血檢單散落各家醫院…）</span>
            <textarea
              className="input-field"
              rows={3}
              value={form.pain_point_quote}
              onChange={(e) => setForm((f) => ({ ...f, pain_point_quote: e.target.value }))}
              placeholder="請分享您真實遇過的照護經驗..."
            />
          </label>

          <label className="stitch-subbox">
            <span className="brand-subtitle">今天實測 PetPulse AI 覺得哪個畫面或 AI 結果可以做得更好？</span>
            <textarea
              className="input-field"
              rows={3}
              value={form.improvement_suggestion}
              onChange={(e) => setForm((f) => ({ ...f, improvement_suggestion: e.target.value }))}
              placeholder="例如：希望多增設狗狗關節炎步態影片、提醒推播..."
            />
          </label>

          <button
            type="submit"
            className="btn btn--primary btn--lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? '寫入雲端研究中...' : '送出封測回饋問卷'}
          </button>
        </section>
      </form>
    </>
  );
};
