/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/**
 * CareLink AI — 手機照片 EXIF 方向解析與自動轉正管線 (src/utils/exifOrientation.ts)
 *
 * 當在 LINE WebView 或 iOS / Android 手機相簿選取照片時，直接從 ArrayBuffer 讀取 JPEG EXIF
 * Orientation Tag (0x0112)，並在 Canvas 上進行仿射轉正，確保貓臉雙眼水平傾角與 48 點座標不受手機旋轉影響。
 */

export type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export async function readExifOrientation(file: Blob): Promise<ExifOrientation> {
  try {
    const slice = file.slice(0, 65536);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);

    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
      return 1; // 非 JPEG 格式預設為正向 1
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset + 4 <= length) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      if (marker === 0xffe1) {
        const app1Length = view.getUint16(offset, false);
        if (offset + app1Length > length) break;

        // 檢查 "Exif\0\0" 標頭 (0x45786966)
        if (view.getUint32(offset + 2, false) !== 0x45786966) {
          return 1;
        }

        const tiffOffset = offset + 8;
        const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
        const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
        const dirStart = tiffOffset + firstIfdOffset;
        if (dirStart + 2 > length) return 1;

        const entries = view.getUint16(dirStart, littleEndian);
        for (let i = 0; i < entries; i++) {
          const entryOffset = dirStart + 2 + i * 12;
          if (entryOffset + 10 > length) break;
          if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
            const val = view.getUint16(entryOffset + 8, littleEndian);
            if (val >= 1 && val <= 8) {
              return val as ExifOrientation;
            }
          }
        }
        return 1;
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }
  } catch {
    return 1;
  }
  return 1;
}

export interface NormalizedImageOutput {
  dataUrl: string;
  width: number;
  height: number;
  exifOrientation: ExifOrientation;
  imageData: ImageData;
}

/**
 * 讀取圖片檔案並依據 EXIF Orientation 轉正至最大邊長 1280px 的高品質 Canvas
 */
export async function normalizeUploadedImage(
  file: File,
  maxDimension = 1280
): Promise<NormalizedImageOutput> {
  const orientation = await readExifOrientation(file);
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (err) => reject(err);
      el.src = objectUrl;
    });

    const rawW = img.naturalWidth || img.width || 800;
    const rawH = img.naturalHeight || img.height || 800;
    const scale = Math.min(1, maxDimension / Math.max(rawW, rawH));
    const drawW = Math.round(rawW * scale);
    const drawH = Math.round(rawH * scale);

    const swapDims = orientation >= 5 && orientation <= 8;
    const canvas = document.createElement('canvas');
    canvas.width = swapDims ? drawH : drawW;
    canvas.height = swapDims ? drawW : drawH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('無法建立 2D Canvas 進行 EXIF 方向校正');
    }

    ctx.save();
    switch (orientation) {
      case 2:
        ctx.transform(-1, 0, 0, 1, drawW, 0);
        break;
      case 3:
        ctx.transform(-1, 0, 0, -1, drawW, drawH);
        break;
      case 4:
        ctx.transform(1, 0, 0, -1, 0, drawH);
        break;
      case 5:
        ctx.transform(0, 1, 1, 0, 0, 0);
        break;
      case 6:
        ctx.transform(0, 1, -1, 0, drawH, 0);
        break;
      case 7:
        ctx.transform(0, -1, -1, 0, drawH, drawW);
        break;
      case 8:
        ctx.transform(0, -1, 1, 0, 0, drawW);
        break;
      default:
        break;
    }

    ctx.drawImage(img, 0, 0, drawW, drawH);
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      exifOrientation: orientation,
      imageData,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
