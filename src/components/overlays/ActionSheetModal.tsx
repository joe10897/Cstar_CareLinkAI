/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface ActionSheetModalProps {
  open: boolean;
  petName: string;
  onClose: () => void;
  onUploadVomitPhoto?: () => void;
  onExportVetPdf?: () => void;
  onCreateEmergencyReferral?: () => void;
}

export const ActionSheetModal: React.FC<ActionSheetModalProps> = ({
  open,
  petName,
  onClose,
  onUploadVomitPhoto,
  onExportVetPdf,
  onCreateEmergencyReferral,
}) => {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="多模態就診分流助手">
      <div className="sheet-panel">
        <div className="sheet-handle" aria-hidden="true" />

        <div className="section-header">
          <div>
            <h3>多模態就診分流助手</h3>
            <p className="brand-subtitle">選擇要附加至 {petName} 問診與跨院病歷的臨床資料</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            關閉視窗
          </button>
        </div>

        <div className="ledger-list">
          <div className="ledger-row">
            <div>
              <strong>拍攝嘔吐物與排泄物影像</strong>
              <p className="brand-subtitle">AI 自動比對顏色、黏稠度與毛球／膽汁特徵並上傳 Cloudflare R2</p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                onUploadVomitPhoto?.();
                onClose();
              }}
            >
              上傳照片分析
            </button>
          </div>

          <div className="ledger-row">
            <div>
              <strong>開啟 AI 貓臉 48 點 FGS 快篩</strong>
              <p className="brand-subtitle">即時量測眼眶收緊度 (EAR)、雙耳外展傾角與鬍鬚緊張度</p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                onClose();
                navigate('/app/fgs-scan');
              }}
            >
              前往 48 點快篩
            </button>
          </div>

          <div className="ledger-row">
            <div>
              <strong>匯出獸醫看診小抄 PDF 與雲端快取包</strong>
              <p className="brand-subtitle">整合近 3 日飲水趨勢、血檢 CREA/SDMA 曲線與 48 點貓臉對照圖</p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                onExportVetPdf?.();
                onClose();
              }}
            >
              產出看診摘要
            </button>
          </div>

          <div className="ledger-row">
            <div>
              <strong>一鍵預約合作特約動物醫院急診</strong>
              <p className="brand-subtitle">透由 Supabase Realtime 秒級將預審病歷推播至安禾高齡貓專科動物醫院</p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onCreateEmergencyReferral?.();
                onClose();
              }}
            >
              發送急診預審包
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
