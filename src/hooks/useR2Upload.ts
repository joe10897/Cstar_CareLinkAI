/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
import { useState } from 'react';
import { apiClient } from '../services/apiClient';
import { normalizeUploadedImage } from '../utils/exifOrientation';

export interface R2UploadResult {
  r2ObjectKey: string;
  publicUrl: string;
  mediaId?: string;
  dataUrl: string;
  imageData: ImageData;
  exifOrientation: number;
  width: number;
  height: number;
  cloudSaved: boolean;
}

/**
 * 處理影像 EXIF 方向校正、壓縮（維持清晰辨識且控制體積 <= 550KB）並實際上傳至雲端 API (/api/media/upload)
 */
export function useR2Upload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImageToR2 = async (
    file: File,
    category: 'fgs-scan' | 'blood-test' | 'daily-care' | 'triage-chat',
    petId: string
  ): Promise<R2UploadResult> => {
    setIsUploading(true);
    try {
      const normalized = await normalizeUploadedImage(file, 900);

      // Re-compress to JPEG if dataUrl is large so D1 media_objects stays fast & crisp
      let uploadDataUrl = normalized.dataUrl;
      if (uploadDataUrl.length > 650_000) {
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = normalized.width;
        tmpCanvas.height = normalized.height;
        const ctx = tmpCanvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(normalized.imageData, 0, 0);
          uploadDataUrl = tmpCanvas.toDataURL('image/jpeg', 0.76);
        }
      }

      let r2ObjectKey = `${category}/${petId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
      let publicUrl = uploadDataUrl;
      let mediaId: string | undefined;
      let cloudSaved = false;

      try {
        const uploaded = await apiClient.uploadMedia(uploadDataUrl, category, petId);
        r2ObjectKey = uploaded.r2Key;
        publicUrl = uploaded.publicUrl;
        mediaId = uploaded.mediaId;
        cloudSaved = true;
      } catch (err) {
        console.warn('Cloud media upload fallback to local dataUrl:', err);
      }

      return {
        r2ObjectKey,
        publicUrl,
        mediaId,
        dataUrl: uploadDataUrl,
        imageData: normalized.imageData,
        exifOrientation: normalized.exifOrientation,
        width: normalized.width,
        height: normalized.height,
        cloudSaved,
      };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadImageToR2,
  };
}
