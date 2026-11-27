/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/**
 * PetPulse AI — Production Cloudflare Workers Full-Stack Edge API
 *
 * Capabilities:
 * - Complete Authentication: Email + PBKDF2-SHA256 Password, Invite Codes (20-30 testers),
 *   HttpOnly Session Cookies + Bearer token fallback, One-Click Demo Sandbox, Admin RBAC.
 * - Cloudflare D1 Relational Persistence: Users, Pets, Daily Care Logs, FGS 48-Pt Scans,
 *   Blood Test OCR Records, AI Chat History, Clinic Referrals, Public Share Packets,
 *   D1-backed Media Objects, User Event Telemetry, and Beta Tester Pricing/Usability Surveys.
 * - Real Multimodal AI Inference: Cloudflare Workers AI (Llama 4 Scout Vision + Mistral Small 3.1
 *   Vision fallback) with optional Gemini 2.5 Flash primary when GEMINI_API_KEY secret is set.
 * - Admin Beta Analytics & CSV/JSON Data Export for 20-30 user validation cohort.
 */

export interface Env {
  DB: D1Database;
  AI: Ai;
  ASSETS: Fetcher;
  APP_NAME?: string;
  APP_ENV?: string;
  REQUIRE_INVITE_CODE?: string;
  WORKERS_AI_VISION_MODEL?: string;
  WORKERS_AI_VISION_FALLBACK_MODEL?: string;
  WORKERS_AI_CHAT_MODEL?: string;
  SESSION_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_INVITE_CODE?: string;
  GEMINI_API_KEY?: string;
  LINE_CHANNEL_ID?: string;
}

interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: 'owner' | 'sitter' | 'admin';
  invite_code_used: string | null;
  cohort_label: string;
  is_demo: boolean;
  created_at: string;
  last_login_at: string;
}

const SESSION_COOKIE_NAME = 'petpulse_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days
const MAX_MEDIA_DATA_URL_CHARS = 920_000; // Fits safely under D1 1MB row limit
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const BASE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (origin) {
    return { ...BASE_CORS_HEADERS, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
  }
  return { ...BASE_CORS_HEADERS, 'Access-Control-Allow-Origin': '*' };
}

function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...getCorsHeaders(request),
      ...extraHeaders,
    },
  });
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return bytesToHex(new Uint8Array(buf));
}

async function hashPasswordPbkdf2(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const salt = saltHex || bytesToHex(saltBytes);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt };
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

function buildSessionCookie(token: string, requestUrl: URL, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (requestUrl.protocol === 'https:') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function extractSessionToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  const cookies = parseCookies(request.headers.get('Cookie'));
  return cookies[SESSION_COOKIE_NAME] || null;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function createSession(
  env: Env,
  userId: string,
  request: Request
): Promise<{ token: string; cookieHeader: string }> {
  const rawToken = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(rawToken + (env.SESSION_SECRET || 'petpulse-edge-salt'));
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  const ua = (request.headers.get('User-Agent') || '').slice(0, 240);

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, user_agent, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      `sess-${crypto.randomUUID().slice(0, 12)}`,
      userId,
      tokenHash,
      ua,
      now.toISOString(),
      expires.toISOString()
    )
    .run();

  const url = new URL(request.url);
  return {
    token: rawToken,
    cookieHeader: buildSessionCookie(rawToken, url, SESSION_TTL_SECONDS),
  };
}

async function getAuthenticatedUser(request: Request, env: Env): Promise<AuthUser | null> {
  const rawToken = extractSessionToken(request);
  if (!rawToken) return null;
  const tokenHash = await sha256Hex(rawToken + (env.SESSION_SECRET || 'petpulse-edge-salt'));
  const nowIso = new Date().toISOString();

  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.role, u.invite_code_used, u.cohort_label,
            u.is_demo, u.created_at, u.last_login_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
     LIMIT 1`
  )
    .bind(tokenHash, nowIso)
    .first<{
      id: string;
      email: string;
      display_name: string;
      role: 'owner' | 'sitter' | 'admin';
      invite_code_used: string | null;
      cohort_label: string;
      is_demo: number;
      created_at: string;
      last_login_at: string;
    }>();

  if (!row) return null;
  return {
    ...row,
    is_demo: Boolean(row.is_demo),
  };
}

async function logUserEvent(
  env: Env,
  userId: string,
  eventType: string,
  pagePath = '',
  petId = '',
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO user_events (id, user_id, event_type, page_path, pet_id, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        `evt-${crypto.randomUUID().slice(0, 12)}`,
        userId,
        eventType.slice(0, 64),
        pagePath.slice(0, 180),
        petId.slice(0, 64),
        JSON.stringify(metadata).slice(0, 2000),
        new Date().toISOString()
      )
      .run();
  } catch (err) {
    console.error('Event logging failed:', err);
  }
}

function buildStarterBaselineMetrics() {
  return {
    interOcularBaseDist: 0.24,
    leftEAR: 0.42,
    rightEAR: 0.42,
    meanEAR: 0.42,
    earSymmetryRatio: 0.0,
    leftEarAngleDeg: 18,
    rightEarAngleDeg: 18,
    meanEarAngleDeg: 18,
    earSpanRatio: 2.08,
    muzzleRatio: 1.48,
    muzzleEllipticity: 0.34,
    whiskerForwardAngleDeg: 6,
    headRollAngleDeg: 0,
  };
}

async function seedStarterPetForUser(
  env: Env,
  userId: string,
  petInput?: {
    name?: string;
    species?: 'cat' | 'dog';
    breed?: string;
    age_label?: string;
    weight_kg?: number;
    coat_length?: 'short' | 'long';
    chronic_conditions?: string[];
  }
): Promise<string> {
  const now = new Date().toISOString();
  const petId = `pet-${crypto.randomUUID().slice(0, 10)}`;
  const species = petInput?.species === 'dog' ? 'dog' : 'cat';
  const rawName = (petInput?.name || (species === 'dog' ? '毛寶（Buddy）' : '小橘（Mimi）')).trim();
  const shortName = rawName.split(/[（(]/)[0].trim().slice(0, 12) || rawName.slice(0, 8);
  const breed = (petInput?.breed || (species === 'dog' ? '米克斯犬' : '米克斯貓')).trim();
  const ageLabel = (petInput?.age_label || '7y').trim();
  const weightKg = Number(petInput?.weight_kg) > 0 ? Number(petInput?.weight_kg) : species === 'dog' ? 9.5 : 4.5;
  const coatLength = petInput?.coat_length === 'long' ? 'long' : 'short';
  const conditions =
    Array.isArray(petInput?.chronic_conditions) && petInput.chronic_conditions.length > 0
      ? petInput.chronic_conditions
      : ['居家健康與疼痛定期追蹤'];
  const avatar = species === 'dog' ? '/images/yuanyuan-shiba.jpg' : '/images/latte-ginger.jpg';

  await env.DB.prepare(
    `INSERT INTO pets (
      id, user_id, name, short_name, species, breed, age_label, weight_kg, microchip_id,
      coat_length, birth_date, chronic_conditions_json, baseline_landmarks_json,
      baseline_metrics_json, baseline_image_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      petId,
      userId,
      rawName,
      shortName,
      species,
      breed,
      ageLabel,
      weightKg,
      '',
      coatLength,
      '2019-06-01',
      JSON.stringify(conditions),
      '[]',
      JSON.stringify(buildStarterBaselineMetrics()),
      avatar,
      now,
      now
    )
    .run();

  await env.DB.prepare(
    `INSERT INTO daily_care_logs (
      id, user_id, pet_id, log_date, water_ml, water_target_ml, appetite, bristol_scale,
      urine_clumps, subq_fluid_ml, subq_target_ml, weight_kg, med_evening_bp_done,
      memo_text, memo_image_url, sitter_handover_active, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      `care-${crypto.randomUUID().slice(0, 10)}`,
      userId,
      petId,
      todayIsoDate(),
      150,
      species === 'dog' ? 450 : 220,
      'normal',
      4,
      3,
      0,
      100,
      weightKg,
      0,
      '歡迎開始 PetPulse AI 居家照護紀錄！可點擊 +50ml 或立即體驗真實 AI 貓臉快篩。',
      '',
      0,
      now
    )
    .run();

  return petId;
}

async function seedDemoSandboxData(env: Env, userId: string): Promise<void> {
  const now = new Date().toISOString();
  const baseMetrics = JSON.stringify(buildStarterBaselineMetrics());
  const misoId = `pet-${crypto.randomUUID().slice(0, 8)}`;
  const latteId = `pet-${crypto.randomUUID().slice(0, 8)}`;
  const yuanId = `pet-${crypto.randomUUID().slice(0, 8)}`;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO pets (id, user_id, name, short_name, species, breed, age_label, weight_kg, microchip_id, coat_length, birth_date, chronic_conditions_json, baseline_landmarks_json, baseline_metrics_json, baseline_image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)`
    ).bind(
      misoId,
      userId,
      '咪寶（Miso）',
      '咪寶',
      'cat',
      '布偶貓',
      '8y 2m',
      4.82,
      '900138001049281',
      'long',
      '2018-04-12',
      JSON.stringify(['IRIS 腎病第 2 期', '每日皮下點滴']),
      baseMetrics,
      '/images/miso-ragdoll.jpg',
      now,
      now
    ),
    env.DB.prepare(
      `INSERT INTO pets (id, user_id, name, short_name, species, breed, age_label, weight_kg, microchip_id, coat_length, birth_date, chronic_conditions_json, baseline_landmarks_json, baseline_metrics_json, baseline_image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)`
    ).bind(
      latteId,
      userId,
      '拿鐵（Latte）',
      '拿鐵',
      'cat',
      '橘貓米克斯',
      '13y',
      3.85,
      '900138001083712',
      'short',
      '2013-09-20',
      JSON.stringify(['齒吸收術後照護', '早期腎指數監測']),
      baseMetrics,
      '/images/latte-ginger.jpg',
      now,
      now
    ),
    env.DB.prepare(
      `INSERT INTO pets (id, user_id, name, short_name, species, breed, age_label, weight_kg, microchip_id, coat_length, birth_date, chronic_conditions_json, baseline_landmarks_json, baseline_metrics_json, baseline_image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)`
    ).bind(
      yuanId,
      userId,
      '圓圓（Yuan）',
      '圓圓',
      'dog',
      '赤柴犬',
      '11y',
      9.6,
      '900138001092455',
      'short',
      '2015-02-14',
      JSON.stringify(['退化性關節炎追蹤', '心臟瓣膜定期聽診']),
      baseMetrics,
      '/images/yuanyuan-shiba.jpg',
      now,
      now
    ),
    env.DB.prepare(
      `INSERT INTO daily_care_logs (id, user_id, pet_id, log_date, water_ml, water_target_ml, appetite, bristol_scale, urine_clumps, subq_fluid_ml, subq_target_ml, weight_kg, med_evening_bp_done, memo_text, memo_image_url, sitter_handover_active, updated_at)
       VALUES (?, ?, ?, ?, 180, 250, 'normal', 4, 3, 100, 100, 4.82, 0, '精神活力良好，呼吸頻率 22 次/分，早餐主食罐 45g 已完食。', '', 1, ?)`
    ).bind(`care-${crypto.randomUUID().slice(0, 8)}`, userId, misoId, todayIsoDate(), now),
    env.DB.prepare(
      `INSERT INTO blood_test_records (id, user_id, pet_id, test_date, clinic_name, analyzer_brand, r2_image_key, image_url, metrics_json, iris_stage, ai_provider, ai_summary, recommended_supplements_json, is_confirmed_by_owner, created_at)
       VALUES (?, ?, ?, '2026-09-12', '沐光伴侶動物內科暨影像中心', 'IDEXX Catalyst', 'demo/blood-0912.jpg', '', ?, 'Stage 2', 'demo-seed', '跨院檢驗顯示 CREA 2.5 mg/dL、SDMA 16 µg/dL，建議維持飲水與低磷飲食追蹤。', '[]', 1, ?)`
    ).bind(
      `blood-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      misoId,
      JSON.stringify({
        CREA: { val: 2.5, unit: 'mg/dL', ref_min: 0.8, ref_max: 2.4, flag: 'HIGH', label: '肌酸酐' },
        BUN: { val: 38, unit: 'mg/dL', ref_min: 16, ref_max: 36, flag: 'HIGH', label: '血中尿素氮' },
        SDMA: { val: 16, unit: 'µg/dL', ref_min: 0, ref_max: 14, flag: 'HIGH', label: '對稱二甲基精氨酸' },
        PHOS: { val: 5.1, unit: 'mg/dL', ref_min: 3.1, ref_max: 6.8, flag: 'NORMAL', label: '血磷' },
        ALB: { val: 3.1, unit: 'g/dL', ref_min: 2.3, ref_max: 3.9, flag: 'NORMAL', label: '白蛋白' },
        K: { val: 4.1, unit: 'mmol/L', ref_min: 3.5, ref_max: 5.8, flag: 'NORMAL', label: '血鉀' },
        HCT: { val: 32.8, unit: '%', ref_min: 30.3, ref_max: 52.3, flag: 'NORMAL', label: '血容比' },
      }),
      now
    ),
    env.DB.prepare(
      `INSERT INTO blood_test_records (id, user_id, pet_id, test_date, clinic_name, analyzer_brand, r2_image_key, image_url, metrics_json, iris_stage, ai_provider, ai_summary, recommended_supplements_json, is_confirmed_by_owner, created_at)
       VALUES (?, ?, ?, '2026-11-02', '安禾高齡貓專科動物醫院', 'IDEXX Catalyst', 'demo/blood-1102.jpg', '', ?, 'Stage 3', 'demo-seed', '最新血檢 CREA 2.9 mg/dL、PHOS 5.9 mg/dL，建議與主治獸醫師討論血磷控制與補水計畫。', '[]', 1, ?)`
    ).bind(
      `blood-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      misoId,
      JSON.stringify({
        CREA: { val: 2.9, unit: 'mg/dL', ref_min: 0.8, ref_max: 2.4, flag: 'HIGH', label: '肌酸酐' },
        BUN: { val: 44, unit: 'mg/dL', ref_min: 16, ref_max: 36, flag: 'HIGH', label: '血中尿素氮' },
        SDMA: { val: 19, unit: 'µg/dL', ref_min: 0, ref_max: 14, flag: 'HIGH', label: '對稱二甲基精氨酸' },
        PHOS: { val: 5.9, unit: 'mg/dL', ref_min: 3.1, ref_max: 6.8, flag: 'NORMAL', label: '血磷' },
        ALB: { val: 3.0, unit: 'g/dL', ref_min: 2.3, ref_max: 3.9, flag: 'NORMAL', label: '白蛋白' },
        K: { val: 3.7, unit: 'mmol/L', ref_min: 3.5, ref_max: 5.8, flag: 'NORMAL', label: '血鉀' },
        HCT: { val: 30.8, unit: '%', ref_min: 30.3, ref_max: 52.3, flag: 'NORMAL', label: '血容比' },
      }),
      now
    ),
  ]);
}

// ============================================================
// Real Multimodal AI Helpers (Gemini optional + Workers AI)
// ============================================================

function extractJsonObject(rawText: string): Record<string, unknown> | null {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), base64: match[2].replace(/\s+/g, '') };
}

function extractWorkersAiText(result: unknown): string {
  if (!result) return '';
  if (typeof result === 'string') return result;
  const obj = result as Record<string, unknown>;
  if (typeof obj.response === 'string') return obj.response;
  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const msg = (obj.choices[0] as Record<string, unknown>).message as Record<string, unknown> | undefined;
    if (typeof msg?.content === 'string') return msg.content;
  }
  return JSON.stringify(result);
}

async function runVisionOrTextAI(
  env: Env,
  options: {
    systemPrompt: string;
    userPrompt: string;
    imageDataUrl?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<{ text: string; provider: string; model: string }> {
  const maxTokens = options.maxTokens ?? 1100;
  const temperature = options.temperature ?? 0.2;

  // 1. Optional Gemini 2.5 Flash primary if user later sets GEMINI_API_KEY secret
  if (env.GEMINI_API_KEY) {
    try {
      const parts: Array<Record<string, unknown>> = [{ text: `${options.systemPrompt}\n\n${options.userPrompt}` }];
      if (options.imageDataUrl) {
        const parsed = parseDataUrl(options.imageDataUrl);
        if (parsed) {
          parts.push({ inline_data: { mime_type: parsed.mimeType, data: parsed.base64 } });
        }
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n').trim();
        if (text) {
          return { text, provider: 'gemini', model: 'gemini-2.5-flash' };
        }
      }
    } catch (err) {
      console.warn('Gemini call failed, falling back to Cloudflare Workers AI:', err);
    }
  }

  // 2. Cloudflare Workers AI (Native Multimodal Llama 4 Scout -> Fallback Mistral Small 3.1)
  const primaryModel = env.WORKERS_AI_VISION_MODEL || '@cf/meta/llama-4-scout-17b-16e-instruct';
  const fallbackModel = env.WORKERS_AI_VISION_FALLBACK_MODEL || '@cf/mistralai/mistral-small-3.1-24b-instruct';

  const userContent = options.imageDataUrl
    ? [
        { type: 'text', text: options.userPrompt },
        { type: 'image_url', image_url: { url: options.imageDataUrl } },
      ]
    : options.userPrompt;

  const messages = [
    { role: 'system', content: options.systemPrompt },
    { role: 'user', content: userContent },
  ];

  const modelsToTry = [primaryModel, fallbackModel];
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const output = await env.AI.run(model as keyof AiModels, {
        messages,
        max_tokens: maxTokens,
        temperature,
      } as never);
      const text = extractWorkersAiText(output).trim();
      if (text) {
        return { text, provider: 'cloudflare-workers-ai', model };
      }
    } catch (err) {
      lastError = err;
      console.warn(`Workers AI model ${model} failed:`, err);
    }
  }

  throw new Error(`AI 推論服務暫時繁忙：${lastError instanceof Error ? lastError.message : 'unknown error'}`);
}

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(val));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampFloat(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return '\uFEFF' + lines.join('\r\n'); // UTF-8 BOM for Windows Excel
}

// ============================================================
// Main Worker Entrypoint
// ============================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Non-API routes are served by Cloudflare Workers Static Assets (SPA)
    if (!path.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    try {
      // ----------------------------------------------------------
      // 0. Health Check
      // ----------------------------------------------------------
      if (request.method === 'GET' && path === '/api/health') {
        const dbCheck = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
        return jsonResponse(request, {
          service: 'PetPulse AI Edge API',
          status: 'healthy',
          db: dbCheck?.ok === 1 ? 'connected' : 'error',
          aiProvider: env.GEMINI_API_KEY ? 'gemini-2.5-flash + workers-ai' : 'cloudflare-workers-ai',
          visionModel: env.WORKERS_AI_VISION_MODEL || '@cf/meta/llama-4-scout-17b-16e-instruct',
          timestamp: new Date().toISOString(),
        });
      }

      // ----------------------------------------------------------
      // 1. Public Media Serving (GET /api/media/:id)
      // ----------------------------------------------------------
      const mediaMatch = /^\/api\/media\/([a-zA-Z0-9_-]+)$/.exec(path);
      if (request.method === 'GET' && mediaMatch) {
        const mediaId = mediaMatch[1];
        const row = await env.DB.prepare(
          'SELECT mime_type, data_base64 FROM media_objects WHERE id = ? LIMIT 1'
        )
          .bind(mediaId)
          .first<{ mime_type: string; data_base64: string }>();

        if (!row) {
          return jsonResponse(request, { error: '找不到影像檔案' }, 404);
        }

        const binStr = atob(row.data_base64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i += 1) {
          bytes[i] = binStr.charCodeAt(i);
        }
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type': row.mime_type || 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
            ...getCorsHeaders(request),
          },
        });
      }

      // ----------------------------------------------------------
      // 2. Public Vet Share Packet (GET /api/packets/:token)
      // ----------------------------------------------------------
      const packetMatch = /^\/api\/packets\/([a-zA-Z0-9_-]+)$/.exec(path);
      if (request.method === 'GET' && packetMatch) {
        const token = packetMatch[1];
        const referral = await env.DB.prepare(
          `SELECT * FROM clinic_referrals WHERE share_token = ? LIMIT 1`
        )
          .bind(token)
          .first<Record<string, unknown>>();

        if (!referral) {
          return jsonResponse(request, { error: '找不到對應之看診預審封包或連結已失效' }, 404);
        }

        const fgsRow = referral.latest_fgs_record_id
          ? await env.DB.prepare(`SELECT * FROM fgs_records WHERE id = ? LIMIT 1`)
              .bind(String(referral.latest_fgs_record_id))
              .first<Record<string, unknown>>()
          : await env.DB.prepare(
              `SELECT * FROM fgs_records WHERE pet_id = ? ORDER BY created_at DESC LIMIT 1`
            )
              .bind(String(referral.pet_id))
              .first<Record<string, unknown>>();

        const bloodRows = await env.DB.prepare(
          `SELECT * FROM blood_test_records WHERE pet_id = ? ORDER BY test_date ASC`
        )
          .bind(String(referral.pet_id))
          .all<Record<string, unknown>>();

        return jsonResponse(request, {
          referral,
          linkedFgs: fgsRow
            ? {
                ...fgsRow,
                raw_onnx_landmarks: safeJsonParse(String(fgsRow.raw_onnx_landmarks_json || '[]'), []),
                verified_landmarks: fgsRow.verified_landmarks_json
                  ? safeJsonParse(String(fgsRow.verified_landmarks_json), [])
                  : null,
                geometric_metrics: safeJsonParse(String(fgsRow.geometric_metrics_json || '{}'), {}),
                scores: safeJsonParse(String(fgsRow.scores_json || '{}'), {}),
                camera_warnings: safeJsonParse(String(fgsRow.camera_warnings_json || '[]'), []),
                is_verified: Boolean(fgsRow.is_verified),
              }
            : null,
          bloodRecords: (bloodRows.results || []).map((b) => ({
            ...b,
            metrics: safeJsonParse(String(b.metrics_json || '{}'), {}),
            recommended_supplements: safeJsonParse(String(b.recommended_supplements_json || '[]'), []),
            is_confirmed_by_owner: Boolean(b.is_confirmed_by_owner),
          })),
        });
      }

      // ----------------------------------------------------------
      // 3. Authentication Routes
      // ----------------------------------------------------------
      if (request.method === 'GET' && path === '/api/auth/me') {
        const user = await getAuthenticatedUser(request, env);
        return jsonResponse(request, { user });
      }

      if (request.method === 'POST' && path === '/api/auth/register') {
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          password?: string;
          displayName?: string;
          inviteCode?: string;
          role?: 'owner' | 'sitter';
          petName?: string;
          petSpecies?: 'cat' | 'dog';
          petBreed?: string;
          petAgeLabel?: string;
        };

        const email = (body.email || '').trim().toLowerCase();
        const password = body.password || '';
        const displayName = (body.displayName || '').trim() || email.split('@')[0] || 'PetPulse 測試飼主';
        const rawInviteCode = (body.inviteCode || '').trim().toUpperCase();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return jsonResponse(request, { error: '請輸入有效的 Email 地址' }, 400);
        }
        if (password.length < 6) {
          return jsonResponse(request, { error: '密碼長度至少需 6 個字元' }, 400);
        }

        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
          .bind(email)
          .first<{ id: string }>();
        if (existing) {
          return jsonResponse(request, { error: '此 Email 已註冊，請直接登入' }, 409);
        }

        let assignedRole: 'owner' | 'sitter' | 'admin' = body.role === 'sitter' ? 'sitter' : 'owner';
        let cohortLabel = 'beta-2026-open';
        let validatedCode: string | null = null;

        if (env.ADMIN_INVITE_CODE && rawInviteCode && rawInviteCode === env.ADMIN_INVITE_CODE.toUpperCase()) {
          assignedRole = 'admin';
          cohortLabel = 'admin-team';
          validatedCode = 'ADMIN';
        } else if (rawInviteCode) {
          const inviteRow = await env.DB.prepare(
            `SELECT code, cohort_label, max_uses, used_count, is_active
             FROM invite_codes WHERE code = ? LIMIT 1`
          )
            .bind(rawInviteCode)
            .first<{
              code: string;
              cohort_label: string;
              max_uses: number;
              used_count: number;
              is_active: number;
            }>();

          if (!inviteRow || !inviteRow.is_active) {
            return jsonResponse(request, { error: `邀請碼「${rawInviteCode}」無效，請確認後重試（或使用 PETPULSE2026）` }, 400);
          }
          if (inviteRow.used_count >= inviteRow.max_uses) {
            return jsonResponse(request, { error: `邀請碼「${rawInviteCode}」已達使用上限` }, 400);
          }
          cohortLabel = inviteRow.cohort_label;
          validatedCode = inviteRow.code;
          await env.DB.prepare('UPDATE invite_codes SET used_count = used_count + 1 WHERE code = ?')
            .bind(inviteRow.code)
            .run();
        } else if (env.REQUIRE_INVITE_CODE === 'true') {
          return jsonResponse(request, { error: '本階段為受邀封測，請輸入測試邀請碼（如 PETPULSE2026 或 PP-01）' }, 400);
        }

        const { hash, salt } = await hashPasswordPbkdf2(password);
        const now = new Date().toISOString();
        const userId = `usr-${crypto.randomUUID().slice(0, 12)}`;

        await env.DB.prepare(
          `INSERT INTO users (id, email, password_hash, password_salt, display_name, role, invite_code_used, cohort_label, is_demo, created_at, last_login_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
        )
          .bind(userId, email, hash, salt, displayName, assignedRole, validatedCode, cohortLabel, now, now)
          .run();

        const starterPetId = await seedStarterPetForUser(env, userId, {
          name: body.petName,
          species: body.petSpecies,
          breed: body.petBreed,
          age_label: body.petAgeLabel,
        });

        const { token, cookieHeader } = await createSession(env, userId, request);
        ctx.waitUntil(
          logUserEvent(env, userId, 'user_registered', '/login', starterPetId, {
            role: assignedRole,
            inviteCode: validatedCode,
            cohort: cohortLabel,
          })
        );

        const user: AuthUser = {
          id: userId,
          email,
          display_name: displayName,
          role: assignedRole,
          invite_code_used: validatedCode,
          cohort_label: cohortLabel,
          is_demo: false,
          created_at: now,
          last_login_at: now,
        };

        return jsonResponse(
          request,
          { user, sessionToken: token, starterPetId },
          201,
          { 'Set-Cookie': cookieHeader }
        );
      }

      if (request.method === 'POST' && path === '/api/auth/login') {
        const body = (await request.json().catch(() => ({}))) as {
          email?: string;
          password?: string;
        };
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password || '';

        if (!email || !password) {
          return jsonResponse(request, { error: '請輸入 Email 與密碼' }, 400);
        }

        // Lazy admin bootstrap if configured via Cloudflare Worker Secrets
        const configuredAdminEmail = (env.ADMIN_EMAIL || 'admin@petpulse.ai').trim().toLowerCase();
        if (email === configuredAdminEmail && env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD) {
          let adminRow = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
            .bind(configuredAdminEmail)
            .first<{ id: string }>();
          if (!adminRow) {
            const { hash, salt } = await hashPasswordPbkdf2(env.ADMIN_PASSWORD);
            const now = new Date().toISOString();
            const adminId = `usr-admin-${crypto.randomUUID().slice(0, 8)}`;
            await env.DB.prepare(
              `INSERT INTO users (id, email, password_hash, password_salt, display_name, role, invite_code_used, cohort_label, is_demo, created_at, last_login_at)
               VALUES (?, ?, ?, ?, 'PetPulse 系統管理員', 'admin', 'ADMIN', 'admin-team', 0, ?, ?)`
            )
              .bind(adminId, configuredAdminEmail, hash, salt, now, now)
              .run();
            await seedDemoSandboxData(env, adminId);
            adminRow = { id: adminId };
          }
        }

        const userRow = await env.DB.prepare(
          `SELECT id, email, password_hash, password_salt, display_name, role,
                  invite_code_used, cohort_label, is_demo, created_at, last_login_at
           FROM users WHERE email = ? LIMIT 1`
        )
          .bind(email)
          .first<{
            id: string;
            email: string;
            password_hash: string;
            password_salt: string;
            display_name: string;
            role: 'owner' | 'sitter' | 'admin';
            invite_code_used: string | null;
            cohort_label: string;
            is_demo: number;
            created_at: string;
            last_login_at: string;
          }>();

        if (!userRow) {
          return jsonResponse(request, { error: '帳號或密碼不正確' }, 401);
        }

        const { hash } = await hashPasswordPbkdf2(password, userRow.password_salt);
        if (!constantTimeEqualHex(hash, userRow.password_hash)) {
          return jsonResponse(request, { error: '帳號或密碼不正確' }, 401);
        }

        const now = new Date().toISOString();
        await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(now, userRow.id).run();

        const { token, cookieHeader } = await createSession(env, userRow.id, request);
        ctx.waitUntil(logUserEvent(env, userRow.id, 'user_login', '/login', '', { role: userRow.role }));

        const user: AuthUser = {
          id: userRow.id,
          email: userRow.email,
          display_name: userRow.display_name,
          role: userRow.role,
          invite_code_used: userRow.invite_code_used,
          cohort_label: userRow.cohort_label,
          is_demo: Boolean(userRow.is_demo),
          created_at: userRow.created_at,
          last_login_at: now,
        };

        return jsonResponse(request, { user, sessionToken: token }, 200, { 'Set-Cookie': cookieHeader });
      }

      if (request.method === 'POST' && path === '/api/auth/demo') {
        const body = (await request.json().catch(() => ({}))) as { role?: 'owner' | 'sitter' };
        const role = body.role === 'sitter' ? 'sitter' : 'owner';
        const suffix = crypto.randomUUID().slice(0, 6);
        const now = new Date().toISOString();
        const userId = `demo-${suffix}`;
        const email = `demo-${suffix}@sandbox.petpulse.ai`;
        const { hash, salt } = await hashPasswordPbkdf2(crypto.randomUUID());

        await env.DB.prepare(
          `INSERT INTO users (id, email, password_hash, password_salt, display_name, role, invite_code_used, cohort_label, is_demo, created_at, last_login_at)
           VALUES (?, ?, ?, ?, ?, ?, 'DEMO', 'demo-sandbox', 1, ?, ?)`
        )
          .bind(
            userId,
            email,
            hash,
            salt,
            role === 'sitter' ? `體驗保姆 #${suffix.slice(0, 3)}` : `展示體驗飼主 #${suffix.slice(0, 3)}`,
            role,
            now,
            now
          )
          .run();

        await seedDemoSandboxData(env, userId);
        const { token, cookieHeader } = await createSession(env, userId, request);
        ctx.waitUntil(logUserEvent(env, userId, 'demo_session_started', '/login', '', { role }));

        const user: AuthUser = {
          id: userId,
          email,
          display_name: role === 'sitter' ? `體驗保姆 #${suffix.slice(0, 3)}` : `展示體驗飼主 #${suffix.slice(0, 3)}`,
          role,
          invite_code_used: 'DEMO',
          cohort_label: 'demo-sandbox',
          is_demo: true,
          created_at: now,
          last_login_at: now,
        };

        return jsonResponse(request, { user, sessionToken: token }, 201, { 'Set-Cookie': cookieHeader });
      }

      if (request.method === 'POST' && path === '/api/auth/logout') {
        const rawToken = extractSessionToken(request);
        if (rawToken) {
          const tokenHash = await sha256Hex(rawToken + (env.SESSION_SECRET || 'petpulse-edge-salt'));
          await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ?')
            .bind(new Date().toISOString(), tokenHash)
            .run();
        }
        return jsonResponse(request, { ok: true }, 200, {
          'Set-Cookie': buildSessionCookie('', url, 0),
        });
      }

      // ----------------------------------------------------------
      // All routes below require an authenticated user
      // ----------------------------------------------------------
      const user = await getAuthenticatedUser(request, env);
      if (!user) {
        return jsonResponse(request, { error: '請先登入 PetPulse AI 帳號' }, 401);
      }

      // ----------------------------------------------------------
      // 4. Full User Workspace Bootstrap (GET /api/bootstrap)
      // ----------------------------------------------------------
      if (request.method === 'GET' && path === '/api/bootstrap') {
        const [petsRes, careRes, fgsRes, bloodRes, refRes, surveyRes] = await Promise.all([
          env.DB.prepare('SELECT * FROM pets WHERE user_id = ? ORDER BY created_at ASC').bind(user.id).all<Record<string, unknown>>(),
          env.DB.prepare('SELECT * FROM daily_care_logs WHERE user_id = ? ORDER BY log_date DESC').bind(user.id).all<Record<string, unknown>>(),
          user.role === 'admin'
            ? env.DB.prepare('SELECT * FROM fgs_records ORDER BY created_at DESC LIMIT 80').all<Record<string, unknown>>()
            : env.DB.prepare('SELECT * FROM fgs_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 60').bind(user.id).all<Record<string, unknown>>(),
          env.DB.prepare('SELECT * FROM blood_test_records WHERE user_id = ? ORDER BY test_date ASC').bind(user.id).all<Record<string, unknown>>(),
          user.role === 'admin'
            ? env.DB.prepare('SELECT * FROM clinic_referrals ORDER BY created_at DESC LIMIT 80').all<Record<string, unknown>>()
            : env.DB.prepare('SELECT * FROM clinic_referrals WHERE user_id = ? ORDER BY created_at DESC LIMIT 40').bind(user.id).all<Record<string, unknown>>(),
          env.DB.prepare('SELECT * FROM beta_feedback_surveys WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(user.id).first<Record<string, unknown>>(),
        ]);

        // Ensure every authenticated user always has at least 1 pet
        let rawPets = petsRes.results || [];
        if (rawPets.length === 0) {
          await seedStarterPetForUser(env, user.id);
          const refreshed = await env.DB.prepare('SELECT * FROM pets WHERE user_id = ? ORDER BY created_at ASC').bind(user.id).all<Record<string, unknown>>();
          rawPets = refreshed.results || [];
        }

        const pets = rawPets.map((p) => ({
          id: String(p.id),
          owner_line_id: user.id,
          name: String(p.name),
          short_name: String(p.short_name),
          species: String(p.species) as 'cat' | 'dog',
          breed: String(p.breed),
          age_label: String(p.age_label),
          weight_kg: Number(p.weight_kg),
          microchip_id: String(p.microchip_id || ''),
          coat_length: String(p.coat_length) as 'short' | 'long',
          birth_date: String(p.birth_date || '2019-01-01'),
          chronic_conditions: safeJsonParse<string[]>(String(p.chronic_conditions_json || '[]'), []),
          baseline_landmarks: safeJsonParse(String(p.baseline_landmarks_json || '[]'), []),
          baseline_metrics: safeJsonParse(String(p.baseline_metrics_json || '{}'), buildStarterBaselineMetrics()),
          baseline_image_url: String(p.baseline_image_url || '/images/miso-ragdoll.jpg'),
          created_at: String(p.created_at),
        }));

        const dailyCareMap: Record<string, unknown> = {};
        for (const row of careRes.results || []) {
          const petId = String(row.pet_id);
          if (!dailyCareMap[petId]) {
            dailyCareMap[petId] = {
              pet_id: petId,
              date: String(row.log_date),
              water_ml: Number(row.water_ml),
              water_target_ml: Number(row.water_target_ml),
              appetite: String(row.appetite),
              bristol_scale: Number(row.bristol_scale),
              urine_clumps: Number(row.urine_clumps),
              subq_fluid_ml: Number(row.subq_fluid_ml),
              subq_target_ml: Number(row.subq_target_ml),
              weight_kg: Number(row.weight_kg),
              med_evening_bp_done: Boolean(row.med_evening_bp_done),
              memo_text: String(row.memo_text || ''),
              memo_image_url: String(row.memo_image_url || ''),
              sitter_handover_active: Boolean(row.sitter_handover_active),
            };
          }
        }

        const fgsRecords = (fgsRes.results || []).map((r) => ({
          id: String(r.id),
          pet_id: String(r.pet_id),
          pet_name: String(r.pet_name),
          r2_image_key: String(r.r2_image_key || ''),
          image_url: String(r.image_url || '/images/fgs-ragdoll-portrait.jpg'),
          image_width: Number(r.image_width || 720),
          image_height: Number(r.image_height || 864),
          raw_onnx_landmarks: safeJsonParse(String(r.raw_onnx_landmarks_json || '[]'), []),
          verified_landmarks: r.verified_landmarks_json ? safeJsonParse(String(r.verified_landmarks_json), []) : null,
          geometric_metrics: safeJsonParse(String(r.geometric_metrics_json || '{}'), buildStarterBaselineMetrics()),
          scores: safeJsonParse(String(r.scores_json || '{}'), { ear: 0, orbital: 0, muzzle: 0, whisker: 0, head: 0, total: 0 }),
          ai_provider: String(r.ai_provider || 'cloudflare-workers-ai'),
          ai_model: String(r.ai_model || ''),
          ai_confidence: Number(r.ai_confidence ?? 0.85),
          ai_observation_notes: String(r.ai_observation_notes || ''),
          camera_warnings: safeJsonParse(String(r.camera_warnings_json || '[]'), []),
          is_verified: Boolean(r.is_verified),
          verified_by: r.verified_by ? String(r.verified_by) : null,
          created_at: String(r.created_at),
        }));

        const bloodRecords = (bloodRes.results || []).map((b) => ({
          id: String(b.id),
          pet_id: String(b.pet_id),
          test_date: String(b.test_date),
          clinic_name: String(b.clinic_name),
          analyzer_brand: String(b.analyzer_brand || 'IDEXX Catalyst'),
          r2_image_key: String(b.r2_image_key || ''),
          image_url: String(b.image_url || ''),
          metrics: safeJsonParse(String(b.metrics_json || '{}'), {}),
          iris_stage: String(b.iris_stage || 'Stage 1'),
          ai_provider: String(b.ai_provider || 'manual'),
          ai_summary: String(b.ai_summary || ''),
          recommended_supplements: safeJsonParse(String(b.recommended_supplements_json || '[]'), []),
          is_confirmed_by_owner: Boolean(b.is_confirmed_by_owner),
          created_at: String(b.created_at),
        }));

        return jsonResponse(request, {
          user,
          pets,
          dailyCareMap,
          fgsRecords,
          bloodRecords,
          referrals: refRes.results || [],
          hasSubmittedSurvey: Boolean(surveyRes),
        });
      }

      // ----------------------------------------------------------
      // 5. Media Upload (POST /api/media/upload)
      // ----------------------------------------------------------
      if (request.method === 'POST' && path === '/api/media/upload') {
        const body = (await request.json().catch(() => ({}))) as {
          dataUrl?: string;
          category?: string;
          petId?: string;
        };

        if (!body.dataUrl || body.dataUrl.length > MAX_MEDIA_DATA_URL_CHARS) {
          return jsonResponse(request, { error: '影像檔案過大（壓縮後請小於 650KB）或格式不正確' }, 400);
        }

        const parsed = parseDataUrl(body.dataUrl);
        if (!parsed || !ALLOWED_MIME_TYPES.has(parsed.mimeType)) {
          return jsonResponse(request, { error: '僅支援 JPG、PNG 或 WebP 圖片格式' }, 400);
        }

        const mediaId = `med_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        const byteSize = Math.floor((parsed.base64.length * 3) / 4);
        const category = (body.category || 'general').slice(0, 32);
        const petId = (body.petId || '').slice(0, 64);

        await env.DB.prepare(
          `INSERT INTO media_objects (id, user_id, pet_id, category, mime_type, byte_size, data_base64, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(mediaId, user.id, petId, category, parsed.mimeType, byteSize, parsed.base64, new Date().toISOString())
          .run();

        const publicUrl = `/api/media/${mediaId}`;
        ctx.waitUntil(
          logUserEvent(env, user.id, 'media_uploaded', path, petId, { category, byteSize, mimeType: parsed.mimeType })
        );

        return jsonResponse(
          request,
          {
            mediaId,
            r2Key: `${category}/${petId || 'pet'}/${mediaId}`,
            publicUrl,
            byteSize,
          },
          201
        );
      }

      // ----------------------------------------------------------
      // 6. Pets CRUD (POST /api/pets, PATCH /api/pets/:id)
      // ----------------------------------------------------------
      if (request.method === 'POST' && path === '/api/pets') {
        const body = (await request.json().catch(() => ({}))) as {
          name?: string;
          species?: 'cat' | 'dog';
          breed?: string;
          age_label?: string;
          weight_kg?: number;
          coat_length?: 'short' | 'long';
          microchip_id?: string;
          chronic_conditions?: string[];
        };

        if (!body.name?.trim()) {
          return jsonResponse(request, { error: '請輸入毛孩姓名' }, 400);
        }

        const petId = await seedStarterPetForUser(env, user.id, body);
        if (body.microchip_id) {
          await env.DB.prepare('UPDATE pets SET microchip_id = ? WHERE id = ? AND user_id = ?')
            .bind(body.microchip_id.trim().slice(0, 40), petId, user.id)
            .run();
        }
        ctx.waitUntil(logUserEvent(env, user.id, 'pet_created', '/app/profile', petId, { species: body.species || 'cat' }));
        return jsonResponse(request, { id: petId, ok: true }, 201);
      }

      const petPatchMatch = /^\/api\/pets\/([a-zA-Z0-9_-]+)$/.exec(path);
      if (request.method === 'PATCH' && petPatchMatch) {
        const petId = petPatchMatch[1];
        const body = (await request.json().catch(() => ({}))) as {
          baseline_landmarks?: unknown[];
          baseline_metrics?: Record<string, unknown>;
          baseline_image_url?: string;
          weight_kg?: number;
          chronic_conditions?: string[];
        };

        const existing = await env.DB.prepare('SELECT id FROM pets WHERE id = ? AND user_id = ? LIMIT 1')
          .bind(petId, user.id)
          .first<{ id: string }>();
        if (!existing) {
          return jsonResponse(request, { error: '找不到毛孩檔案' }, 404);
        }

        const now = new Date().toISOString();
        if (body.baseline_landmarks && body.baseline_metrics) {
          await env.DB.prepare(
            `UPDATE pets
             SET baseline_landmarks_json = ?, baseline_metrics_json = ?,
                 baseline_image_url = COALESCE(?, baseline_image_url), updated_at = ?
             WHERE id = ? AND user_id = ?`
          )
            .bind(
              JSON.stringify(body.baseline_landmarks),
              JSON.stringify(body.baseline_metrics),
              body.baseline_image_url || null,
              now,
              petId,
              user.id
            )
            .run();
          ctx.waitUntil(logUserEvent(env, user.id, 'pet_baseline_saved', '/app/fgs-scan', petId));
        }

        if (typeof body.weight_kg === 'number' && body.weight_kg > 0) {
          await env.DB.prepare('UPDATE pets SET weight_kg = ?, updated_at = ? WHERE id = ? AND user_id = ?')
            .bind(body.weight_kg, now, petId, user.id)
            .run();
        }

        return jsonResponse(request, { ok: true, id: petId });
      }

      // ----------------------------------------------------------
      // 7. Daily Care Log Upsert (PUT /api/daily-care/:petId)
      // ----------------------------------------------------------
      const careMatch = /^\/api\/daily-care\/([a-zA-Z0-9_-]+)$/.exec(path);
      if (request.method === 'PUT' && careMatch) {
        const petId = careMatch[1];
        const body = (await request.json().catch(() => ({}))) as {
          date?: string;
          water_ml?: number;
          water_target_ml?: number;
          appetite?: 'normal' | 'half' | 'refused';
          bristol_scale?: number;
          urine_clumps?: number;
          subq_fluid_ml?: number;
          subq_target_ml?: number;
          weight_kg?: number;
          med_evening_bp_done?: boolean;
          memo_text?: string;
          memo_image_url?: string;
          sitter_handover_active?: boolean;
        };

        const logDate = (body.date || todayIsoDate()).slice(0, 10);
        const now = new Date().toISOString();
        const id = `care-${crypto.randomUUID().slice(0, 10)}`;

        await env.DB.prepare(
          `INSERT INTO daily_care_logs (
            id, user_id, pet_id, log_date, water_ml, water_target_ml, appetite, bristol_scale,
            urine_clumps, subq_fluid_ml, subq_target_ml, weight_kg, med_evening_bp_done,
            memo_text, memo_image_url, sitter_handover_active, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(pet_id, log_date) DO UPDATE SET
            water_ml = excluded.water_ml,
            water_target_ml = excluded.water_target_ml,
            appetite = excluded.appetite,
            bristol_scale = excluded.bristol_scale,
            urine_clumps = excluded.urine_clumps,
            subq_fluid_ml = excluded.subq_fluid_ml,
            subq_target_ml = excluded.subq_target_ml,
            weight_kg = excluded.weight_kg,
            med_evening_bp_done = excluded.med_evening_bp_done,
            memo_text = excluded.memo_text,
            memo_image_url = excluded.memo_image_url,
            sitter_handover_active = excluded.sitter_handover_active,
            updated_at = excluded.updated_at`
        )
          .bind(
            id,
            user.id,
            petId,
            logDate,
            clampInt(body.water_ml, 0, 3000, 150),
            clampInt(body.water_target_ml, 50, 3000, 220),
            body.appetite === 'half' || body.appetite === 'refused' ? body.appetite : 'normal',
            clampInt(body.bristol_scale, 1, 7, 4),
            clampInt(body.urine_clumps, 0, 30, 3),
            clampInt(body.subq_fluid_ml, 0, 1000, 0),
            clampInt(body.subq_target_ml, 0, 1000, 100),
            clampFloat(body.weight_kg, 0.2, 80, 4.5),
            body.med_evening_bp_done ? 1 : 0,
            (body.memo_text || '').slice(0, 1000),
            (body.memo_image_url || '').slice(0, 300),
            body.sitter_handover_active ? 1 : 0,
            now
          )
          .run();

        ctx.waitUntil(
          logUserEvent(env, user.id, 'daily_care_saved', '/app/home', petId, {
            water_ml: body.water_ml,
            appetite: body.appetite,
            bristol_scale: body.bristol_scale,
            subq_fluid_ml: body.subq_fluid_ml,
          })
        );
        return jsonResponse(request, { ok: true, pet_id: petId, date: logDate });
      }

      // ----------------------------------------------------------
      // 8. FGS Records (POST /api/fgs-records, PATCH verify)
      // ----------------------------------------------------------
      if (request.method === 'POST' && path === '/api/fgs-records') {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const id = `fgs-${crypto.randomUUID().slice(0, 10)}`;
        const now = new Date().toISOString();
        const petId = String(body.pet_id || '');
        const scores = (body.scores as Record<string, unknown>) || {};

        await env.DB.prepare(
          `INSERT INTO fgs_records (
            id, user_id, pet_id, pet_name, r2_image_key, image_url, image_width, image_height,
            raw_onnx_landmarks_json, verified_landmarks_json, geometric_metrics_json, scores_json,
            ai_provider, ai_model, ai_confidence, ai_observation_notes, camera_warnings_json,
            is_verified, verified_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            user.id,
            petId,
            String(body.pet_name || '毛孩'),
            String(body.r2_image_key || ''),
            String(body.image_url || '').slice(0, 500),
            clampInt(body.image_width, 64, 4096, 720),
            clampInt(body.image_height, 64, 4096, 864),
            JSON.stringify(body.raw_onnx_landmarks || []),
            body.verified_landmarks ? JSON.stringify(body.verified_landmarks) : null,
            JSON.stringify(body.geometric_metrics || {}),
            JSON.stringify(scores),
            String(body.ai_provider || 'cloudflare-workers-ai'),
            String(body.ai_model || ''),
            clampFloat(body.ai_confidence, 0, 1, 0.85),
            String(body.ai_observation_notes || '').slice(0, 2000),
            JSON.stringify(body.camera_warnings || []),
            body.is_verified ? 1 : 0,
            body.verified_by ? String(body.verified_by) : null,
            now
          )
          .run();

        ctx.waitUntil(
          logUserEvent(env, user.id, 'fgs_record_saved', '/app/fgs-scan', petId, {
            recordId: id,
            totalScore: scores.total ?? 0,
            provider: body.ai_provider,
          })
        );

        return jsonResponse(request, { id, created_at: now, ok: true }, 201);
      }

      const fgsVerifyMatch = /^\/api\/fgs-records\/([a-zA-Z0-9_-]+)\/verify$/.exec(path);
      if (request.method === 'PATCH' && fgsVerifyMatch) {
        const recordId = fgsVerifyMatch[1];
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const whereClause = user.role === 'admin' ? 'WHERE id = ?' : 'WHERE id = ? AND user_id = ?';
        const stmt = env.DB.prepare(
          `UPDATE fgs_records
           SET verified_landmarks_json = ?, geometric_metrics_json = ?, scores_json = ?,
               ai_observation_notes = ?, is_verified = 1, verified_by = ?
           ${whereClause}`
        );
        const bindings: unknown[] = [
          JSON.stringify(body.verified_landmarks || []),
          JSON.stringify(body.geometric_metrics || {}),
          JSON.stringify(body.scores || {}),
          String(body.ai_observation_notes || ''),
          String(body.verified_by || user.display_name),
          recordId,
        ];
        if (user.role !== 'admin') bindings.push(user.id);
        await stmt.bind(...bindings).run();

        ctx.waitUntil(logUserEvent(env, user.id, 'fgs_record_verified', '/admin/fgs-dataset', '', { recordId }));
        return jsonResponse(request, { ok: true, id: recordId });
      }

      // ----------------------------------------------------------
      // 9. Blood Test Records (POST /api/blood-records)
      // ----------------------------------------------------------
      if (request.method === 'POST' && path === '/api/blood-records') {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const id = `blood-${crypto.randomUUID().slice(0, 10)}`;
        const now = new Date().toISOString();
        const petId = String(body.pet_id || '');

        await env.DB.prepare(
          `INSERT INTO blood_test_records (
            id, user_id, pet_id, test_date, clinic_name, analyzer_brand, r2_image_key, image_url,
            metrics_json, iris_stage, ai_provider, ai_summary, recommended_supplements_json,
            is_confirmed_by_owner, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            user.id,
            petId,
            String(body.test_date || todayIsoDate()).slice(0, 10),
            String(body.clinic_name || '合作動物醫院').slice(0, 120),
            String(body.analyzer_brand || 'IDEXX Catalyst').slice(0, 64),
            String(body.r2_image_key || '').slice(0, 200),
            String(body.image_url || '').slice(0, 500),
            JSON.stringify(body.metrics || {}),
            String(body.iris_stage || 'Stage 1'),
            String(body.ai_provider || 'cloudflare-workers-ai'),
            String(body.ai_summary || '').slice(0, 1500),
            JSON.stringify(body.recommended_supplements || []),
            1,
            now
          )
          .run();

        ctx.waitUntil(
          logUserEvent(env, user.id, 'blood_record_saved', '/app/trends', petId, {
            recordId: id,
            irisStage: body.iris_stage,
          })
        );
        return jsonResponse(request, { id, created_at: now, ok: true }, 201);
      }

      // ----------------------------------------------------------
      // 10. Clinic Referrals (POST /api/referrals, PATCH status)
      // ----------------------------------------------------------
      if (request.method === 'POST' && path === '/api/referrals') {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const id = `ref-${crypto.randomUUID().slice(0, 10)}`;
        const shareToken = `pp-${bytesToHex(crypto.getRandomValues(new Uint8Array(4)))}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();

        const urgency = body.urgency_level === 'red' || body.urgency_level === 'green' ? body.urgency_level : 'yellow';

        await env.DB.prepare(
          `INSERT INTO clinic_referrals (
            id, user_id, pet_id, pet_name, breed, age_years, clinic_id, clinic_name, urgency_level,
            trigger_reason, latest_fgs_record_id, fgs_total_score, crea_value, sdma_value,
            share_token, expires_at, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
        )
          .bind(
            id,
            user.id,
            String(body.pet_id || ''),
            String(body.pet_name || '毛孩'),
            String(body.breed || ''),
            clampInt(body.age_years, 0, 35, 8),
            String(body.clinic_id || 'clinic-taipei-01'),
            String(body.clinic_name || '安禾高齡貓專科動物醫院'),
            urgency,
            String(body.trigger_reason || '').slice(0, 600),
            String(body.latest_fgs_record_id || ''),
            clampInt(body.fgs_total_score, 0, 10, 0),
            clampFloat(body.crea_value, 0, 30, 2.0),
            clampFloat(body.sdma_value, 0, 100, 14.0),
            shareToken,
            expiresAt,
            now.toISOString()
          )
          .run();

        ctx.waitUntil(
          logUserEvent(env, user.id, 'referral_created', '/app/trends', String(body.pet_id || ''), {
            shareToken,
            urgency,
          })
        );

        return jsonResponse(
          request,
          { id, share_token: shareToken, expires_at: expiresAt, status: 'pending', created_at: now.toISOString() },
          201
        );
      }

      const refPatchMatch = /^\/api\/referrals\/([a-zA-Z0-9_-]+)$/.exec(path);
      if (request.method === 'PATCH' && refPatchMatch) {
        const referralId = refPatchMatch[1];
        const body = (await request.json().catch(() => ({}))) as { status?: 'pending' | 'accepted' | 'completed' };
        const status = body.status === 'accepted' || body.status === 'completed' ? body.status : 'pending';
        const whereClause = user.role === 'admin' ? 'WHERE id = ?' : 'WHERE id = ? AND user_id = ?';
        const bindings: unknown[] = [status, referralId];
        if (user.role !== 'admin') bindings.push(user.id);
        await env.DB.prepare(`UPDATE clinic_referrals SET status = ? ${whereClause}`).bind(...bindings).run();
        return jsonResponse(request, { ok: true, id: referralId, status });
      }

      // ----------------------------------------------------------
      // 11. REAL AI #1: Multimodal FGS Visual Pain Screening
      //     POST /api/ai/fgs-analyze
      // ----------------------------------------------------------
      if (request.method === 'POST' && path === '/api/ai/fgs-analyze') {
        const startedAt = Date.now();
        const body = (await request.json().catch(() => ({}))) as {
          imageDataUrl?: string;
          petId?: string;
          petName?: string;
          species?: 'cat' | 'dog';
          breed?: string;
          coatLength?: 'short' | 'long';
        };

        if (!body.imageDataUrl || !parseDataUrl(body.imageDataUrl)) {
          return jsonResponse(request, { error: '請上傳清晰的 JPG、PNG 或 WebP 寵物正面照片' }, 400);
        }

        const speciesLabel = body.species === 'dog' ? '犬（Dog）' : '貓（Cat）';
        const systemPrompt = `你是 PetPulse AI 的專業伴侶動物視覺初篩系統，依據蒙特婁大學 Feline Grimace Scale (FGS) 與犬隻臉部緊繃觀察指標進行非診斷性視覺評估。
你必須只回傳一個合法 JSON 物件，不要加任何 markdown 說明或額外文字。
遵守台灣《獸醫師法》：只能提供「居家視覺初篩與就醫分流建議」，絕不可下醫療確診。`;

        const userPrompt = `請仔細觀察這張實際上傳的寵物照片（物種提示：${speciesLabel}，品種：${body.breed || '未填'}，毛長：${body.coatLength === 'long' ? '長毛' : '短毛'}）。
請判斷畫面中是否真的有清楚的貓或狗臉部，並回傳以下精確 JSON 格式：
{
  "animal_detected": true,
  "detected_species": "cat" | "dog" | "unknown",
  "face_box": { "cx": 0.50, "cy": 0.48, "w": 0.62, "h": 0.68 },
  "coat_occlusion": false,
  "lighting_warning": false,
  "blur_warning": false,
  "scores": {
    "ear": 0,
    "orbital": 0,
    "muzzle": 0,
    "whisker": 0,
    "head": 0
  },
  "confidence": 0.88,
  "visual_findings": "用繁體中文具體描述你在這張照片實際看到的耳朵角度、眼眶張合、口鼻與鬍鬚狀態（50-95字）",
  "triage_advice": "用繁體中文給飼主具體的居家觀察與分流建議，並提醒非醫療診斷（40-80字）"
}
評分標準（每項 0=放鬆正常, 1=中度緊繃/不確定, 2=明顯疼痛/緊繃；若未偵測到動物臉部則 animal_detected=false 且分數全為 0）。
face_box 為臉部中心 (cx, cy) 與寬高 (w, h) 的 0~1 正規化比例座標。`;

        const aiResult = await runVisionOrTextAI(env, {
          systemPrompt,
          userPrompt,
          imageDataUrl: body.imageDataUrl,
          maxTokens: 700,
          temperature: 0.15,
        });

        const parsed = extractJsonObject(aiResult.text) || {};
        const rawScores = (parsed.scores as Record<string, unknown>) || {};
        const ear = clampInt(rawScores.ear, 0, 2, 0);
        const orbital = clampInt(rawScores.orbital, 0, 2, 0);
        const muzzle = clampInt(rawScores.muzzle, 0, 2, 0);
        const whisker = clampInt(rawScores.whisker, 0, 2, 0);
        const head = clampInt(rawScores.head, 0, 2, 0);
        const total = ear + orbital + muzzle + whisker + head;

        const rawBox = (parsed.face_box as Record<string, unknown>) || {};
        const faceBox = {
          cx: clampFloat(rawBox.cx, 0.25, 0.75, 0.5),
          cy: clampFloat(rawBox.cy, 0.25, 0.75, 0.48),
          w: clampFloat(rawBox.w, 0.35, 0.92, 0.64),
          h: clampFloat(rawBox.h, 0.35, 0.92, 0.7),
        };

        const animalDetected = parsed.animal_detected !== false;
        const warnings: string[] = [];
        if (parsed.coat_occlusion) warnings.push('long_hair_occlusion');
        if (parsed.lighting_warning) warnings.push('low_light');
        if (parsed.blur_warning) warnings.push('motion_blur');
        if (!animalDetected) warnings.push('no_animal_face_detected');

        const latencyMs = Date.now() - startedAt;
        const visualFindings =
          typeof parsed.visual_findings === 'string' && parsed.visual_findings.trim()
            ? parsed.visual_findings.trim()
            : 'AI 視覺模型已完成五官結構評估，建議搭配手動微調 48 點確認耳朵與眼眶邊界。';
        const triageAdvice =
          typeof parsed.triage_advice === 'string' && parsed.triage_advice.trim()
            ? parsed.triage_advice.trim()
            : '本結果僅供居家健康初篩參考，若毛孩出現食慾下降或呼吸急促，請儘速洽詢執業獸醫師。';

        const confidence = clampFloat(parsed.confidence, 0.4, 0.99, animalDetected ? 0.86 : 0.42);

        ctx.waitUntil(
          logUserEvent(env, user.id, 'ai_fgs_analyze', '/app/fgs-scan', body.petId || '', {
            provider: aiResult.provider,
            model: aiResult.model,
            latencyMs,
            animalDetected,
            totalScore: total,
            confidence,
          })
        );

        return jsonResponse(request, {
          ok: true,
          provider: aiResult.provider,
          model: aiResult.model,
          latencyMs,
          animal_detected: animalDetected,
          detected_species: String(parsed.detected_species || body.species || 'cat'),
          face_box: faceBox,
          scores: { ear, orbital, muzzle, whisker, head, total },
          confidence,
          warnings,
          visual_findings: visualFindings,
          triage_advice: triageAdvice,
        });
      }

      // ----------------------------------------------------------
      // 12. REAL AI #2: Blood Test Sheet Multimodal OCR
      //     POST /api/ai/blood-ocr
      // ----------------------------------------------------------
      if (request.method === 'POST' && path === '/api/ai/blood-ocr') {
        const startedAt = Date.now();
        const body = (await request.json().catch(() => ({}))) as {
          imageDataUrl?: string;
          clinicName?: string;
          analyzerBrand?: string;
          petId?: string;
        };

        if (!body.imageDataUrl || !parseDataUrl(body.imageDataUrl)) {
          return jsonResponse(request, { error: '請上傳清晰的血檢報告影像（JPG/PNG/WebP）' }, 400);
        }

        const systemPrompt = `你是 PetPulse AI 的獸醫紙本血檢單 OCR 結構化辨識引擎。
你必須只回傳一個合法 JSON 物件，不要加任何 markdown 說明。
請極度小心辨識小數點（例如 2.4 與 24 的差別）。未出現在報告中的項目填 null，切勿捏造數字！遵守《獸醫師法》，僅提供數據整理與衛教提示，不作醫療診斷。`;

        const userPrompt = `請讀取這張動物醫院血檢單影像（提示醫院：${body.clinicName || '自動辨識'}，檢驗儀器：${body.analyzerBrand || '自動辨識'}），回傳以下 JSON：
{
  "is_blood_sheet": true,
  "clinic_name": "辨識出的醫院名稱或空字串",
  "test_date": "YYYY-MM-DD（若無則空字串）",
  "analyzer_brand": "IDEXX Catalyst" | "Abaxis VetScan" | "Fujifilm DRI-CHEM",
  "confidence": 0.90,
  "markers": {
    "CREA": 2.4,
    "BUN": 36,
    "SDMA": 15,
    "PHOS": 4.8,
    "ALB": 3.1,
    "K": 4.2,
    "HCT": 33.5
  },
  "ai_summary": "以繁體中文整理本次實際讀到的重點指標與衛教提醒（50-100字，若非血檢單請誠實說明）",
  "warnings": ["列出模糊或建議飼主人工再次確認小數點的欄位名稱"]
}
重要：只有圖片中實際看到的數值才填數字，沒看到的填 null。`;

        const aiResult = await runVisionOrTextAI(env, {
          systemPrompt,
          userPrompt,
          imageDataUrl: body.imageDataUrl,
          maxTokens: 750,
          temperature: 0.1,
        });

        const parsed = extractJsonObject(aiResult.text) || {};
        const rawMarkers = (parsed.markers as Record<string, unknown>) || {};
        const cleanMarker = (key: string): number | null => {
          const v = rawMarkers[key];
          if (v === null || v === undefined || v === '') return null;
          const n = Number(v);
          return Number.isFinite(n) && n >= 0 ? Number(n.toFixed(2)) : null;
        };

        const markers = {
          CREA: cleanMarker('CREA'),
          BUN: cleanMarker('BUN'),
          SDMA: cleanMarker('SDMA'),
          PHOS: cleanMarker('PHOS'),
          ALB: cleanMarker('ALB'),
          K: cleanMarker('K'),
          HCT: cleanMarker('HCT'),
        };

        const latencyMs = Date.now() - startedAt;
        const extractedCount = Object.values(markers).filter((v) => v !== null).length;

        ctx.waitUntil(
          logUserEvent(env, user.id, 'ai_blood_ocr', '/app/trends', body.petId || '', {
            provider: aiResult.provider,
            model: aiResult.model,
            latencyMs,
            isBloodSheet: parsed.is_blood_sheet !== false,
            extractedCount,
          })
        );

        return jsonResponse(request, {
          ok: true,
          provider: aiResult.provider,
          model: aiResult.model,
          latencyMs,
          is_blood_sheet: parsed.is_blood_sheet !== false,
          clinic_name: typeof parsed.clinic_name === 'string' ? parsed.clinic_name.trim() : '',
          test_date: typeof parsed.test_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.test_date) ? parsed.test_date : '',
          analyzer_brand:
            parsed.analyzer_brand === 'Abaxis VetScan' || parsed.analyzer_brand === 'Fujifilm DRI-CHEM'
              ? parsed.analyzer_brand
              : 'IDEXX Catalyst',
          confidence: clampFloat(parsed.confidence, 0.2, 0.99, extractedCount > 0 ? 0.88 : 0.4),
          markers,
          ai_summary:
            typeof parsed.ai_summary === 'string' && parsed.ai_summary.trim()
              ? parsed.ai_summary.trim()
              : extractedCount > 0
                ? `AI 已辨識出 ${extractedCount} 項血檢指標，請核對小數點後存入跨院病歷。`
                : '未能從此圖片清晰讀出標準血檢數值，請確認圖片為紙本血檢報告，或直接於下方手動填寫數值。',
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String).slice(0, 6) : [],
        });
      }

      // ----------------------------------------------------------
      // 13. REAL AI #3: Contextual AI Triage Chat + History
      //     GET /api/chat/:petId  &  POST /api/ai/chat-triage
      // ----------------------------------------------------------
      const chatGetMatch = /^\/api\/chat\/([a-zA-Z0-9_-]+)$/.exec(path);
      if (request.method === 'GET' && chatGetMatch) {
        const petId = chatGetMatch[1];
        const rows = await env.DB.prepare(
          `SELECT id, role, content, urgency, attachment_url, ai_provider, ai_model, home_checks_json, created_at
           FROM ai_chat_messages
           WHERE user_id = ? AND pet_id = ?
           ORDER BY created_at ASC LIMIT 60`
        )
          .bind(user.id, petId)
          .all<Record<string, unknown>>();

        return jsonResponse(request, {
          messages: (rows.results || []).map((m) => ({
            id: String(m.id),
            role: String(m.role) as 'user' | 'assistant',
            text: String(m.content),
            urgency: m.urgency ? (String(m.urgency) as 'green' | 'yellow' | 'red') : undefined,
            attachmentUrl: m.attachment_url ? String(m.attachment_url) : undefined,
            aiProvider: m.ai_provider ? String(m.ai_provider) : undefined,
            aiModel: m.ai_model ? String(m.ai_model) : undefined,
            homeChecks: m.home_checks_json ? safeJsonParse<string[]>(String(m.home_checks_json), []) : undefined,
            created_at: String(m.created_at),
          })),
        });
      }

      if (request.method === 'POST' && path === '/api/ai/chat-triage') {
        const startedAt = Date.now();
        const body = (await request.json().catch(() => ({}))) as {
          petId?: string;
          message?: string;
          imageDataUrl?: string;
          attachmentUrl?: string;
        };

        const petId = (body.petId || '').trim();
        const userText = (body.message || '').trim();
        if (!petId || !userText) {
          return jsonResponse(request, { error: '請輸入毛孩症狀或提問內容' }, 400);
        }

        // Load real live DB context for this pet
        const [petRow, fgsRow, bloodRow, careRow, recentChat] = await Promise.all([
          env.DB.prepare('SELECT * FROM pets WHERE id = ? AND user_id = ? LIMIT 1').bind(petId, user.id).first<Record<string, unknown>>(),
          env.DB.prepare('SELECT scores_json, ai_observation_notes, created_at FROM fgs_records WHERE pet_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1')
            .bind(petId, user.id)
            .first<Record<string, unknown>>(),
          env.DB.prepare('SELECT test_date, clinic_name, metrics_json, iris_stage FROM blood_test_records WHERE pet_id = ? AND user_id = ? ORDER BY test_date DESC LIMIT 1')
            .bind(petId, user.id)
            .first<Record<string, unknown>>(),
          env.DB.prepare('SELECT water_ml, water_target_ml, appetite, bristol_scale, subq_fluid_ml, weight_kg, memo_text FROM daily_care_logs WHERE pet_id = ? AND user_id = ? ORDER BY log_date DESC LIMIT 1')
            .bind(petId, user.id)
            .first<Record<string, unknown>>(),
          env.DB.prepare('SELECT role, content FROM ai_chat_messages WHERE pet_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 6')
            .bind(petId, user.id)
            .all<{ role: string; content: string }>(),
        ]);

        const petName = petRow ? String(petRow.name) : '毛孩';
        const petSpecies = petRow?.species === 'dog' ? '犬' : '貓';
        const conditions = safeJsonParse<string[]>(String(petRow?.chronic_conditions_json || '[]'), []).join('、') || '無紀錄';
        const latestFgsScore = safeJsonParse<Record<string, number>>(String(fgsRow?.scores_json || '{}'), {}).total ?? '尚無';
        const latestBloodMetrics = safeJsonParse<Record<string, { val?: number }>>(String(bloodRow?.metrics_json || '{}'), {});
        const creaVal = latestBloodMetrics.CREA?.val ?? '尚無';
        const bunVal = latestBloodMetrics.BUN?.val ?? '尚無';
        const sdmaVal = latestBloodMetrics.SDMA?.val ?? '尚無';
        const historySummary = (recentChat.results || [])
          .reverse()
          .map((m) => `${m.role === 'user' ? '飼主' : 'AI'}：${m.content.slice(0, 120)}`)
          .join('\n');

        const systemPrompt = `你是 PetPulse AI 的伴侶動物居家衛教與就醫分流助理，以繁體中文（台灣用語）回覆。
核心原則：
1. 嚴格遵守台灣《獸醫師法》：只做「分流警示（綠燈居家觀察 / 黃燈24-48小時門診 / 紅燈立即急診）」與「居家照護觀察指引」，絕不下疾病確診或開立處方藥劑量。
2. 必須結合該毛孩實際的即時病歷數據回答，不可答非所問。
3. 你必須只回傳一個合法 JSON 物件：
{
  "urgency": "green" | "yellow" | "red",
  "headline": "精簡分流建議標題（12-22字）",
  "reply": "完整衛教與照護分析（100-220字，語氣溫暖專業，結尾簡短註明僅供分流參考）",
  "home_checks": ["居家檢查項目1", "居家檢查項目2", "居家檢查項目3"],
  "should_book_vet": true
}`;

        const userPrompt = `【毛孩即時雲端檔案】
- 姓名／物種：${petName}（${petSpecies}，${petRow?.breed || '米克斯'}，${petRow?.age_label || '未知年齡'}，體重 ${careRow?.weight_kg ?? petRow?.weight_kg ?? '未知'} kg）
- 慢性病史：${conditions}
- 最新 FGS 臉部疼痛初篩：${latestFgsScore}/10（${fgsRow?.ai_observation_notes || '尚無掃描'}）
- 最新血檢（${bloodRow?.test_date || '尚無'}）：CREA ${creaVal} / BUN ${bunVal} / SDMA ${sdmaVal}（${bloodRow?.iris_stage || '無分期'}）
- 今日日常打卡：飲水 ${careRow?.water_ml ?? '無'}/${careRow?.water_target_ml ?? 220} ml、食慾 ${careRow?.appetite || '無'}、大便布里斯托第 ${careRow?.bristol_scale ?? '無'} 型、皮下輸液 ${careRow?.subq_fluid_ml ?? 0} ml
${historySummary ? `\n【近期對話摘要】\n${historySummary}` : ''}

【飼主本次提問】
${userText}`;

        const aiResult = await runVisionOrTextAI(env, {
          systemPrompt,
          userPrompt,
          imageDataUrl: body.imageDataUrl && parseDataUrl(body.imageDataUrl) ? body.imageDataUrl : undefined,
          maxTokens: 900,
          temperature: 0.25,
        });

        const parsed = extractJsonObject(aiResult.text);
        const isRedKeyword = /喘|張口呼吸|癱軟|抽搐|吐血|血便|尿不出|休克|昏迷|中毒/.test(userText);
        const urgency: 'green' | 'yellow' | 'red' =
          parsed?.urgency === 'red' || parsed?.urgency === 'green' || parsed?.urgency === 'yellow'
            ? (parsed.urgency as 'green' | 'yellow' | 'red')
            : isRedKeyword
              ? 'red'
              : 'yellow';

        const headline =
          typeof parsed?.headline === 'string' && parsed.headline.trim()
            ? parsed.headline.trim()
            : urgency === 'red'
              ? '偵測到急症高風險徵兆，建議立即就醫'
              : urgency === 'green'
                ? '目前狀態穩定，可持續居家觀察'
                : '建議 24 至 48 小時內安排門診觀察';

        const replyText =
          typeof parsed?.reply === 'string' && parsed.reply.trim()
            ? parsed.reply.trim()
            : aiResult.text.slice(0, 600);

        const homeChecks =
          Array.isArray(parsed?.home_checks) && parsed.home_checks.length > 0
            ? parsed.home_checks.map(String).slice(0, 4)
            : [
                '翻開牙齦確認黏膜呈淡粉色且微濕潤（微血管回充 < 2 秒）',
                '輕拉肩頸皮膚測試回彈時間（確認有無脫水徵兆）',
                '計算安靜睡眠時每分鐘呼吸次數（貓犬靜止多為 15–30 次/分）',
              ];

        const now1 = new Date().toISOString();
        const now2 = new Date(Date.now() + 5).toISOString();
        const userMsgId = `msg-u-${crypto.randomUUID().slice(0, 10)}`;
        const aiMsgId = `msg-a-${crypto.randomUUID().slice(0, 10)}`;
        const latencyMs = Date.now() - startedAt;

        await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO ai_chat_messages (id, user_id, pet_id, role, content, urgency, attachment_url, created_at)
             VALUES (?, ?, ?, 'user', ?, NULL, ?, ?)`
          ).bind(userMsgId, user.id, petId, userText.slice(0, 2000), body.attachmentUrl || null, now1),
          env.DB.prepare(
            `INSERT INTO ai_chat_messages (id, user_id, pet_id, role, content, urgency, ai_provider, ai_model, home_checks_json, created_at)
             VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?, ?, ?)`
          ).bind(
            aiMsgId,
            user.id,
            petId,
            replyText.slice(0, 3000),
            urgency,
            aiResult.provider,
            aiResult.model,
            JSON.stringify(homeChecks),
            now2
          ),
        ]);

        ctx.waitUntil(
          logUserEvent(env, user.id, 'ai_chat_triage', '/app/chat', petId, {
            provider: aiResult.provider,
            model: aiResult.model,
            latencyMs,
            urgency,
            hasImage: Boolean(body.imageDataUrl),
          })
        );

        return jsonResponse(request, {
          ok: true,
          provider: aiResult.provider,
          model: aiResult.model,
          latencyMs,
          userMessageId: userMsgId,
          assistantMessageId: aiMsgId,
          urgency,
          headline,
          reply: replyText,
          homeChecks,
          shouldBookVet: Boolean(parsed?.should_book_vet ?? urgency !== 'green'),
        });
      }

      // ----------------------------------------------------------
      // 14. User Event Telemetry & Beta Tester Feedback Survey
      // ----------------------------------------------------------
      if (request.method === 'POST' && path === '/api/events') {
        const body = (await request.json().catch(() => ({}))) as {
          eventType?: string;
          pagePath?: string;
          petId?: string;
          metadata?: Record<string, unknown>;
        };
        if (!body.eventType) {
          return jsonResponse(request, { error: '缺少 eventType' }, 400);
        }
        await logUserEvent(env, user.id, body.eventType, body.pagePath || '', body.petId || '', body.metadata || {});
        return jsonResponse(request, { ok: true }, 201);
      }

      if (request.method === 'GET' && path === '/api/beta-feedback/mine') {
        const rows = await env.DB.prepare(
          'SELECT * FROM beta_feedback_surveys WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
        )
          .bind(user.id)
          .all<Record<string, unknown>>();
        return jsonResponse(request, { surveys: rows.results || [] });
      }

      if (request.method === 'POST' && path === '/api/beta-feedback') {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const id = `surv-${crypto.randomUUID().slice(0, 10)}`;
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO beta_feedback_surveys (
            id, user_id, pet_species, pet_age_group, has_chronic_disease,
            usability_score, fgs_trust_score, ocr_helpfulness_score, nps_score,
            vw_too_cheap_ntd, vw_bargain_ntd, vw_expensive_ntd, vw_too_expensive_ntd,
            most_useful_feature, pain_point_quote, improvement_suggestion, willing_to_subscribe, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            user.id,
            String(body.pet_species || 'cat').slice(0, 24),
            String(body.pet_age_group || '7-11歲熟齡').slice(0, 40),
            body.has_chronic_disease ? 1 : 0,
            clampInt(body.usability_score, 1, 5, 4),
            clampInt(body.fgs_trust_score, 1, 5, 4),
            clampInt(body.ocr_helpfulness_score, 1, 5, 4),
            clampInt(body.nps_score, 0, 10, 8),
            clampInt(body.vw_too_cheap_ntd, 0, 2000, 49),
            clampInt(body.vw_bargain_ntd, 0, 2000, 99),
            clampInt(body.vw_expensive_ntd, 0, 3000, 199),
            clampInt(body.vw_too_expensive_ntd, 0, 5000, 299),
            String(body.most_useful_feature || 'AI 48點臉部疼痛初篩').slice(0, 100),
            String(body.pain_point_quote || '').slice(0, 1000),
            String(body.improvement_suggestion || '').slice(0, 1000),
            String(body.willing_to_subscribe || 'yes_149').slice(0, 40),
            now
          )
          .run();

        ctx.waitUntil(
          logUserEvent(env, user.id, 'beta_survey_submitted', '/app/feedback', '', {
            usability: body.usability_score,
            nps: body.nps_score,
            willing: body.willing_to_subscribe,
          })
        );
        return jsonResponse(request, { ok: true, id, created_at: now }, 201);
      }

      // ----------------------------------------------------------
      // 15. Admin Beta Analytics & Full CSV/JSON Export
      // ----------------------------------------------------------
      if (path.startsWith('/api/admin/')) {
        if (user.role !== 'admin') {
          return jsonResponse(request, { error: '需要系統管理員權限（請以管理員帳號登入）' }, 403);
        }

        if (request.method === 'GET' && path === '/api/admin/beta-summary') {
          const [counts, userRoster, surveys, inviteCodes, recentEvents, eventBreakdown] = await Promise.all([
            env.DB.prepare(
              `SELECT
                (SELECT COUNT(*) FROM users WHERE is_demo = 0 AND role != 'admin') AS real_testers,
                (SELECT COUNT(*) FROM users WHERE is_demo = 1) AS demo_users,
                (SELECT COUNT(*) FROM pets) AS total_pets,
                (SELECT COUNT(*) FROM daily_care_logs) AS total_care_logs,
                (SELECT COUNT(*) FROM fgs_records) AS total_fgs_records,
                (SELECT COUNT(*) FROM blood_test_records) AS total_blood_records,
                (SELECT COUNT(*) FROM ai_chat_messages WHERE role = 'user') AS total_ai_chats,
                (SELECT COUNT(*) FROM clinic_referrals) AS total_referrals,
                (SELECT COUNT(*) FROM media_objects) AS total_media_uploads,
                (SELECT COUNT(*) FROM user_events) AS total_events,
                (SELECT COUNT(*) FROM beta_feedback_surveys) AS total_surveys`
            ).first<Record<string, number>>(),
            env.DB.prepare(
              `SELECT
                u.id, u.email, u.display_name, u.role, u.invite_code_used, u.cohort_label, u.is_demo,
                u.created_at, u.last_login_at,
                (SELECT COUNT(*) FROM pets p WHERE p.user_id = u.id) AS pets_count,
                (SELECT COUNT(*) FROM daily_care_logs d WHERE d.user_id = u.id) AS care_logs_count,
                (SELECT COUNT(*) FROM fgs_records f WHERE f.user_id = u.id) AS fgs_count,
                (SELECT COUNT(*) FROM blood_test_records b WHERE b.user_id = u.id) AS blood_count,
                (SELECT COUNT(*) FROM ai_chat_messages c WHERE c.user_id = u.id AND c.role = 'user') AS chat_count,
                (SELECT COUNT(*) FROM user_events e WHERE e.user_id = u.id) AS events_count,
                (SELECT COUNT(*) FROM beta_feedback_surveys s WHERE s.user_id = u.id) AS survey_count
               FROM users u
               ORDER BY u.created_at DESC LIMIT 100`
            ).all<Record<string, unknown>>(),
            env.DB.prepare(
              `SELECT s.*, u.display_name, u.email, u.invite_code_used, u.cohort_label
               FROM beta_feedback_surveys s
               JOIN users u ON u.id = s.user_id
               ORDER BY s.created_at DESC LIMIT 100`
            ).all<Record<string, unknown>>(),
            env.DB.prepare('SELECT * FROM invite_codes ORDER BY code ASC').all<Record<string, unknown>>(),
            env.DB.prepare(
              `SELECT e.id, e.event_type, e.page_path, e.pet_id, e.metadata_json, e.created_at,
                      u.display_name, u.email, u.invite_code_used
               FROM user_events e
               JOIN users u ON u.id = e.user_id
               ORDER BY e.created_at DESC LIMIT 80`
            ).all<Record<string, unknown>>(),
            env.DB.prepare(
              `SELECT event_type, COUNT(*) AS count
               FROM user_events
               GROUP BY event_type
               ORDER BY count DESC`
            ).all<{ event_type: string; count: number }>(),
          ]);

          const surveyList = surveys.results || [];
          const avg = (key: string) =>
            surveyList.length
              ? Number(
                  (
                    surveyList.reduce((acc, s) => acc + Number(s[key] || 0), 0) / surveyList.length
                  ).toFixed(2)
                )
              : 0;

          return jsonResponse(request, {
            counts: counts || {},
            surveyAverages: {
              usability_score: avg('usability_score'),
              fgs_trust_score: avg('fgs_trust_score'),
              ocr_helpfulness_score: avg('ocr_helpfulness_score'),
              nps_score: avg('nps_score'),
              vw_too_cheap_ntd: avg('vw_too_cheap_ntd'),
              vw_bargain_ntd: avg('vw_bargain_ntd'),
              vw_expensive_ntd: avg('vw_expensive_ntd'),
              vw_too_expensive_ntd: avg('vw_too_expensive_ntd'),
            },
            users: userRoster.results || [],
            surveys: surveyList,
            inviteCodes: inviteCodes.results || [],
            recentEvents: recentEvents.results || [],
            eventBreakdown: eventBreakdown.results || [],
          });
        }

        if (request.method === 'GET' && path === '/api/admin/export') {
          const dataset = url.searchParams.get('dataset') || 'all';
          const format = url.searchParams.get('format') || 'json';
          const stamp = new Date().toISOString().slice(0, 10);

          if (format === 'csv' && dataset !== 'all') {
            const queryMap: Record<string, { sql: string; headers: string[] }> = {
              users: {
                sql: `SELECT id, email, display_name, role, invite_code_used, cohort_label, is_demo, created_at, last_login_at FROM users ORDER BY created_at DESC`,
                headers: ['id', 'email', 'display_name', 'role', 'invite_code_used', 'cohort_label', 'is_demo', 'created_at', 'last_login_at'],
              },
              surveys: {
                sql: `SELECT s.id, u.display_name, u.email, u.invite_code_used, s.pet_species, s.pet_age_group, s.has_chronic_disease, s.usability_score, s.fgs_trust_score, s.ocr_helpfulness_score, s.nps_score, s.vw_too_cheap_ntd, s.vw_bargain_ntd, s.vw_expensive_ntd, s.vw_too_expensive_ntd, s.most_useful_feature, s.willing_to_subscribe, s.pain_point_quote, s.improvement_suggestion, s.created_at FROM beta_feedback_surveys s JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC`,
                headers: [
                  'id', 'display_name', 'email', 'invite_code_used', 'pet_species', 'pet_age_group',
                  'has_chronic_disease', 'usability_score', 'fgs_trust_score', 'ocr_helpfulness_score',
                  'nps_score', 'vw_too_cheap_ntd', 'vw_bargain_ntd', 'vw_expensive_ntd', 'vw_too_expensive_ntd',
                  'most_useful_feature', 'willing_to_subscribe', 'pain_point_quote', 'improvement_suggestion', 'created_at',
                ],
              },
              events: {
                sql: `SELECT e.id, u.email, u.display_name, u.invite_code_used, e.event_type, e.page_path, e.pet_id, e.metadata_json, e.created_at FROM user_events e JOIN users u ON u.id = e.user_id ORDER BY e.created_at DESC`,
                headers: ['id', 'email', 'display_name', 'invite_code_used', 'event_type', 'page_path', 'pet_id', 'metadata_json', 'created_at'],
              },
              fgs: {
                sql: `SELECT f.id, u.email, f.pet_id, f.pet_name, f.ai_provider, f.ai_model, f.ai_confidence, f.scores_json, f.ai_observation_notes, f.is_verified, f.created_at FROM fgs_records f JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC`,
                headers: ['id', 'email', 'pet_id', 'pet_name', 'ai_provider', 'ai_model', 'ai_confidence', 'scores_json', 'ai_observation_notes', 'is_verified', 'created_at'],
              },
              care: {
                sql: `SELECT d.id, u.email, d.pet_id, d.log_date, d.water_ml, d.water_target_ml, d.appetite, d.bristol_scale, d.urine_clumps, d.subq_fluid_ml, d.weight_kg, d.memo_text, d.updated_at FROM daily_care_logs d JOIN users u ON u.id = d.user_id ORDER BY d.updated_at DESC`,
                headers: ['id', 'email', 'pet_id', 'log_date', 'water_ml', 'water_target_ml', 'appetite', 'bristol_scale', 'urine_clumps', 'subq_fluid_ml', 'weight_kg', 'memo_text', 'updated_at'],
              },
              blood: {
                sql: `SELECT b.id, u.email, b.pet_id, b.test_date, b.clinic_name, b.analyzer_brand, b.iris_stage, b.ai_provider, b.metrics_json, b.ai_summary, b.created_at FROM blood_test_records b JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC`,
                headers: ['id', 'email', 'pet_id', 'test_date', 'clinic_name', 'analyzer_brand', 'iris_stage', 'ai_provider', 'metrics_json', 'ai_summary', 'created_at'],
              },
              chat: {
                sql: `SELECT c.id, u.email, c.pet_id, c.role, c.urgency, c.ai_provider, c.ai_model, c.content, c.created_at FROM ai_chat_messages c JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC`,
                headers: ['id', 'email', 'pet_id', 'role', 'urgency', 'ai_provider', 'ai_model', 'content', 'created_at'],
              },
            };

            const cfg = queryMap[dataset];
            if (!cfg) {
              return jsonResponse(request, { error: '未知匯出資料集' }, 400);
            }
            const rows = await env.DB.prepare(cfg.sql).all<Record<string, unknown>>();
            const csv = rowsToCsv(cfg.headers, rows.results || []);
            return new Response(csv, {
              status: 200,
              headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="petpulse_${dataset}_${stamp}.csv"`,
                ...getCorsHeaders(request),
              },
            });
          }

          // Full JSON Snapshot
          const [users, pets, careLogs, fgsRecords, bloodRecords, chatMessages, referrals, surveys, events, inviteCodes] =
            await Promise.all([
              env.DB.prepare('SELECT id, email, display_name, role, invite_code_used, cohort_label, is_demo, created_at, last_login_at FROM users ORDER BY created_at DESC').all(),
              env.DB.prepare('SELECT * FROM pets ORDER BY created_at DESC').all(),
              env.DB.prepare('SELECT * FROM daily_care_logs ORDER BY updated_at DESC').all(),
              env.DB.prepare('SELECT * FROM fgs_records ORDER BY created_at DESC').all(),
              env.DB.prepare('SELECT * FROM blood_test_records ORDER BY created_at DESC').all(),
              env.DB.prepare('SELECT * FROM ai_chat_messages ORDER BY created_at DESC').all(),
              env.DB.prepare('SELECT * FROM clinic_referrals ORDER BY created_at DESC').all(),
              env.DB.prepare('SELECT * FROM beta_feedback_surveys ORDER BY created_at DESC').all(),
              env.DB.prepare('SELECT * FROM user_events ORDER BY created_at DESC LIMIT 2000').all(),
              env.DB.prepare('SELECT * FROM invite_codes ORDER BY code ASC').all(),
            ]);

          const payload = {
            exported_at: new Date().toISOString(),
            project: 'PetPulse AI — Beta User Study Full Export',
            users: users.results || [],
            pets: pets.results || [],
            daily_care_logs: careLogs.results || [],
            fgs_records: fgsRecords.results || [],
            blood_test_records: bloodRecords.results || [],
            ai_chat_messages: chatMessages.results || [],
            clinic_referrals: referrals.results || [],
            beta_feedback_surveys: surveys.results || [],
            user_events: events.results || [],
            invite_codes: inviteCodes.results || [],
          };

          return new Response(JSON.stringify(payload, null, 2), {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Content-Disposition': `attachment; filename="petpulse_full_export_${stamp}.json"`,
              ...getCorsHeaders(request),
            },
          });
        }
      }

      return jsonResponse(request, { error: `找不到 API 端點：${request.method} ${path}` }, 404);
    } catch (err) {
      console.error('Worker API error:', err);
      return jsonResponse(
        request,
        { error: err instanceof Error ? err.message : '伺服器處理失敗，請稍後再試' },
        500
      );
    }
  },
};
