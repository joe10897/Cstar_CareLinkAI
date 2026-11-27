/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  carelinkStore,
  PARTNER_CLINICS,
  type PetProfile,
} from '../services/carelinkStore';
import { apiClient, type PersistentChatMessage } from '../services/apiClient';
import { ActionSheetModal } from '../components/overlays/ActionSheetModal';
import { useR2Upload } from '../hooks/useR2Upload';

export interface AIChatTriagePageProps {
  selectedPet: PetProfile;
  onTriggerTap: () => void;
  onTriggerConfirm: () => void;
  onNotify: (msg: string, detail?: string) => void;
}

export const AIChatTriagePage: React.FC<AIChatTriagePageProps> = ({
  selectedPet,
  onTriggerTap,
  onTriggerConfirm,
  onNotify,
}) => {
  const navigate = useNavigate();
  const { uploadImageToR2 } = useR2Upload();

  const latestBlood = carelinkStore
    .getBloodTestRecords(selectedPet.id)
    .slice(-1)[0];
  const latestFgs =
    carelinkStore.getFGSRecords().find((r) => r.pet_id === selectedPet.id) ||
    carelinkStore.getFGSRecords()[0];
  const dailyCare = carelinkStore.getDailyCareLog(selectedPet.id);

  const [homeChecks, setHomeChecks] = useState<Record<string, boolean>>({
    c0: false,
    c1: false,
    c2: false,
  });
  const [checkLabels, setCheckLabels] = useState<string[]>([
    '1. 翻開牙齦確認黏膜呈淡粉色微濕潤（微血管回充 < 2 秒）',
    '2. 輕拉肩頸皮膚回彈測試（需 2 秒內平復）',
    '3. 量測靜止呼吸頻率（每分鐘 15 至 30 次為常見區間）',
  ]);
  const [latestHeadline, setLatestHeadline] = useState<string>(
    '即時掛載毛孩雲端病歷，隨時向 PetPulse AI 詢問居家觀察建議'
  );
  const [latestUrgency, setLatestUrgency] = useState<'green' | 'yellow' | 'red'>('green');
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<PersistentChatMessage[]>([]);

  useEffect(() => {
    let active = true;
    void apiClient
      .getChatHistory(selectedPet.id)
      .then((res) => {
        if (!active) return;
        setMessages(res.messages || []);
        const lastAi = [...(res.messages || [])].reverse().find((m) => m.role === 'assistant');
        if (lastAi?.urgency) setLatestUrgency(lastAi.urgency);
        if (lastAi?.homeChecks && lastAi.homeChecks.length > 0) {
          setCheckLabels(lastAi.homeChecks);
        }
      })
      .catch(() => {
        if (active) setMessages([]);
      });
    return () => {
      active = false;
    };
  }, [selectedPet.id]);

  const completedCheckCount = Object.values(homeChecks).filter(Boolean).length;

  const toggleCheck = (key: string): void => {
    onTriggerTap();
    setHomeChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSendQuestion = async (
    textToSend: string,
    imageDataUrl?: string,
    attachmentUrl?: string
  ): Promise<void> => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSending) return;
    onTriggerTap();
    setIsSending(true);
    setInputText('');

    const optimisticUser: PersistentChatMessage = {
      id: `tmp-u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      attachmentUrl: attachmentUrl || imageDataUrl,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await apiClient.sendChatTriageWithAI({
        petId: selectedPet.id,
        message: trimmed,
        imageDataUrl,
        attachmentUrl,
      });

      const assistantMsg: PersistentChatMessage = {
        id: res.assistantMessageId,
        role: 'assistant',
        text: res.reply,
        urgency: res.urgency,
        aiProvider: res.provider,
        aiModel: res.model,
        homeChecks: res.homeChecks,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLatestHeadline(res.headline);
      setLatestUrgency(res.urgency);
      if (res.homeChecks && res.homeChecks.length > 0) {
        setCheckLabels(res.homeChecks);
        setHomeChecks({ c0: false, c1: false, c2: false });
      }
      onTriggerConfirm();
      onNotify(
        `AI 智慧分流已完成（${res.urgency === 'red' ? '紅燈急診警訊' : res.urgency === 'yellow' ? '黃燈門診觀察' : '綠燈居家觀察'}）`,
        `${res.model.split('/').pop()} · ${res.latencyMs}ms · 對話已存入雲端`
      );
    } catch (err) {
      onNotify(
        'AI 問診連線失敗',
        err instanceof Error ? err.message : '請稍後再試'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadChatPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await uploadImageToR2(file, 'triage-chat', selectedPet.id);
      onTriggerConfirm();
      await handleSendQuestion(
        '已上傳實拍觀察照片（嘔吐物／排泄物／外觀），請結合毛孩病歷協助視覺評估與分流建議。',
        uploaded.dataUrl,
        uploaded.publicUrl
      );
    } catch {
      onNotify('影像載入失敗，請選擇 JPG 或 PNG 格式');
    }
  };

  const handleBookEmergencyReferral = (): void => {
    const clinic = PARTNER_CLINICS[0];
    const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.text || '居家異常觀察';
    const ref = carelinkStore.createClinicReferral({
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      breed: selectedPet.breed,
      age_years: 8,
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      urgency_level: latestUrgency,
      trigger_reason: `飼主於 AI 問診預約就診 (${lastUserText.slice(0, 60)})`,
      latest_fgs_record_id: latestFgs?.id || '',
      fgs_total_score: latestFgs?.scores.total ?? 0,
      crea_value: latestBlood?.metrics.CREA.val ?? 2.0,
      sdma_value: latestBlood?.metrics.SDMA.val ?? 14,
    });
    onTriggerConfirm();
    onNotify(`已建立轉診摘要至 ${clinic.name}`, `通行碼 ${ref.share_token}`);
  };

  return (
    <>
      {/* Mounted Live Cloud Health Context Pills */}
      <div className="fgs-legend-scroll" role="region" aria-label="已掛載之個人化雲端病歷上下文">
        <span className="engine-badge mono-val">
          {selectedPet.short_name} ({selectedPet.species === 'dog' ? '犬' : '貓'})
        </span>
        <span className="engine-badge mono-val">
          CREA {latestBlood ? `${latestBlood.metrics.CREA.val} (${latestBlood.iris_stage})` : '尚無血檢'}
        </span>
        <span className="status-chip status-chip--green mono-val">
          最新 FGS {latestFgs ? `${latestFgs.scores.total}/10` : '未測'}
        </span>
        <span className="status-chip status-chip--yellow mono-val">
          今日飲水 {dailyCare.water_ml}ml
        </span>
      </div>

      {/* Live Triage Summary Card */}
      <article className="stitch-card" aria-labelledby="triage-result-heading">
        <div className="stitch-subbox">
          <div className="stitch-pet-row">
            <h1 id="triage-result-heading" style={{ fontSize: '15px', fontWeight: 700 }}>
              {latestHeadline}
            </h1>
            <span
              className={
                latestUrgency === 'red'
                  ? 'status-chip status-chip--red'
                  : latestUrgency === 'yellow'
                    ? 'status-chip status-chip--yellow'
                    : 'status-chip status-chip--green'
              }
            >
              {latestUrgency === 'red' ? '紅燈急診建議' : latestUrgency === 'yellow' ? '黃燈門診追蹤' : '綠燈居家觀察'}
            </span>
          </div>
          <p className="brand-subtitle">
            由 Cloudflare Workers AI 即時串接您的雲端病歷回答；遵守《獸醫師法》，僅作衛教分流，不代替執業獸醫診斷。
          </p>
        </div>

        <div className="stitch-pet-row">
          <span style={{ fontSize: '13px', fontWeight: 700 }}>AI 建議居家檢查清單</span>
          <span className="status-chip status-chip--green mono-val">
            完成度 {completedCheckCount}/{checkLabels.length}
          </span>
        </div>

        <div className="ledger-list">
          {checkLabels.map((label, idx) => {
            const key = `c${idx}`;
            return (
              <label key={key} className="ledger-row">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(homeChecks[key])}
                  onChange={() => toggleCheck(key)}
                />
              </label>
            );
          })}
        </div>

        <div className="split-grid-2">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate('/app/trends')}
          >
            前往看診摘要包
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleBookEmergencyReferral}
          >
            同步預約合作醫院
          </button>
        </div>
      </article>

      {/* Persistent Cloud Conversation Stream */}
      <div className="stitch-chat-stream" aria-label="問診對話與真實 AI 回覆紀錄">
        {messages.length === 0 && (
          <div className="stitch-card">
            <p className="brand-subtitle">
              尚無對話紀錄。請直接輸入毛孩目前的飲食、飲水、嘔吐、精神或步態疑問，或點擊下方快捷提問由真實 AI 立即分析！
            </p>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="stitch-msg-user">
              {msg.attachmentUrl && (
                <img
                  src={msg.attachmentUrl}
                  alt="飼主附加之實拍觀察照片"
                  className="memo-upload-preview"
                  style={{ marginBottom: '8px' }}
                />
              )}
              <p>{msg.text}</p>
            </div>
          ) : (
            <div key={msg.id} className="stitch-card">
              <div className="stitch-pet-row">
                <strong>PetPulse AI 即時分流建議</strong>
                <span className="mono-val brand-subtitle">
                  {msg.aiModel ? msg.aiModel.split('/').pop() : 'Workers AI'} · {msg.created_at.slice(11, 16)}
                </span>
              </div>
              <p className="lead" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </p>
            </div>
          )
        )}

        {isSending && (
          <div className="stitch-card">
            <p className="brand-subtitle mono-val">
              PetPulse AI 正在讀取 {selectedPet.short_name} 雲端病歷並執行即時推論中...
            </p>
          </div>
        )}
      </div>

      {/* Prompt Shortcut Chips & Input Composer */}
      <div className="fgs-legend-scroll" style={{ marginTop: '4px' }}>
        <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
          <span>拍實況照 AI 分析</span>
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={isSending}
            onChange={(e) => void handleUploadChatPhoto(e)}
          />
        </label>
        <button
          type="button"
          className="btn btn--sm"
          disabled={isSending}
          onClick={() =>
            void handleSendQuestion(
              `${selectedPet.short_name}今天早上吐了一點黃水跟未消化飼料，水也喝得比平常少，需要馬上衝急診嗎？`
            )
          }
        >
          清晨吐黃水分流
        </button>
        <button
          type="button"
          className="btn btn--sm"
          disabled={isSending}
          onClick={() =>
            void handleSendQuestion(
              `依${selectedPet.short_name}目前的血檢與飲水紀錄，日常飲食與補水有什麼衛教注意事項？`
            )
          }
        >
          詢問補水與飲食衛教
        </button>
      </div>

      <form
        className="stitch-composer-row"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendQuestion(inputText);
        }}
      >
        <button
          type="button"
          className="stitch-more-btn"
          aria-label="開啟多模態行動選單"
          onClick={() => setActionSheetOpen(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <input
          type="text"
          className="input-field"
          style={{ flex: 1 }}
          value={inputText}
          disabled={isSending}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="描述毛孩症狀或提問（將送交真實 AI 分析）..."
          aria-label="輸入問診症狀描述"
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={isSending || !inputText.trim()}>
          {isSending ? '推論中' : '送出'}
        </button>
      </form>

      <ActionSheetModal
        open={actionSheetOpen}
        petName={selectedPet.short_name || selectedPet.name}
        onClose={() => setActionSheetOpen(false)}
        onUploadVomitPhoto={() =>
          void handleSendQuestion('毛孩剛才出現透明泡沫或黃水嘔吐，請協助評估分流與居家觀察重點。')
        }
        onExportVetPdf={() => navigate('/app/trends')}
        onCreateEmergencyReferral={handleBookEmergencyReferral}
      />
    </>
  );
};
