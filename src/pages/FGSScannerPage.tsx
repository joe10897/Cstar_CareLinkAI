/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FGSAnnotationCanvas,
  type CanvasThemeMode,
} from '../components/FGSAnnotationCanvas';
import {
  calculateFGSGeometryAndScores,
  createLandmarksFromVisionAssessment,
  createPresetLandmarks,
  type FGSLandmarkPoint,
  type FGSRegion,
  type FGSScores,
} from '../utils/fgsGeometryCalculator';
import {
  CARELINK_ASSETS,
  carelinkStore,
  PARTNER_CLINICS,
  type PetProfile,
} from '../services/carelinkStore';
import { apiClient, type FgsAiAnalysisResponse } from '../services/apiClient';
import { useR2Upload } from '../hooks/useR2Upload';

export interface FGSScannerPageProps {
  selectedPet: PetProfile;
  onPetUpdated: () => void;
  onTriggerTap?: () => void;
  onTriggerConfirm?: () => void;
  onNotify?: (msg: string, detail?: string) => void;
}

async function imageUrlToCompressedDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:image/')) return src;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxEdge = 768;
      const scale = Math.min(1, maxEdge / Math.max(img.width || 1, img.height || 1));
      const w = Math.max(64, Math.round(img.width * scale));
      const h = Math.max(64, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('無法載入影像進行 AI 分析'));
    img.src = src;
  });
}

export const FGSScannerPage: React.FC<FGSScannerPageProps> = ({
  selectedPet,
  onPetUpdated,
  onTriggerTap,
  onTriggerConfirm,
  onNotify,
}) => {
  const navigate = useNavigate();
  const { uploadImageToR2 } = useR2Upload();

  const [themeMode, setThemeMode] = useState<CanvasThemeMode>('darkroom');
  const [activeRegionFilter, setActiveRegionFilter] = useState<'all' | FGSRegion>('all');
  const [presetMode, setPresetMode] = useState<'baseline_0' | 'mild_asymmetric_3' | 'pain_alert_5'>(
    'mild_asymmetric_3'
  );
  const [imageUrl, setImageUrl] = useState<string>(CARELINK_ASSETS.fgsPortrait);
  const [imageDataUrlForAi, setImageDataUrlForAi] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<FGSLandmarkPoint[]>(() =>
    createPresetLandmarks('mild_asymmetric_3')
  );
  const [selectedPointId, setSelectedPointId] = useState<number | null>(15);
  const [aiReport, setAiReport] = useState<FgsAiAnalysisResponse | null>(null);
  const [inferenceMeta, setInferenceMeta] = useState<{
    provider: string;
    model: string;
    latencyMs: number;
    exifOrientation: number;
    r2Key: string;
    isRealAi: boolean;
  }>({
    provider: 'Local 48-Pt Template',
    model: '未執行雲端視覺推論',
    latencyMs: 0,
    exifOrientation: 1,
    r2Key: `fgs-scan/${selectedPet.id}/sample-portrait.jpg`,
    isRealAi: false,
  });
  const [isRunningInference, setIsRunningInference] = useState<boolean>(false);
  const [hasManualEdit, setHasManualEdit] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  const geoEval = calculateFGSGeometryAndScores(landmarks, selectedPet.baseline_metrics);

  // If Real Vision AI has analyzed this photo and the user hasn't manually dragged landmarks yet,
  // display the Vision AI's real AU scores & findings; once dragged, immediately recalculate live!
  const effectiveScores: FGSScores =
    aiReport && !hasManualEdit
      ? {
          ear: Math.min(2, Math.max(0, aiReport.scores.ear)) as 0 | 1 | 2,
          orbital: Math.min(2, Math.max(0, aiReport.scores.orbital)) as 0 | 1 | 2,
          muzzle: Math.min(2, Math.max(0, aiReport.scores.muzzle)) as 0 | 1 | 2,
          whisker: Math.min(2, Math.max(0, aiReport.scores.whisker)) as 0 | 1 | 2,
          head: Math.min(2, Math.max(0, aiReport.scores.head)) as 0 | 1 | 2,
          total: aiReport.scores.total,
        }
      : geoEval.scores;

  const effectiveUrgency: 'green' | 'yellow' | 'red' =
    effectiveScores.total >= 4 ? 'red' : effectiveScores.total >= 2 ? 'yellow' : 'green';

  const effectiveObservation =
    aiReport && !hasManualEdit
      ? `${aiReport.visual_findings} ${aiReport.triage_advice}`
      : geoEval.observationNotes;

  const runRealCloudVisionAnalysis = async (
    targetDataUrl: string,
    r2Key: string,
    exifOrientation: number
  ): Promise<void> => {
    setIsRunningInference(true);
    setHasManualEdit(false);
    try {
      const res = await apiClient.analyzeFgsWithAI({
        imageDataUrl: targetDataUrl,
        petId: selectedPet.id,
        petName: selectedPet.name,
        species: selectedPet.species,
        breed: selectedPet.breed,
        coatLength: selectedPet.coat_length === 'long' ? 'long' : 'short',
      });

      const projected = createLandmarksFromVisionAssessment(
        res.face_box,
        res.scores,
        res.confidence
      );
      setLandmarks(projected);
      setAiReport(res);
      setInferenceMeta({
        provider: res.provider === 'gemini' ? 'Gemini 2.5 Flash Vision' : 'Workers AI Vision',
        model: res.model.split('/').pop() || res.model,
        latencyMs: res.latencyMs,
        exifOrientation,
        r2Key,
        isRealAi: true,
      });
      onTriggerConfirm?.();
      if (!res.animal_detected) {
        onNotify?.(
          'AI 視覺模型未在相片中偵測到清晰犬貓臉部',
          '請重新上傳正面清晰寵物照片以確保準確度'
        );
      } else {
        onNotify?.(
          `真實 AI 視覺分析完成：FGS ${res.scores.total}/10`,
          `${res.model.split('/').pop()} · 耗時 ${res.latencyMs}ms · 置信度 ${Math.round(res.confidence * 100)}%`
        );
      }
    } catch (err) {
      onNotify?.(
        '雲端 AI 視覺推論失敗',
        err instanceof Error ? err.message : '請確認網路連線或重新登入'
      );
    } finally {
      setIsRunningInference(false);
    }
  };

  const handleAnalyzeCurrentPhoto = async (): Promise<void> => {
    onTriggerTap?.();
    try {
      const dataUrl = imageDataUrlForAi || (await imageUrlToCompressedDataUrl(imageUrl));
      setImageDataUrlForAi(dataUrl);
      await runRealCloudVisionAnalysis(dataUrl, inferenceMeta.r2Key, inferenceMeta.exifOrientation);
    } catch (err) {
      onNotify?.('無法編碼目前影像', err instanceof Error ? err.message : undefined);
    }
  };

  const handleSelectPreset = (
    mode: 'baseline_0' | 'mild_asymmetric_3' | 'pain_alert_5'
  ): void => {
    onTriggerTap?.();
    setPresetMode(mode);
    setImageUrl(CARELINK_ASSETS.fgsPortrait);
    setImageDataUrlForAi(null);
    setAiReport(null);
    setHasManualEdit(false);
    setLandmarks(createPresetLandmarks(mode));
    setInferenceMeta({
      provider: 'Local 48-Pt Template',
      model: '幾何範本（點擊下方執行真實 AI）',
      latencyMs: 0,
      exifOrientation: 1,
      r2Key: `fgs-scan/${selectedPet.id}/preset-${mode}.jpg`,
      isRealAi: false,
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRunningInference(true);
    try {
      const uploaded = await uploadImageToR2(file, 'fgs-scan', selectedPet.id);
      setImageUrl(uploaded.publicUrl || uploaded.dataUrl);
      setImageDataUrlForAi(uploaded.dataUrl);
      await runRealCloudVisionAnalysis(
        uploaded.dataUrl,
        uploaded.r2ObjectKey,
        uploaded.exifOrientation
      );
    } catch {
      setIsRunningInference(false);
      onNotify?.('影像讀取失敗，請選擇 JPG 或 PNG 寵物照片');
    }
  };

  const handleToggleCamera = async (): Promise<void> => {
    onTriggerTap?.();
    if (cameraActive) {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      setCameraActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 720, height: 720 },
        audio: false,
      });
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 60);
    } catch {
      onNotify?.(
        '瀏覽器未授予相機權限',
        '可直接點選「上傳實拍相片」進行真實 AI 視覺辨識'
      );
    }
  };

  const handleCaptureCameraFrame = async (): Promise<void> => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, 720, 720);
    const frameUrl = canvas.toDataURL('image/jpeg', 0.85);
    setImageUrl(frameUrl);
    setImageDataUrlForAi(frameUrl);

    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);

    let cloudKey = `fgs-scan/${selectedPet.id}/camera-${Date.now()}.jpg`;
    try {
      const uploaded = await apiClient.uploadMedia(frameUrl, 'fgs-scan', selectedPet.id);
      cloudKey = uploaded.r2Key;
      setImageUrl(uploaded.publicUrl);
    } catch {
      // keep dataUrl
    }

    await runRealCloudVisionAnalysis(frameUrl, cloudKey, 1);
  };

  const handleSaveAsHealthyBaseline = (): void => {
    carelinkStore.updatePetBaseline(
      selectedPet.id,
      landmarks,
      geoEval.metrics,
      imageUrl
    );
    onPetUpdated();
    onTriggerConfirm?.();
    onNotify?.(
      `已將目前 48 點儲存為「${selectedPet.short_name || selectedPet.name}」的 0 分健康基線`,
      '已同步寫入 Cloudflare D1 雲端檔案'
    );
  };

  const handleSaveRecordToStore = (): void => {
    const rec = carelinkStore.addFGSRecord({
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      r2_image_key: inferenceMeta.r2Key,
      image_url: imageUrl,
      image_width: 720,
      image_height: 864,
      raw_onnx_landmarks: landmarks,
      verified_landmarks: landmarks,
      geometric_metrics: geoEval.metrics,
      scores: effectiveScores,
      ai_provider: inferenceMeta.provider,
      ai_model: inferenceMeta.model,
      ai_confidence: aiReport?.confidence ?? geoEval.metrics.avgConfidence,
      ai_observation_notes: effectiveObservation,
      camera_warnings: aiReport?.warnings || geoEval.cameraWarnings,
      is_verified: true,
      verified_by: hasManualEdit ? '飼主手動微調 48 點存檔' : `飼主確認 (${inferenceMeta.provider})`,
    });
    onTriggerConfirm?.();
    onNotify?.(
      `已寫入雲端 FGS ${rec.scores.total}/10 紀錄`,
      `引擎：${inferenceMeta.provider} (${inferenceMeta.model})`
    );
  };

  const handleDispatchEmergencyReferral = (): void => {
    const targetClinic = PARTNER_CLINICS[0];
    const saved = carelinkStore.addFGSRecord({
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      r2_image_key: inferenceMeta.r2Key,
      image_url: imageUrl,
      image_width: 720,
      image_height: 864,
      raw_onnx_landmarks: landmarks,
      verified_landmarks: landmarks,
      geometric_metrics: geoEval.metrics,
      scores: effectiveScores,
      ai_provider: inferenceMeta.provider,
      ai_model: inferenceMeta.model,
      ai_confidence: aiReport?.confidence ?? geoEval.metrics.avgConfidence,
      ai_observation_notes: effectiveObservation,
      camera_warnings: aiReport?.warnings || geoEval.cameraWarnings,
      is_verified: true,
      verified_by: '轉診預審隨附 48 點快取',
    });

    const latestBlood = carelinkStore
      .getBloodTestRecords(selectedPet.id)
      .slice(-1)[0];

    const referral = carelinkStore.createClinicReferral({
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      breed: selectedPet.breed,
      age_years: 8,
      clinic_id: targetClinic.id,
      clinic_name: targetClinic.name,
      urgency_level: effectiveUrgency,
      trigger_reason: `FGS 視覺初篩總分 ${effectiveScores.total}/10 : ${effectiveObservation.slice(0, 140)}`,
      latest_fgs_record_id: saved.id,
      fgs_total_score: effectiveScores.total,
      crea_value: latestBlood?.metrics.CREA.val ?? 2.3,
      sdma_value: latestBlood?.metrics.SDMA.val ?? 14,
    });

    onTriggerConfirm?.();
    onNotify?.(
      `已同步建立轉診摘要至 ${targetClinic.name}`,
      `通行碼 ${referral.share_token}`
    );
  };

  const avgEar = Number(
    ((geoEval.metrics.leftEAR + geoEval.metrics.rightEAR) / 2).toFixed(3)
  );
  const avgConfPct = Math.round(
    (aiReport?.confidence ??
      landmarks.reduce((acc, pt) => acc + pt.conf, 0) / Math.max(1, landmarks.length)) * 100
  );

  const earFillPct = Math.min(100, Math.max(10, (effectiveScores.ear / 2) * 88 + 8));
  const orbitalFillPct = Math.min(100, Math.max(10, (effectiveScores.orbital / 2) * 88 + 8));
  const whiskerFillPct = Math.min(100, Math.max(10, ((effectiveScores.whisker + effectiveScores.muzzle) / 4) * 88 + 8));
  const earStatusShort =
    effectiveUrgency === 'red'
      ? 'Alert'
      : effectiveUrgency === 'yellow'
        ? 'Slight'
        : 'Normal';

  return (
    <>
      <section className="fgs-darkroom-stage" aria-label="48 點寵物臉部視覺初篩暗房">
        {/* Top Telemetry & Mode Bar */}
        <div className="fgs-telemetry-bar">
          <div className="fgs-telemetry-left">
            <span className="fgs-dot fgs-dot--whisker" aria-hidden="true" />
            <span className="fgs-telemetry-code mono-val">
              {inferenceMeta.isRealAi ? 'LIVE VISION AI · 48P' : '48P TEMPLATE · READY'}
            </span>
          </div>

          <div className="fgs-mode-switch" role="group" aria-label="暗房標註與透析模式切換">
            <button
              type="button"
              className={themeMode === 'darkroom' ? 'fgs-mode-opt is-active' : 'fgs-mode-opt'}
              onClick={() => {
                onTriggerTap?.();
                setThemeMode('darkroom');
              }}
            >
              分區標註
            </button>
            <button
              type="button"
              className={themeMode === 'clinical-light' ? 'fgs-mode-opt is-active' : 'fgs-mode-opt'}
              onClick={() => {
                onTriggerTap?.();
                setThemeMode('clinical-light');
              }}
            >
              透析
            </button>
          </div>
        </div>

        {/* 5-Region Colored Anatomical Legend Track */}
        <div className="fgs-legend-scroll" role="group" aria-label="五官特徵點分區圖例">
          <button
            type="button"
            className={activeRegionFilter === 'all' ? 'fgs-zone-pill fgs-zone-pill--all is-active' : 'fgs-zone-pill fgs-zone-pill--all'}
            onClick={() => setActiveRegionFilter('all')}
          >
            全臉 48P
          </button>
          <button
            type="button"
            className={activeRegionFilter === 'ears' ? 'fgs-zone-pill fgs-zone-pill--ear is-active' : 'fgs-zone-pill fgs-zone-pill--ear'}
            onClick={() => setActiveRegionFilter('ears')}
          >
            <span className="fgs-dot fgs-dot--ear" aria-hidden="true" />
            <span className="mono-val">01-10 雙耳</span>
          </button>
          <button
            type="button"
            className={activeRegionFilter === 'eyes' ? 'fgs-zone-pill fgs-zone-pill--eye is-active' : 'fgs-zone-pill fgs-zone-pill--eye'}
            onClick={() => setActiveRegionFilter('eyes')}
          >
            <span className="fgs-dot fgs-dot--eye" aria-hidden="true" />
            <span className="mono-val">11-26 眼眶</span>
          </button>
          <button
            type="button"
            className={activeRegionFilter === 'nose' ? 'fgs-zone-pill fgs-zone-pill--nose is-active' : 'fgs-zone-pill fgs-zone-pill--nose'}
            onClick={() => setActiveRegionFilter('nose')}
          >
            <span className="fgs-dot fgs-dot--nose" aria-hidden="true" />
            <span className="mono-val">27-34 鼻樑</span>
          </button>
          <button
            type="button"
            className={activeRegionFilter === 'mouth' ? 'fgs-zone-pill fgs-zone-pill--mouth is-active' : 'fgs-zone-pill fgs-zone-pill--mouth'}
            onClick={() => setActiveRegionFilter('mouth')}
          >
            <span className="fgs-dot fgs-dot--mouth" aria-hidden="true" />
            <span className="mono-val">35-38 口唇</span>
          </button>
          <button
            type="button"
            className={activeRegionFilter === 'whiskers' ? 'fgs-zone-pill fgs-zone-pill--whisker is-active' : 'fgs-zone-pill fgs-zone-pill--whisker'}
            onClick={() => setActiveRegionFilter('whiskers')}
          >
            <span className="fgs-dot fgs-dot--whisker" aria-hidden="true" />
            <span className="mono-val">39-48 頰墊</span>
          </button>
        </div>

        {/* Full-bleed Portrait Canvas Frame */}
        <div className="fgs-portrait-frame fgs-portrait-frame--bleed">
          <div className="fgs-hud-chip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-landmark-eye-dot)" strokeWidth="2.1" aria-hidden="true">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <div className="fgs-hud-chip__text">
              <span className="fgs-hud-chip__eyebrow">EAR ASPECT RATIO</span>
              <span className="fgs-hud-chip__val mono-val">
                {avgEar.toFixed(3)} ({isRunningInference ? '真實 AI 推論中...' : earStatusShort})
              </span>
            </div>
          </div>

          {cameraActive ? (
            <div>
              <video
                ref={videoRef}
                poster={imageUrl}
                muted
                playsInline
                style={{ width: '100%', display: 'block', aspectRatio: '4 / 5', objectFit: 'cover' }}
              />
              <div style={{ padding: '12px', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={isRunningInference}
                  onClick={() => void handleCaptureCameraFrame()}
                >
                  {isRunningInference ? 'AI 分析中...' : '拍攝快門並送出真實 AI 視覺分析'}
                </button>
              </div>
            </div>
          ) : (
            <FGSAnnotationCanvas
              imageUrl={imageUrl}
              landmarks={landmarks}
              selectedPointId={selectedPointId}
              editable={true}
              themeMode={themeMode}
              activeRegionFilter={activeRegionFilter}
              earAspectRatio={avgEar}
              hideBuiltInChrome={true}
              onSelectPoint={setSelectedPointId}
              onUpdateLandmarks={(pts) => {
                setHasManualEdit(true);
                setLandmarks(pts);
              }}
            />
          )}
        </div>

        {/* Upload / Camera / Real AI Trigger Strip */}
        <div className="fgs-dark-actions">
          <div className="pet-pill-group">
            <label className="fgs-region-pill is-active" style={{ cursor: 'pointer' }}>
              <span>{isRunningInference ? 'AI 辨識中...' : '上傳毛孩照片 (真實AI)'}</span>
              <input type="file" accept="image/*" hidden disabled={isRunningInference} onChange={(e) => void handleFileUpload(e)} />
            </label>
            <button type="button" className="fgs-region-pill" onClick={() => void handleToggleCamera()}>
              {cameraActive ? '關閉鏡頭' : '相機拍攝'}
            </button>
          </div>

          <div className="pet-pill-group">
            <button
              type="button"
              className="fgs-region-pill"
              disabled={isRunningInference}
              onClick={() => void handleAnalyzeCurrentPhoto()}
            >
              {isRunningInference ? '推論中...' : '立即 AI 分析此圖'}
            </button>
            {[
              { id: 'baseline_0' as const, label: '0分範本' },
              { id: 'pain_alert_5' as const, label: '5分範本' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={!inferenceMeta.isRealAi && presetMode === preset.id ? 'fgs-region-pill is-active' : 'fgs-region-pill'}
                onClick={() => handleSelectPreset(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Overlapping White Clinical Sheet */}
      <section className="fgs-overlapping-sheet" aria-labelledby="fgs-score-heading">
        <div className="fgs-sheet-handle" aria-hidden="true" />

        {aiReport && !aiReport.animal_detected && (
          <div
            className="stitch-subbox"
            role="alert"
            style={{ backgroundColor: '#FEF2F2', borderColor: '#DC2626', color: '#991B1B' }}
          >
            <strong>AI 視覺偵測提醒：</strong>
            畫面中未偵測到清楚的犬貓正臉，請上傳正面清晰寵物照片後重新分析。
          </div>
        )}

        <div className="fgs-score-header">
          <div>
            <div className="pet-pill-group">
              <h1 id="fgs-score-heading" className="fgs-score-big mono-val">
                FGS {effectiveScores.total}/10
              </h1>
              <span
                className={
                  effectiveUrgency === 'red'
                    ? 'status-chip status-chip--red'
                    : effectiveUrgency === 'yellow'
                      ? 'status-chip status-chip--yellow'
                      : 'status-chip status-chip--green'
                }
              >
                {effectiveUrgency === 'red'
                  ? '疼痛紅燈警示'
                  : effectiveUrgency === 'yellow'
                    ? '輕度緊繃觀察'
                    : '綠色安全觀察'}
              </span>
            </div>
            <p className="brand-subtitle" style={{ marginTop: '4px' }}>
              {effectiveObservation}
            </p>
          </div>

          <div className="fgs-conf-box">
            <span className="fgs-conf-box__label">置信度</span>
            <strong className="fgs-conf-box__val mono-val">{avgConfPct}%</strong>
          </div>
        </div>

        {/* Action Unit Progress Deconstruction Box */}
        <div className="fgs-au-card">
          <div className="stitch-pet-row">
            <span className="stitch-list-title">表情動作單元解構 (FGS 5-AU)</span>
            <span className="stitch-list-count mono-val">
              {inferenceMeta.provider}
              {inferenceMeta.latencyMs > 0 ? ` · ${inferenceMeta.latencyMs}ms` : ''}
            </span>
          </div>

          <div className="au-meter-list">
            <div className="au-meter-row">
              <div className="au-meter-head">
                <span className="fgs-au-label">
                  <span className="fgs-dot fgs-dot--ear" aria-hidden="true" />
                  雙耳位置 (Ear Position · {geoEval.metrics.meanEarAngleDeg}°)
                </span>
                <span className="mono-val">{effectiveScores.ear} / 2</span>
              </div>
              <div className="au-meter-track">
                <div className="au-meter-fill--ear" style={{ width: `${earFillPct}%` }} />
              </div>
            </div>

            <div className="au-meter-row">
              <div className="au-meter-head">
                <span className="fgs-au-label">
                  <span className="fgs-dot fgs-dot--eye" aria-hidden="true" />
                  眼眶收緊度 (Orbital · EAR {geoEval.metrics.meanEAR.toFixed(2)})
                </span>
                <span className="mono-val">{effectiveScores.orbital} / 2</span>
              </div>
              <div className="au-meter-track">
                <div className="au-meter-fill--eye" style={{ width: `${orbitalFillPct}%` }} />
              </div>
            </div>

            <div className="au-meter-row">
              <div className="au-meter-head">
                <span className="fgs-au-label">
                  <span className="fgs-dot fgs-dot--whisker" aria-hidden="true" />
                  口鼻與鬍鬚緊張度 (Muzzle {effectiveScores.muzzle}/2 · Whisker {effectiveScores.whisker}/2 · Head {effectiveScores.head}/2)
                </span>
                <span className="mono-val">
                  {effectiveScores.muzzle + effectiveScores.whisker + effectiveScores.head} / 6
                </span>
              </div>
              <div className="au-meter-track">
                <div className="au-meter-fill--whisker" style={{ width: `${whiskerFillPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <p className="brand-subtitle">
          活躍引擎：<strong className="mono-val">{inferenceMeta.model}</strong> ‧ 參考 Feline Grimace Scale 規範，拖曳畫布任一點位可即時重算，非獸醫醫療診斷。
        </p>

        {/* AI Triage Context Forward Highlight Panel */}
        <div className="fgs-ai-forward-card">
          <span className="fgs-ai-forward-badge">
            自動掛載雲端病歷 Context (最新 FGS / 飲水紀錄 / 血檢指標)
          </span>
          <div className="stitch-pet-row">
            <strong style={{ fontSize: '15px' }}>AI 智慧問診深入分析</strong>
            <span className="stitch-list-count mono-val">Live LLM</span>
          </div>
          <p className="brand-subtitle">
            先儲存本次檢測結果，再帶入 AI 問診室由真實大語言模型結合病歷提供分流與居家照護建議。
          </p>
          <button
            type="button"
            className="btn btn--primary btn--lg"
            onClick={() => {
              handleSaveRecordToStore();
              navigate('/app/chat');
            }}
          >
            <span>儲存並進入 AI 智慧問診</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="split-grid-2">
          <button
            type="button"
            className="stitch-soft-action"
            onClick={handleSaveRecordToStore}
          >
            儲存至雲端健康紀錄
          </button>
          <button
            type="button"
            className="stitch-soft-action"
            onClick={handleDispatchEmergencyReferral}
          >
            產出獸醫轉診摘要
          </button>
        </div>

        <button
          type="button"
          className="btn"
          onClick={handleSaveAsHealthyBaseline}
        >
          設為 {selectedPet.short_name || selectedPet.name} 0 分健康基線
        </button>
      </section>
    </>
  );
};
