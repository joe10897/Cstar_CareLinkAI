/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
-- PetPulse AI — Cloudflare D1 Production Relational Schema (SQLite)
-- Supports full authentication, multi-user pet isolation, real AI logs,
-- media storage, vet share packets, event telemetry, and 20-30 beta tester surveys.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'sitter', 'admin')),
  invite_code_used TEXT,
  cohort_label TEXT NOT NULL DEFAULT 'beta-2026',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_login_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  cohort_label TEXT NOT NULL DEFAULT 'beta-2026',
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  assigned_note TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS media_objects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  byte_size INTEGER NOT NULL DEFAULT 0,
  data_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media_objects(user_id);

CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'cat' CHECK (species IN ('cat', 'dog')),
  breed TEXT NOT NULL DEFAULT '米克斯',
  age_label TEXT NOT NULL DEFAULT '8y',
  weight_kg REAL NOT NULL DEFAULT 4.5,
  microchip_id TEXT NOT NULL DEFAULT '',
  coat_length TEXT NOT NULL DEFAULT 'short' CHECK (coat_length IN ('short', 'long')),
  birth_date TEXT NOT NULL DEFAULT '2019-01-01',
  chronic_conditions_json TEXT NOT NULL DEFAULT '[]',
  baseline_landmarks_json TEXT NOT NULL DEFAULT '[]',
  baseline_metrics_json TEXT NOT NULL DEFAULT '{}',
  baseline_image_url TEXT NOT NULL DEFAULT '/images/miso-ragdoll.jpg',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

CREATE TABLE IF NOT EXISTS daily_care_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  log_date TEXT NOT NULL,
  water_ml INTEGER NOT NULL DEFAULT 0,
  water_target_ml INTEGER NOT NULL DEFAULT 220,
  appetite TEXT NOT NULL DEFAULT 'normal' CHECK (appetite IN ('normal', 'half', 'refused')),
  bristol_scale INTEGER NOT NULL DEFAULT 4,
  urine_clumps INTEGER NOT NULL DEFAULT 3,
  subq_fluid_ml INTEGER NOT NULL DEFAULT 0,
  subq_target_ml INTEGER NOT NULL DEFAULT 100,
  weight_kg REAL NOT NULL DEFAULT 4.5,
  med_evening_bp_done INTEGER NOT NULL DEFAULT 0,
  memo_text TEXT NOT NULL DEFAULT '',
  memo_image_url TEXT NOT NULL DEFAULT '',
  sitter_handover_active INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(pet_id, log_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_care_user_pet ON daily_care_logs(user_id, pet_id, log_date);

CREATE TABLE IF NOT EXISTS fgs_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  pet_name TEXT NOT NULL,
  r2_image_key TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  image_width INTEGER NOT NULL DEFAULT 720,
  image_height INTEGER NOT NULL DEFAULT 864,
  raw_onnx_landmarks_json TEXT NOT NULL DEFAULT '[]',
  verified_landmarks_json TEXT,
  geometric_metrics_json TEXT NOT NULL DEFAULT '{}',
  scores_json TEXT NOT NULL DEFAULT '{}',
  ai_provider TEXT NOT NULL DEFAULT 'workers-ai',
  ai_model TEXT NOT NULL DEFAULT '',
  ai_confidence REAL NOT NULL DEFAULT 0.85,
  ai_observation_notes TEXT NOT NULL DEFAULT '',
  camera_warnings_json TEXT NOT NULL DEFAULT '[]',
  is_verified INTEGER NOT NULL DEFAULT 0,
  verified_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fgs_user_pet ON fgs_records(user_id, pet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS blood_test_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  test_date TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  analyzer_brand TEXT NOT NULL DEFAULT 'IDEXX Catalyst',
  r2_image_key TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  metrics_json TEXT NOT NULL DEFAULT '{}',
  iris_stage TEXT NOT NULL DEFAULT 'Stage 1',
  ai_provider TEXT NOT NULL DEFAULT 'manual',
  ai_summary TEXT NOT NULL DEFAULT '',
  recommended_supplements_json TEXT NOT NULL DEFAULT '[]',
  is_confirmed_by_owner INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blood_user_pet ON blood_test_records(user_id, pet_id, test_date);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  urgency TEXT,
  attachment_url TEXT,
  ai_provider TEXT,
  ai_model TEXT,
  home_checks_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_user_pet ON ai_chat_messages(user_id, pet_id, created_at);

CREATE TABLE IF NOT EXISTS clinic_referrals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL,
  pet_name TEXT NOT NULL,
  breed TEXT NOT NULL DEFAULT '',
  age_years INTEGER NOT NULL DEFAULT 8,
  clinic_id TEXT NOT NULL DEFAULT 'clinic-taipei-01',
  clinic_name TEXT NOT NULL DEFAULT '安禾高齡貓專科動物醫院',
  urgency_level TEXT NOT NULL DEFAULT 'yellow' CHECK (urgency_level IN ('green', 'yellow', 'red')),
  trigger_reason TEXT NOT NULL DEFAULT '',
  latest_fgs_record_id TEXT NOT NULL DEFAULT '',
  fgs_total_score INTEGER NOT NULL DEFAULT 0,
  crea_value REAL NOT NULL DEFAULT 2.0,
  sdma_value REAL NOT NULL DEFAULT 14.0,
  share_token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON clinic_referrals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_token ON clinic_referrals(share_token);

CREATE TABLE IF NOT EXISTS user_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '',
  pet_id TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON user_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON user_events(event_type);

CREATE TABLE IF NOT EXISTS beta_feedback_surveys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_species TEXT NOT NULL DEFAULT 'cat',
  pet_age_group TEXT NOT NULL DEFAULT '7-11歲熟齡',
  has_chronic_disease INTEGER NOT NULL DEFAULT 0,
  usability_score INTEGER NOT NULL DEFAULT 4,
  fgs_trust_score INTEGER NOT NULL DEFAULT 4,
  ocr_helpfulness_score INTEGER NOT NULL DEFAULT 4,
  nps_score INTEGER NOT NULL DEFAULT 8,
  vw_too_cheap_ntd INTEGER NOT NULL DEFAULT 49,
  vw_bargain_ntd INTEGER NOT NULL DEFAULT 99,
  vw_expensive_ntd INTEGER NOT NULL DEFAULT 199,
  vw_too_expensive_ntd INTEGER NOT NULL DEFAULT 299,
  most_useful_feature TEXT NOT NULL DEFAULT 'AI 48點臉部疼痛初篩',
  pain_point_quote TEXT NOT NULL DEFAULT '',
  improvement_suggestion TEXT NOT NULL DEFAULT '',
  willing_to_subscribe TEXT NOT NULL DEFAULT 'yes_149',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_surveys_user ON beta_feedback_surveys(user_id, created_at DESC);

-- Pre-seed Beta Tester Invite Codes (Shared + 30 Individual Codes PP-01..PP-30 + Judge Code)
INSERT OR IGNORE INTO invite_codes (code, cohort_label, max_uses, used_count, assigned_note, is_active, created_at) VALUES
  ('PETPULSE2026', 'beta-open-cohort', 60, 0, '通用 20-30 位測試邀請碼', 1, '2026-11-28T00:00:00Z'),
  ('CSTAR2026', 'cstar-judges', 40, 0, 'C★STAR 評審與業師專屬體驗碼', 1, '2026-11-28T00:00:00Z'),
  ('PP-01', 'beta-tracked-30', 2, 0, '受邀測試者 #01', 1, '2026-11-28T00:00:00Z'),
  ('PP-02', 'beta-tracked-30', 2, 0, '受邀測試者 #02', 1, '2026-11-28T00:00:00Z'),
  ('PP-03', 'beta-tracked-30', 2, 0, '受邀測試者 #03', 1, '2026-11-28T00:00:00Z'),
  ('PP-04', 'beta-tracked-30', 2, 0, '受邀測試者 #04', 1, '2026-11-28T00:00:00Z'),
  ('PP-05', 'beta-tracked-30', 2, 0, '受邀測試者 #05', 1, '2026-11-28T00:00:00Z'),
  ('PP-06', 'beta-tracked-30', 2, 0, '受邀測試者 #06', 1, '2026-11-28T00:00:00Z'),
  ('PP-07', 'beta-tracked-30', 2, 0, '受邀測試者 #07', 1, '2026-11-28T00:00:00Z'),
  ('PP-08', 'beta-tracked-30', 2, 0, '受邀測試者 #08', 1, '2026-11-28T00:00:00Z'),
  ('PP-09', 'beta-tracked-30', 2, 0, '受邀測試者 #09', 1, '2026-11-28T00:00:00Z'),
  ('PP-10', 'beta-tracked-30', 2, 0, '受邀測試者 #10', 1, '2026-11-28T00:00:00Z'),
  ('PP-11', 'beta-tracked-30', 2, 0, '受邀測試者 #11', 1, '2026-11-28T00:00:00Z'),
  ('PP-12', 'beta-tracked-30', 2, 0, '受邀測試者 #12', 1, '2026-11-28T00:00:00Z'),
  ('PP-13', 'beta-tracked-30', 2, 0, '受邀測試者 #13', 1, '2026-11-28T00:00:00Z'),
  ('PP-14', 'beta-tracked-30', 2, 0, '受邀測試者 #14', 1, '2026-11-28T00:00:00Z'),
  ('PP-15', 'beta-tracked-30', 2, 0, '受邀測試者 #15', 1, '2026-11-28T00:00:00Z'),
  ('PP-16', 'beta-tracked-30', 2, 0, '受邀測試者 #16', 1, '2026-11-28T00:00:00Z'),
  ('PP-17', 'beta-tracked-30', 2, 0, '受邀測試者 #17', 1, '2026-11-28T00:00:00Z'),
  ('PP-18', 'beta-tracked-30', 2, 0, '受邀測試者 #18', 1, '2026-11-28T00:00:00Z'),
  ('PP-19', 'beta-tracked-30', 2, 0, '受邀測試者 #19', 1, '2026-11-28T00:00:00Z'),
  ('PP-20', 'beta-tracked-30', 2, 0, '受邀測試者 #20', 1, '2026-11-28T00:00:00Z'),
  ('PP-21', 'beta-tracked-30', 2, 0, '受邀測試者 #21', 1, '2026-11-28T00:00:00Z'),
  ('PP-22', 'beta-tracked-30', 2, 0, '受邀測試者 #22', 1, '2026-11-28T00:00:00Z'),
  ('PP-23', 'beta-tracked-30', 2, 0, '受邀測試者 #23', 1, '2026-11-28T00:00:00Z'),
  ('PP-24', 'beta-tracked-30', 2, 0, '受邀測試者 #24', 1, '2026-11-28T00:00:00Z'),
  ('PP-25', 'beta-tracked-30', 2, 0, '受邀測試者 #25', 1, '2026-11-28T00:00:00Z'),
  ('PP-26', 'beta-tracked-30', 2, 0, '受邀測試者 #26', 1, '2026-11-28T00:00:00Z'),
  ('PP-27', 'beta-tracked-30', 2, 0, '受邀測試者 #27', 1, '2026-11-28T00:00:00Z'),
  ('PP-28', 'beta-tracked-30', 2, 0, '受邀測試者 #28', 1, '2026-11-28T00:00:00Z'),
  ('PP-29', 'beta-tracked-30', 2, 0, '受邀測試者 #29', 1, '2026-11-28T00:00:00Z'),
  ('PP-30', 'beta-tracked-30', 2, 0, '受邀測試者 #30', 1, '2026-11-28T00:00:00Z');
