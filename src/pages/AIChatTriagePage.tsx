/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  carelinkStore,
  PARTNER_CLINICS,
  type PetProfile,
} from '../services/carelinkStore';
import { ActionSheetModal } from '../components/overlays/ActionSheetModal';
import { useR2Upload } from '../hooks/useR2Upload';

export interface AIChatTriagePageProps {
  selectedPet: PetProfile;
  onTriggerTap: () => void;
  onTriggerConfirm: () => void;
  onNotify: (msg: string, detail?: string) => void;
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  text: string;
  urgency?: 'green' | 'yellow' | 'red';
  attachmentUrl?: string;
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
    gum_crt: false,
    skin_turgor: false,
    resp_rate: false,
  });
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'msg-1',
      role: 'user',
      timestamp: '08:42',
      text: `${selectedPet.short_name || selectedPet.name}今天早上吐了一點黃水跟未消化乾乾，而且水喝得比平時少，需要馬上看醫生嗎？`,
    },
  ]);

  const completedCheckCount = Object.values(homeChecks).filter(Boolean).length;

  const toggleCheck = (key: string): void => {
    onTriggerTap();
    setHomeChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSendQuestion = (textToSend: string, photoUrl?: string): void => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;
    onTriggerTap();

    const userMsg: ChatMessageItem = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toTimeString().slice(0, 5),
      text: trimmed,
      attachmentUrl: photoUrl,
    };

    const isRedKeyword = /喘|癱軟|抽搐|吐血|尿不出|拒食超過/.test(trimmed);
    const replyUrgency: 'green' | 'yellow' | 'red' = isRedKeyword ? 'red' : 'yellow';
    const aiMsg: ChatMessageItem = {
      id: `msg-a-${Date.now() + 1}`,
      role: 'assistant',
      timestamp: new Date().toTimeString().slice(0, 5),
      urgency: replyUrgency,
      text: isRedKeyword
        ? `偵測到急性高風險徵兆。結合目前 CREA ${latestBlood?.metrics.CREA.val ?? 2.3} mg/dL 與 FGS ${latestFgs?.scores.total ?? 0}/10，建議立即前往合作 24 小時急診醫院進行檢查。`
        : `結合 ${selectedPet.short_name || selectedPet.name} 近期 CREA ${latestBlood?.metrics.CREA.val ?? 2.3} mg/dL 與今日飲水 ${dailyCare.water_ml}ml 分析：清晨黃白泡沫多與空腹胃酸刺激相關，建議維持補水並依序完成下方 3 項居家測試。`,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInputText('');
  };

  const handleUploadChatPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await uploadImageToR2(file, 'triage-chat', selectedPet.id);
      onTriggerConfirm();
      handleSendQuestion('已上傳嘔吐物與排泄物實拍影像，請協助評估分流等級。', uploaded.dataUrl);
      onNotify('影像已透過 R2 載入問診室', uploaded.r2ObjectKey);
    } catch {
      onNotify('影像載入失敗，請選擇 JPG 或 PNG 格式');
    }
  };

  const handleBookEmergencyReferral = (): void => {
    const clinic = PARTNER_CLINICS[0];
    const ref = carelinkStore.createClinicReferral({
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      breed: selectedPet.breed,
      age_years: 8,
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      urgency_level: 'yellow',
      trigger_reason: `飼主於 AI 智慧問診預約就診觀察 (${messages[0]?.text.slice(0, 28)})`,
      latest_fgs_record_id: latestFgs?.id || 'fgs-rec-101',
      fgs_total_score: latestFgs?.scores.total ?? 1,
      crea_value: latestBlood?.metrics.CREA.val ?? 2.3,
      sdma_value: latestBlood?.metrics.SDMA.val ?? 14,
    });
    onTriggerConfirm();
    onNotify(`已轉診至 ${clinic.name}`, `通行碼 ${ref.share_token}`);
  };

  return (
    <>
      {/* 1. Active Mounted Health Context Pills (Matches stitch_export/ai_action_sheet/code.html) */}
      <div className="fgs-legend-scroll" role="region" aria-label="已掛載之個人化病歷上下文">
        <span className="engine-badge mono-val">
          血檢 CREA {latestBlood?.metrics.CREA.val ?? 2.3} ({latestBlood?.iris_stage || 'Stage 2'})
        </span>
        <span className="status-chip status-chip--green mono-val">
          今日 FGS {latestFgs?.scores.total ?? 1}/10
        </span>
        <span className="status-chip status-chip--yellow mono-val">
          今日飲水 {dailyCare.water_ml}ml
        </span>
      </div>

      {/* 2. Conversation Stream */}
      <div className="stitch-chat-stream" aria-label="問診對話與分流評估">
        <div style={{ textAlign: 'center' }}>
          <span className="engine-badge mono-val">今天 08:42</span>
        </div>

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
                <strong>PetPulse AI 臨床衛教建議</strong>
                <span className="mono-val brand-subtitle">{msg.timestamp}</span>
              </div>
              <p className="lead">{msg.text}</p>
            </div>
          )
        )}

        {/* Structured Clinical Triage Card (Matches stitch_export/ai_action_sheet/code.html) */}
        <article className="stitch-card" aria-labelledby="triage-result-heading">
          <div className="stitch-subbox">
            <div className="stitch-pet-row">
              <h1 id="triage-result-heading" style={{ fontSize: '15px', fontWeight: 700 }}>
                建議 24 至 48 小時內就醫觀察
              </h1>
              <span className="status-chip status-chip--yellow">中度追蹤</span>
            </div>
            <p className="brand-subtitle">
              非立即危急休克，但考量慢性腎病波動風險，建議門診確認脫水與胃黏膜情形
            </p>
          </div>

          <p className="lead">
            結合 <strong className="mono-val">{selectedPet.short_name || selectedPet.name}</strong> 的 <strong className="mono-val">{selectedPet.chronic_conditions[0] || 'IRIS 第 II 期'}</strong> 病史，清晨黃色胃液多為空腹胃酸刺激或幽門逆流。目前臉部疼痛 FGS 僅 {latestFgs?.scores.total ?? 1}/10，未出現急性皺眉收耳。
          </p>

          <div className="stitch-bento-2col">
            <div className="stitch-subbox">
              <span className="brand-subtitle">近次血檢 CREA</span>
              <strong className="mono-val" style={{ fontSize: '16px' }}>
                {latestBlood?.metrics.CREA.val ?? 2.3} mg/dL
              </strong>
            </div>
            <div className="stitch-subbox">
              <span className="brand-subtitle">今日貓臉 FGS</span>
              <strong className="mono-val" style={{ fontSize: '16px' }}>
                {latestFgs?.scores.total ?? 1} / 10
              </strong>
            </div>
          </div>

          <div className="stitch-pet-row">
            <span style={{ fontSize: '13px', fontWeight: 700 }}>居家 3 項即時檢查</span>
            <span className="status-chip status-chip--green mono-val">
              完成度 {completedCheckCount}/3
            </span>
          </div>

          <div className="ledger-list">
            <label className="ledger-row">
              <span>1. 翻開牙齦確認黏膜呈淡粉色微濕潤</span>
              <input
                type="checkbox"
                checked={homeChecks.gum_crt}
                onChange={() => toggleCheck('gum_crt')}
              />
            </label>
            <label className="ledger-row">
              <span>2. 輕拉肩頸皮膚回彈測試 (需 2 秒內平復)</span>
              <input
                type="checkbox"
                checked={homeChecks.skin_turgor}
                onChange={() => toggleCheck('skin_turgor')}
              />
            </label>
            <label className="ledger-row">
              <span>3. 量測靜止呼吸頻率 (每分鐘 20 至 30 次為正常)</span>
              <input
                type="checkbox"
                checked={homeChecks.resp_rate}
                onChange={() => toggleCheck('resp_rate')}
              />
            </label>
          </div>

          <div className="split-grid-2">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => navigate('/app/trends')}
            >
              生成看診小抄
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleBookEmergencyReferral}
            >
              預約合作門診
            </button>
          </div>
        </article>
      </div>

      {/* 3. Prompt Shortcut Chips & Input Composer */}
      <div className="fgs-legend-scroll" style={{ marginTop: '4px' }}>
        <label className="btn btn--sm">
          <span>拍嘔吐物分析</span>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={handleUploadChatPhoto}
          />
        </label>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() =>
            setInputText('目前腎處方主食罐可以加一點溫水隔水加熱再餵嗎？')
          }
        >
          詢問飲食建議
        </button>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => setActionSheetOpen(true)}
        >
          多模態輔助選單
        </button>
      </div>

      <form
        className="stitch-composer-row"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuestion(inputText);
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
          onChange={(e) => setInputText(e.target.value)}
          placeholder="描述毛孩症狀或提問..."
          aria-label="輸入問診症狀描述"
        />
        <button type="submit" className="btn btn--primary btn--sm">
          送出
        </button>
      </form>

      <ActionSheetModal
        open={actionSheetOpen}
        petName={selectedPet.short_name || selectedPet.name}
        onClose={() => setActionSheetOpen(false)}
        onUploadVomitPhoto={() =>
          handleSendQuestion('已附加嘔吐物微距相片，請協助比對膽汁或毛球型態。')
        }
        onExportVetPdf={() => navigate('/app/trends')}
        onCreateEmergencyReferral={handleBookEmergencyReferral}
      />
    </>
  );
};
