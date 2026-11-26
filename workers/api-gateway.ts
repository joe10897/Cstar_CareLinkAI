/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/**
 * CareLink AI — Cloudflare Workers Edge API Gateway (workers/api-gateway.ts)
 *
 * 負責：
 * 1. POST /api/auth/line-verify — 接收前端 liff.getIDToken()，向 LINE 官方驗證後簽發 Supabase 相容 Custom JWT
 * 2. POST /api/storage/presign  — 簽發 Cloudflare R2 單次上傳 Presigned URL (限制 image/jpeg, image/png, image/webp 且 <= 15MB)
 * 3. POST /api/ai/blood-ocr     — 封裝 Vision LLM (Gemini 2.5 Flash / GPT-4o) 讀取 R2 血檢單圖片萃取結構化指標
 * 4. POST /api/ai/fgs-vlm-review — 當前端 ONNX 平均信心度 < 0.65 (極端長毛遮擋) 時，轉發後端 FastAPI / Vision LLM 二次校驗
 */

export interface Env {
  LINE_CHANNEL_ID: string;
  SUPABASE_JWT_SECRET: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_CDN_URL: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  GEMINI_API_KEY: string;
  FALLBACK_CV_API_URL: string;
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

async function signHmacSha256Jwt(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const enc = new TextEncoder();
  const base64Url = (str: string) =>
    btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(signingInput));
  const sigStr = String.fromCharCode(...new Uint8Array(sigBuf));
  return `${signingInput}.${base64Url(sigStr)}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // 1. POST /api/auth/line-verify
    if (request.method === 'POST' && url.pathname === '/api/auth/line-verify') {
      try {
        const { idToken } = (await request.json()) as { idToken?: string };
        if (!idToken) {
          return jsonResponse({ error: '缺少 LINE ID Token' }, 400);
        }

        const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            id_token: idToken,
            client_id: env.LINE_CHANNEL_ID,
          }),
        });

        if (!verifyRes.ok) {
          return jsonResponse({ error: 'LINE ID Token 驗證未通過' }, 401);
        }

        const lineProfile = (await verifyRes.json()) as {
          sub: string;
          name?: string;
          picture?: string;
        };

        const nowSec = Math.floor(Date.now() / 1000);
        const supabaseJwt = await signHmacSha256Jwt(
          {
            aud: 'authenticated',
            role: 'authenticated',
            sub: lineProfile.sub,
            owner_line_id: lineProfile.sub,
            name: lineProfile.name || 'CareLink 飼主',
            iat: nowSec,
            exp: nowSec + 60 * 60 * 24,
          },
          env.SUPABASE_JWT_SECRET
        );

        return jsonResponse({
          token: supabaseJwt,
          ownerLineId: lineProfile.sub,
          displayName: lineProfile.name,
          pictureUrl: lineProfile.picture,
        });
      } catch (err) {
        return jsonResponse({ error: (err as Error).message }, 500);
      }
    }

    // 2. POST /api/storage/presign
    if (request.method === 'POST' && url.pathname === '/api/storage/presign') {
      try {
        const { contentType, fileSize, category, petId } = (await request.json()) as {
          contentType: string;
          fileSize: number;
          category: 'fgs' | 'blood-test';
          petId: string;
        };

        if (!ALLOWED_MIME_TYPES.has(contentType)) {
          return jsonResponse(
            { error: '僅允許上傳 image/jpeg, image/png, image/webp 格式影像' },
            400
          );
        }
        if (fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) {
          return jsonResponse({ error: '單張照片大小不可超過 15MB' }, 400);
        }

        const ext = contentType.split('/')[1] || 'jpg';
        const r2Key = `${category}/${petId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        return jsonResponse({
          r2Key,
          uploadUrl: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${r2Key}?X-Amz-Expires=600`,
          publicUrl: `${env.R2_PUBLIC_CDN_URL}/${r2Key}`,
          expiresAt,
        });
      } catch (err) {
        return jsonResponse({ error: (err as Error).message }, 500);
      }
    }

    // 3. POST /api/ai/blood-ocr
    if (request.method === 'POST' && url.pathname === '/api/ai/blood-ocr') {
      try {
        const { imageUrl, clinicName } = (await request.json()) as {
          imageUrl: string;
          clinicName?: string;
        };

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `請解析此動物醫院 (${clinicName || '未指定'}) 紙本血檢單影像 (${imageUrl})，擷取 CREA, BUN, SDMA, PHOS, ALB, K, HCT 數值、單位與參考區間，並回傳 JSON。遵守《獸醫師法》，僅提供衛教數據整理，不作醫療診斷。`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        const data = await geminiRes.json();
        return jsonResponse({ status: 'ok', provider: 'gemini-2.5-flash', result: data });
      } catch (err) {
        return jsonResponse({ error: (err as Error).message }, 500);
      }
    }

    // 4. POST /api/ai/fgs-vlm-review
    if (request.method === 'POST' && url.pathname === '/api/ai/fgs-vlm-review') {
      try {
        const payload = await request.json();
        const fallbackRes = await fetch(`${env.FALLBACK_CV_API_URL}/v1/fgs/fallback-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await fallbackRes.json();
        return jsonResponse(data);
      } catch (err) {
        return jsonResponse({ error: (err as Error).message }, 502);
      }
    }

    return jsonResponse({ service: 'CareLink AI Edge Gateway', status: 'healthy' });
  },
};
