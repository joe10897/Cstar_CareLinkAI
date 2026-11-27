/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/**
 * PetPulse AI — Typed Frontend API Client
 * Communicates with Cloudflare Workers Edge API (/api/*) using both HttpOnly
 * session cookies and Bearer token fallback (for mobile in-app webviews).
 */

const TOKEN_STORAGE_KEY = 'petpulse_auth_token_v2';

export interface AuthUser {
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

export interface FgsAiAnalysisResponse {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  animal_detected: boolean;
  detected_species: string;
  face_box: { cx: number; cy: number; w: number; h: number };
  scores: { ear: number; orbital: number; muzzle: number; whisker: number; head: number; total: number };
  confidence: number;
  warnings: string[];
  visual_findings: string;
  triage_advice: string;
}

export interface BloodOcrAiResponse {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  is_blood_sheet: boolean;
  clinic_name: string;
  test_date: string;
  analyzer_brand: 'IDEXX Catalyst' | 'Abaxis VetScan' | 'Fujifilm DRI-CHEM';
  confidence: number;
  markers: {
    CREA: number | null;
    BUN: number | null;
    SDMA: number | null;
    PHOS: number | null;
    ALB: number | null;
    K: number | null;
    HCT: number | null;
  };
  ai_summary: string;
  warnings: string[];
}

export interface ChatTriageAiResponse {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  userMessageId: string;
  assistantMessageId: string;
  urgency: 'green' | 'yellow' | 'red';
  headline: string;
  reply: string;
  homeChecks: string[];
  shouldBookVet: boolean;
}

export interface PersistentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  urgency?: 'green' | 'yellow' | 'red';
  attachmentUrl?: string;
  aiProvider?: string;
  aiModel?: string;
  homeChecks?: string[];
  created_at: string;
}

export interface BetaFeedbackPayload {
  pet_species: string;
  pet_age_group: string;
  has_chronic_disease: boolean;
  usability_score: number;
  fgs_trust_score: number;
  ocr_helpfulness_score: number;
  nps_score: number;
  vw_too_cheap_ntd: number;
  vw_bargain_ntd: number;
  vw_expensive_ntd: number;
  vw_too_expensive_ntd: number;
  most_useful_feature: string;
  pain_point_quote: string;
  improvement_suggestion: string;
  willing_to_subscribe: string;
}

export interface AdminBetaSummary {
  counts: {
    real_testers: number;
    demo_users: number;
    total_pets: number;
    total_care_logs: number;
    total_fgs_records: number;
    total_blood_records: number;
    total_ai_chats: number;
    total_referrals: number;
    total_media_uploads: number;
    total_events: number;
    total_surveys: number;
  };
  surveyAverages: {
    usability_score: number;
    fgs_trust_score: number;
    ocr_helpfulness_score: number;
    nps_score: number;
    vw_too_cheap_ntd: number;
    vw_bargain_ntd: number;
    vw_expensive_ntd: number;
    vw_too_expensive_ntd: number;
  };
  users: Array<{
    id: string;
    email: string;
    display_name: string;
    role: string;
    invite_code_used: string | null;
    cohort_label: string;
    is_demo: number;
    created_at: string;
    last_login_at: string;
    pets_count: number;
    care_logs_count: number;
    fgs_count: number;
    blood_count: number;
    chat_count: number;
    events_count: number;
    survey_count: number;
  }>;
  surveys: Array<Record<string, unknown>>;
  inviteCodes: Array<{
    code: string;
    cohort_label: string;
    max_uses: number;
    used_count: number;
    assigned_note: string;
    is_active: number;
  }>;
  recentEvents: Array<{
    id: string;
    event_type: string;
    page_path: string;
    pet_id: string;
    metadata_json: string;
    created_at: string;
    display_name: string;
    email: string;
    invite_code_used: string | null;
  }>;
  eventBreakdown: Array<{ event_type: string; count: number }>;
}

export function getStoredSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getStoredSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    const errMsg =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `請求失敗 (HTTP ${res.status})`);
    throw new Error(errMsg);
  }

  return data as T;
}

export const apiClient = {
  getHealth: () => apiRequest<{ status: string; aiProvider: string; visionModel: string }>('/api/health'),

  // Auth
  getMe: () => apiRequest<{ user: AuthUser | null }>('/api/auth/me'),

  register: async (payload: {
    email: string;
    password: string;
    displayName: string;
    inviteCode?: string;
    role?: 'owner' | 'sitter';
    petName?: string;
    petSpecies?: 'cat' | 'dog';
    petBreed?: string;
    petAgeLabel?: string;
  }) => {
    const res = await apiRequest<{ user: AuthUser; sessionToken: string; starterPetId: string }>(
      '/api/auth/register',
      { method: 'POST', body: payload }
    );
    if (res.sessionToken) setStoredSessionToken(res.sessionToken);
    return res;
  },

  login: async (email: string, password: string) => {
    const res = await apiRequest<{ user: AuthUser; sessionToken: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (res.sessionToken) setStoredSessionToken(res.sessionToken);
    return res;
  },

  startDemo: async (role: 'owner' | 'sitter' = 'owner') => {
    const res = await apiRequest<{ user: AuthUser; sessionToken: string }>('/api/auth/demo', {
      method: 'POST',
      body: { role },
    });
    if (res.sessionToken) setStoredSessionToken(res.sessionToken);
    return res;
  },

  logout: async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredSessionToken(null);
    }
  },

  // Workspace bootstrap & CRUD
  bootstrapWorkspace: () =>
    apiRequest<{
      user: AuthUser;
      pets: unknown[];
      dailyCareMap: Record<string, unknown>;
      fgsRecords: unknown[];
      bloodRecords: unknown[];
      referrals: unknown[];
      hasSubmittedSurvey: boolean;
    }>('/api/bootstrap'),

  uploadMedia: (dataUrl: string, category: string, petId: string) =>
    apiRequest<{ mediaId: string; r2Key: string; publicUrl: string; byteSize: number }>(
      '/api/media/upload',
      { method: 'POST', body: { dataUrl, category, petId } }
    ),

  createPet: (payload: {
    name: string;
    species: 'cat' | 'dog';
    breed: string;
    age_label: string;
    weight_kg: number;
    coat_length: 'short' | 'long';
    microchip_id?: string;
    chronic_conditions?: string[];
  }) => apiRequest<{ id: string; ok: boolean }>('/api/pets', { method: 'POST', body: payload }),

  updatePetBaseline: (
    petId: string,
    payload: {
      baseline_landmarks: unknown[];
      baseline_metrics: unknown;
      baseline_image_url?: string;
    }
  ) => apiRequest<{ ok: boolean }>(`/api/pets/${petId}`, { method: 'PATCH', body: payload }),

  saveDailyCareLog: (petId: string, payload: unknown) =>
    apiRequest<{ ok: boolean }>(`/api/daily-care/${petId}`, { method: 'PUT', body: payload }),

  saveFgsRecord: (payload: unknown) =>
    apiRequest<{ id: string; created_at: string; ok: boolean }>('/api/fgs-records', {
      method: 'POST',
      body: payload,
    }),

  verifyFgsRecord: (recordId: string, payload: unknown) =>
    apiRequest<{ ok: boolean }>(`/api/fgs-records/${recordId}/verify`, {
      method: 'PATCH',
      body: payload,
    }),

  saveBloodRecord: (payload: unknown) =>
    apiRequest<{ id: string; created_at: string; ok: boolean }>('/api/blood-records', {
      method: 'POST',
      body: payload,
    }),

  createReferral: (payload: unknown) =>
    apiRequest<{ id: string; share_token: string; expires_at: string; status: string; created_at: string }>(
      '/api/referrals',
      { method: 'POST', body: payload }
    ),

  updateReferralStatus: (referralId: string, status: 'pending' | 'accepted' | 'completed') =>
    apiRequest<{ ok: boolean }>(`/api/referrals/${referralId}`, { method: 'PATCH', body: { status } }),

  fetchPublicPacket: (shareToken: string) =>
    apiRequest<{
      referral: Record<string, unknown>;
      linkedFgs: Record<string, unknown> | null;
      bloodRecords: Array<Record<string, unknown>>;
    }>(`/api/packets/${shareToken}`),

  // Real Multimodal AI Endpoints
  analyzeFgsWithAI: (payload: {
    imageDataUrl: string;
    petId: string;
    petName: string;
    species: 'cat' | 'dog';
    breed: string;
    coatLength: 'short' | 'long';
  }) => apiRequest<FgsAiAnalysisResponse>('/api/ai/fgs-analyze', { method: 'POST', body: payload }),

  extractBloodOcrWithAI: (payload: {
    imageDataUrl: string;
    clinicName?: string;
    analyzerBrand?: string;
    petId: string;
  }) => apiRequest<BloodOcrAiResponse>('/api/ai/blood-ocr', { method: 'POST', body: payload }),

  getChatHistory: (petId: string) =>
    apiRequest<{ messages: PersistentChatMessage[] }>(`/api/chat/${petId}`),

  sendChatTriageWithAI: (payload: {
    petId: string;
    message: string;
    imageDataUrl?: string;
    attachmentUrl?: string;
  }) => apiRequest<ChatTriageAiResponse>('/api/ai/chat-triage', { method: 'POST', body: payload }),

  // Telemetry & Beta Feedback
  trackEvent: (eventType: string, pagePath: string, petId = '', metadata: Record<string, unknown> = {}) =>
    apiRequest('/api/events', {
      method: 'POST',
      body: { eventType, pagePath, petId, metadata },
    }).catch(() => null),

  submitBetaFeedback: (payload: BetaFeedbackPayload) =>
    apiRequest<{ ok: boolean; id: string; created_at: string }>('/api/beta-feedback', {
      method: 'POST',
      body: payload,
    }),

  getMyBetaFeedback: () => apiRequest<{ surveys: Array<Record<string, unknown>> }>('/api/beta-feedback/mine'),

  // Admin Analytics & Exports
  getAdminBetaSummary: () => apiRequest<AdminBetaSummary>('/api/admin/beta-summary'),

  downloadAdminExport: async (
    dataset: 'all' | 'users' | 'surveys' | 'events' | 'fgs' | 'care' | 'blood' | 'chat',
    format: 'json' | 'csv'
  ): Promise<string> => {
    const token = getStoredSessionToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/admin/export?dataset=${dataset}&format=${format}`, {
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`匯出失敗 (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `petpulse_${dataset}_${stamp}.${format}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return filename;
  },
};
