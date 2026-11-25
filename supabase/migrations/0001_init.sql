-- CareLink AI Production Database Schema (Supabase PostgreSQL)
-- 嚴格遵守《獸醫師法》定位：健康數據管理、衛教資訊輔助與就醫分流導引

-- 1. 寵物檔案與 0 分健康基線表
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_line_id text not null,
  name text not null,
  species text not null default 'cat',
  breed text,
  coat_length text check (coat_length in ('short', 'medium', 'long')),
  birth_date date,
  chronic_conditions text[] default '{}',
  baseline_landmarks jsonb, -- 儲存平時健康 0 分時的 48 點標準化座標與幾何基準值
  baseline_image_url text,
  created_at timestamptz default now()
);

-- 2. 貓臉 48 點 FGS 檢測與標註訓練集表
create table if not exists public.fgs_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  r2_image_key text not null,
  image_url text not null,
  image_width int not null,
  image_height int not null,
  raw_onnx_landmarks jsonb not null, -- 前端 ONNX 初篩之 48 點 [{id, region, x, y, conf}]
  verified_landmarks jsonb,          -- 後台人工微調後之 48 點座標
  geometric_metrics jsonb not null,  -- {left_ear, right_ear, ear_angle, muzzle_ratio, ...}
  scores jsonb not null,             -- {ear: 0..2, orbital: 0..2, muzzle: 0..2, whisker: 0..2, head: 0..2, total: 0..10}
  ai_observation_notes text,
  camera_warnings text[] default '{}', -- 如 ['low_angle_detected', 'long_hair_occlusion']
  is_verified boolean default false,
  verified_by text,
  created_at timestamptz default now()
);

-- 3. 紙本血檢單 OCR 結構化紀錄表
create table if not exists public.blood_test_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  test_date date not null,
  clinic_name text,
  r2_image_key text not null,
  image_url text not null,
  metrics jsonb not null, -- {CREA: {val: 2.4, unit: 'mg/dL', ref_min: 0.8, ref_max: 2.4, flag: 'HIGH'}, BUN: ...}
  ai_summary text,
  recommended_supplements jsonb default '[]',
  is_confirmed_by_owner boolean default true,
  created_at timestamptz default now()
);

-- 4. O2O 動物醫院轉診與看診前預審表 (啟用 Supabase Realtime)
create table if not exists public.clinic_referrals (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  clinic_id text not null,
  urgency_level text check (urgency_level in ('green', 'yellow', 'red')) not null,
  trigger_reason text not null,
  latest_fgs_record_id uuid references public.fgs_records(id),
  status text check (status in ('pending', 'accepted', 'completed')) default 'pending',
  created_at timestamptz default now()
);

-- 索引與效能優化
create index if not exists idx_pets_owner_line_id on public.pets(owner_line_id);
create index if not exists idx_fgs_records_pet_id on public.fgs_records(pet_id, created_at desc);
create index if not exists idx_fgs_records_verified on public.fgs_records(is_verified);
create index if not exists idx_blood_test_records_pet_id on public.blood_test_records(pet_id, test_date desc);
create index if not exists idx_clinic_referrals_clinic_urgency on public.clinic_referrals(clinic_id, urgency_level, created_at desc);

alter publication supabase_realtime add table public.clinic_referrals;
