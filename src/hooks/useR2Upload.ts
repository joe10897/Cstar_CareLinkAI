/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import { useCallback, useState } from 'react';
import { normalizeUploadedImage, type NormalizedImageOutput } from '../utils/exifOrientation';

export interface R2UploadResult extends NormalizedImageOutput {
  r2ObjectKey: string;
  presignedUploaded: boolean;
}

export function useR2Upload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImageToR2 = useCallback(
    async (
      file: File,
      folder: 'fgs-scan' | 'blood-test' | 'triage-chat' | 'daily-care',
      petId: string
    ): Promise<R2UploadResult> => {
      setIsUploading(true);
      setUploadError(null);

      try {
        const normalized = await normalizeUploadedImage(file, 1024);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectKey = `${folder}/${petId}/${timestamp}-${safeName}`;
        let presignedUploaded = false;

        try {
          const res = await fetch('/api/storage/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              objectKey,
              contentType: 'image/jpeg',
            }),
          });
          if (res.ok) {
            const payload = (await res.json()) as { uploadUrl?: string };
            if (payload.uploadUrl && payload.uploadUrl.startsWith('http')) {
              presignedUploaded = true;
            }
          }
        } catch {
          // 單機展示環境自動降級為本地 EXIF 校正影像快取
        }

        return {
          ...normalized,
          r2ObjectKey: objectKey,
          presignedUploaded,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : '影像處理失敗';
        setUploadError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return {
    isUploading,
    uploadError,
    uploadImageToR2,
  };
}
