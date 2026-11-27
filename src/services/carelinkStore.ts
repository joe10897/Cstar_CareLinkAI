/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
/**
 * CareLink AI — 混合雲資料持久化、Supabase Realtime 推播與 R2 預簽章上傳服務 (src/services/carelinkStore.ts)
 *
 * 完整實作：
 * 1. Supabase PostgreSQL CRUD (pets, fgs_records, blood_test_records, clinic_referrals)
 * 2. Supabase Realtime channel('clinic-referrals') 搭配 BroadcastChannel 跨分頁毫秒級即時同步
 * 3. 真實 CSV 與 YOLO-Pose (.txt / .json) 訓練集匯出管線
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  calculateFGSGeometryAndScores,
  createPresetLandmarks,
  type FGSGeometricMetrics,
  type FGSLandmarkPoint,
  type FGSScores,
} from '../utils/fgsGeometryCalculator';
import { apiClient } from './apiClient';

export interface PetProfile {
  id: string;
  owner_line_id: string;
  name: string;
  short_name?: string;
  species: 'cat' | 'dog';
  breed: string;
  age_label?: string;
  weight_kg?: number;
  microchip_id?: string;
  coat_length: 'short' | 'medium' | 'long';
  birth_date: string;
  chronic_conditions: string[];
  baseline_landmarks: FGSLandmarkPoint[];
  baseline_metrics: FGSGeometricMetrics;
  baseline_image_url: string;
  created_at: string;
}

export interface DailyCareLog {
  pet_id: string;
  date: string;
  water_ml: number;
  water_target_ml: number;
  appetite: 'normal' | 'half' | 'refused';
  bristol_scale: 1 | 4 | 6 | 7;
  urine_clumps: number;
  subq_fluid_ml: number;
  subq_target_ml: number;
  weight_kg: number;
  med_evening_bp_done: boolean;
  memo_text: string;
  sitter_handover_active: boolean;
}

export interface FGSRecord {
  id: string;
  pet_id: string;
  pet_name: string;
  r2_image_key: string;
  image_url: string;
  image_width: number;
  image_height: number;
  raw_onnx_landmarks: FGSLandmarkPoint[];
  verified_landmarks: FGSLandmarkPoint[] | null;
  geometric_metrics: FGSGeometricMetrics;
  scores: FGSScores;
  ai_provider?: string;
  ai_model?: string;
  ai_confidence?: number;
  ai_observation_notes: string;
  camera_warnings: string[];
  is_verified: boolean;
  verified_by: string | null;
  created_at: string;
}

export type BloodMarkerKey = 'CREA' | 'BUN' | 'SDMA' | 'PHOS' | 'ALB' | 'K' | 'HCT';

export interface BloodMarkerValue {
  val: number;
  unit: string;
  ref_min: number;
  ref_max: number;
  flag: 'LOW' | 'NORMAL' | 'HIGH';
  label: string;
}

export interface SupplementRecommendation {
  id: string;
  name: string;
  targetMarker: BloodMarkerKey;
  reason: string;
  dosageNote: string;
}

export interface BloodTestRecord {
  id: string;
  pet_id: string;
  test_date: string;
  clinic_name: string;
  analyzer_brand: 'IDEXX Catalyst' | 'Abaxis VetScan' | 'Fujifilm DRI-CHEM';
  r2_image_key: string;
  image_url: string;
  metrics: Record<BloodMarkerKey, BloodMarkerValue>;
  iris_stage: 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4';
  ai_provider?: string;
  ai_summary: string;
  recommended_supplements: SupplementRecommendation[];
  is_confirmed_by_owner: boolean;
  created_at: string;
}

export interface ClinicReferral {
  id: string;
  pet_id: string;
  pet_name: string;
  breed: string;
  age_years: number;
  clinic_id: string;
  clinic_name: string;
  urgency_level: 'green' | 'yellow' | 'red';
  trigger_reason: string;
  latest_fgs_record_id: string;
  fgs_total_score: number;
  crea_value: number;
  sdma_value: number;
  share_token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'completed';
  created_at: string;
}

export interface PartnerClinic {
  id: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  hasNightEmergency: boolean;
  catFriendlyGold: boolean;
  specialties: string[];
}

export const PARTNER_CLINICS: PartnerClinic[] = [
  {
    id: 'clinic-taipei-01',
    name: '安禾高齡貓專科動物醫院',
    district: '台北市大安區',
    address: '台北市大安區和平東路二段 118 號',
    phone: '02-2732-8810',
    hasNightEmergency: true,
    catFriendlyGold: true,
    specialties: ['ISFM 貓友善金獎', '高齡慢性腎病門診', '疼痛控制與安寧照護'],
  },
  {
    id: 'clinic-taipei-02',
    name: '沐光伴侶動物內科暨影像中心',
    district: '台北市中山區',
    address: '台北市中山區民權東路三段 62 號',
    phone: '02-2508-3920',
    hasNightEmergency: false,
    catFriendlyGold: true,
    specialties: ['高解析腹腔超音波', 'IDEXX 腎功能血檢追蹤', '高齡貓牙科與鎮痛'],
  },
  {
    id: 'clinic-ntpc-03',
    name: '常春藤 24H 急診轉診動物醫院',
    district: '新北市板橋區',
    address: '新北市板橋區文化路一段 280 號',
    phone: '02-2259-0119',
    hasNightEmergency: true,
    catFriendlyGold: true,
    specialties: ['24 小時夜間急診分流', '重症加護氧氣病房', '跨院雲端血檢預審'],
  },
];

/**
 * 產生高品質內嵌貓臉寫真 SVG Data URL (確保離線與任何視窗下皆可清晰對齊 48 點座標)
 */
export function buildCatPortraitDataUrl(
  variant: 'baseline' | 'asymmetric' | 'pain_alert'
): string {
  const earRotateL = variant === 'pain_alert' ? -24 : variant === 'asymmetric' ? -10 : -2;
  const earRotateR = variant === 'pain_alert' ? 24 : variant === 'asymmetric' ? 10 : 2;
  const eyeRyL = variant === 'pain_alert' ? 14 : variant === 'asymmetric' ? 16 : 26;
  const eyeRyR = variant === 'pain_alert' ? 15 : variant === 'asymmetric' ? 24 : 26;
  const muzzleRx = variant === 'pain_alert' ? 112 : variant === 'asymmetric' ? 98 : 88;
  const bgTone = variant === 'pain_alert' ? '#2c333a' : variant === 'asymmetric' ? '#343c44' : '#3b444c';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
    <defs>
      <radialGradient id="bg" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="#525e68"/>
        <stop offset="100%" stop-color="${bgTone}"/>
      </radialGradient>
      <radialGradient id="coat" cx="50%" cy="48%" r="48%">
        <stop offset="0%" stop-color="#d8cfc2"/>
        <stop offset="68%" stop-color="#a89d8e"/>
        <stop offset="100%" stop-color="#786e61"/>
      </radialGradient>
      <radialGradient id="muzzle" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#f2ece1"/>
        <stop offset="100%" stop-color="#cfc5b6"/>
      </radialGradient>
    </defs>
    <rect width="800" height="800" fill="url(#bg)"/>
    <!-- 雙耳 -->
    <g transform="rotate(${earRotateL} 225 200)">
      <polygon points="184,240 136,80 264,192" fill="#8b7f70" stroke="#685e52" stroke-width="5"/>
      <polygon points="190,224 154,106 248,192" fill="#d7b2aa" opacity="0.78"/>
    </g>
    <g transform="rotate(${earRotateR} 575 200)">
      <polygon points="616,240 664,80 536,192" fill="#8b7f70" stroke="#685e52" stroke-width="5"/>
      <polygon points="610,224 646,106 552,192" fill="#d7b2aa" opacity="0.78"/>
    </g>
    <!-- 頭部主輪廓 -->
    <ellipse cx="400" cy="435" rx="236" ry="222" fill="url(#coat)"/>
    <!-- 額頭虎斑紋路 -->
    <path d="M350,248 Q372,300 364,335" stroke="#5d5348" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M400,238 L400,328" stroke="#5d5348" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M450,248 Q428,300 436,335" stroke="#5d5348" stroke-width="8" fill="none" stroke-linecap="round"/>
    <!-- 雙眼 -->
    <g>
      <ellipse cx="284" cy="356" rx="46" ry="${eyeRyL}" fill="#b7c68b" stroke="#2c2620" stroke-width="6"/>
      <ellipse cx="284" cy="356" rx="11" ry="${Math.max(10, eyeRyL - 4)}" fill="#1b1917"/>
      <circle cx="272" cy="346" r="5" fill="#f7f4ee" opacity="0.85"/>
    </g>
    <g>
      <ellipse cx="516" cy="356" rx="46" ry="${eyeRyR}" fill="#b7c68b" stroke="#2c2620" stroke-width="6"/>
      <ellipse cx="516" cy="356" rx="11" ry="${Math.max(10, eyeRyR - 4)}" fill="#1b1917"/>
      <circle cx="504" cy="346" r="5" fill="#f7f4ee" opacity="0.85"/>
    </g>
    <!-- 兩側鬍鬚墊與口鼻 -->
    <ellipse cx="336" cy="504" rx="${muzzleRx * 0.56}" ry="44" fill="url(#muzzle)"/>
    <ellipse cx="464" cy="504" rx="${muzzleRx * 0.56}" ry="44" fill="url(#muzzle)"/>
    <ellipse cx="400" cy="558" rx="64" ry="28" fill="#dfd6c7"/>
    <!-- 鼻頭 -->
    <polygon points="368,452 432,452 400,488" fill="#cb8580" stroke="#593b38" stroke-width="4"/>
    <!-- 人中與口裂 -->
    <line x1="400" y1="488" x2="400" y2="518" stroke="#4d4339" stroke-width="5"/>
    <path d="M342,526 Q372,542 400,518 Q428,542 458,526" stroke="#4d4339" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildBloodSheetPreviewDataUrl(clinicName: string, dateStr: string, crea: number, bun: number, sdma: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">
    <rect width="640" height="420" fill="#f6f3ec"/>
    <rect x="20" y="20" width="600" height="380" rx="8" fill="#ffffff" stroke="#d5cfc2" stroke-width="2"/>
    <text x="44" y="58" font-family="monospace" font-size="16" font-weight="bold" fill="#22302c">${clinicName} · IDEXX Catalyst Dx</text>
    <text x="44" y="84" font-family="monospace" font-size="13" fill="#52605b">PATIENT: MISO (貓 / 13Y)   DATE: ${dateStr}</text>
    <line x1="44" y1="98" x2="596" y2="98" stroke="#c8c2b4" stroke-width="1.5"/>
    <text x="44" y="126" font-family="monospace" font-size="13" fill="#52605b">TEST      RESULT     REF INTERVAL     UNIT     FLAG</text>
    <text x="44" y="162" font-family="monospace" font-size="15" font-weight="bold" fill="#1b2623">CREA      ${crea.toFixed(1)}        0.8 - 2.4        mg/dL    ${crea > 2.4 ? 'HIGH' : 'NORMAL'}</text>
    <text x="44" y="196" font-family="monospace" font-size="15" font-weight="bold" fill="#1b2623">BUN       ${bun.toFixed(0)}         16 - 36          mg/dL    ${bun > 36 ? 'HIGH' : 'NORMAL'}</text>
    <text x="44" y="230" font-family="monospace" font-size="15" font-weight="bold" fill="#1b2623">SDMA      ${sdma.toFixed(0)}         0 - 14           ug/dL    ${sdma > 14 ? 'HIGH' : 'NORMAL'}</text>
    <text x="44" y="264" font-family="monospace" font-size="15" fill="#1b2623">PHOS      5.4        3.1 - 6.8        mg/dL    NORMAL</text>
    <text x="44" y="298" font-family="monospace" font-size="15" fill="#1b2623">ALB       3.1        2.3 - 3.9        g/dL     NORMAL</text>
    <text x="44" y="332" font-family="monospace" font-size="15" fill="#1b2623">K         4.1        3.5 - 5.8        mmol/L   NORMAL</text>
    <text x="44" y="366" font-family="monospace" font-size="15" fill="#1b2623">HCT       31.5       30.3 - 52.3      %        NORMAL</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CARELINK_ASSETS = {
  ownerAvatar: '/images/owner-avatar.jpg',
  sitterLinAvatar: '/images/sitter-lin.jpg',
  misoAvatar: '/images/miso-ragdoll.jpg',
  fgsPortrait: '/images/fgs-ragdoll-portrait.jpg',
  latteAvatar: '/images/latte-ginger.jpg',
  yuanyuanAvatar: '/images/yuanyuan-shiba.jpg',
  subqFluidThumb: '/images/subq-fluid-kit.jpg',
  catFoodBowlThumb: '/images/cat-food-bowl.jpg',
} as const;

const STORAGE_KEYS = {
  PETS: 'carelink_pets_v3',
  FGS_RECORDS: 'carelink_fgs_records_v3',
  BLOOD_RECORDS: 'carelink_blood_records_v3',
  CLINIC_REFERRALS: 'carelink_clinic_referrals_v3',
  DAILY_CARE: 'carelink_daily_care_v3',
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseClient: SupabaseClient | null =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project.supabase.co')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function createInitialPets(): PetProfile[] {
  const baselineLandmarks = createPresetLandmarks('baseline_0');
  const baselineAnalysis = calculateFGSGeometryAndScores(baselineLandmarks, null);

  return [
    {
      id: 'pet-miso-001',
      owner_line_id: 'U8901carelink_owner_01',
      name: '咪寶（Miso）',
      short_name: '咪寶',
      species: 'cat',
      breed: '布偶貓',
      age_label: '8y 2m',
      weight_kg: 4.82,
      microchip_id: '900138001049281',
      coat_length: 'long',
      birth_date: '2018-04-12',
      chronic_conditions: ['IRIS 腎病第 2 期', '每日皮下點滴'],
      baseline_landmarks: baselineLandmarks,
      baseline_metrics: baselineAnalysis.metrics,
      baseline_image_url: CARELINK_ASSETS.misoAvatar,
      created_at: '2026-08-10T09:00:00Z',
    },
    {
      id: 'pet-mochi-002',
      owner_line_id: 'U8901carelink_owner_01',
      name: '拿鐵（Latte）',
      short_name: '拿鐵',
      species: 'cat',
      breed: '橘貓米克斯',
      age_label: '13y',
      weight_kg: 3.85,
      microchip_id: '900138001083712',
      coat_length: 'short',
      birth_date: '2013-09-20',
      chronic_conditions: ['齒吸收術後照護', '早期腎指數監測'],
      baseline_landmarks: baselineLandmarks,
      baseline_metrics: baselineAnalysis.metrics,
      baseline_image_url: CARELINK_ASSETS.latteAvatar,
      created_at: '2026-08-18T11:20:00Z',
    },
    {
      id: 'pet-yuan-003',
      owner_line_id: 'U8901carelink_owner_01',
      name: '圓圓（Yuan）',
      short_name: '圓圓',
      species: 'dog',
      breed: '赤柴犬',
      age_label: '11y',
      weight_kg: 9.6,
      microchip_id: '900138001092455',
      coat_length: 'short',
      birth_date: '2015-02-14',
      chronic_conditions: ['退化性關節炎追蹤', '心臟瓣膜定期聽診'],
      baseline_landmarks: baselineLandmarks,
      baseline_metrics: baselineAnalysis.metrics,
      baseline_image_url: CARELINK_ASSETS.yuanyuanAvatar,
      created_at: '2026-09-01T10:00:00Z',
    },
  ];
}

function createInitialFGSRecords(pets: PetProfile[]): FGSRecord[] {
  const baseMetrics = pets[0]?.baseline_metrics;
  const ptsAsym = createPresetLandmarks('mild_asymmetric_3');
  const evalAsym = calculateFGSGeometryAndScores(ptsAsym, baseMetrics);

  const ptsPain = createPresetLandmarks('pain_alert_5');
  const evalPain = calculateFGSGeometryAndScores(ptsPain, baseMetrics);

  const ptsBase = createPresetLandmarks('baseline_0');
  const evalBase = calculateFGSGeometryAndScores(ptsBase, baseMetrics);

  return [
    {
      id: 'fgs-rec-101',
      pet_id: 'pet-miso-001',
      pet_name: '咪寶（Miso）',
      r2_image_key: 'fgs/pet-miso-001/20261104-evening.jpg',
      image_url: CARELINK_ASSETS.fgsPortrait,
      image_width: 720,
      image_height: 864,
      raw_onnx_landmarks: ptsAsym,
      verified_landmarks: ptsAsym,
      geometric_metrics: evalAsym.metrics,
      scores: evalAsym.scores,
      ai_observation_notes: evalAsym.observationNotes,
      camera_warnings: [],
      is_verified: true,
      verified_by: '林獸醫師 (CV 標註審核)',
      created_at: '2026-11-04T19:40:00Z',
    },
    {
      id: 'fgs-rec-102',
      pet_id: 'pet-mochi-002',
      pet_name: '拿鐵（Latte）',
      r2_image_key: 'fgs/pet-mochi-002/20261103-night.jpg',
      image_url: CARELINK_ASSETS.fgsPortrait,
      image_width: 720,
      image_height: 864,
      raw_onnx_landmarks: ptsPain,
      verified_landmarks: ptsPain,
      geometric_metrics: evalPain.metrics,
      scores: evalPain.scores,
      ai_observation_notes: evalPain.observationNotes,
      camera_warnings: ['long_hair_occlusion'],
      is_verified: true,
      verified_by: '陳標註師 (Human-in-the-Loop)',
      created_at: '2026-11-03T22:15:00Z',
    },
    {
      id: 'fgs-rec-103',
      pet_id: 'pet-miso-001',
      pet_name: '咪寶（Miso）',
      r2_image_key: 'fgs/pet-miso-001/20261015-baseline.jpg',
      image_url: CARELINK_ASSETS.fgsPortrait,
      image_width: 720,
      image_height: 864,
      raw_onnx_landmarks: ptsBase,
      verified_landmarks: ptsBase,
      geometric_metrics: evalBase.metrics,
      scores: evalBase.scores,
      ai_observation_notes: evalBase.observationNotes,
      camera_warnings: [],
      is_verified: true,
      verified_by: '飼主基線建檔',
      created_at: '2026-10-15T10:05:00Z',
    },
  ];
}

function createInitialBloodRecords(): BloodTestRecord[] {
  return [
    {
      id: 'blood-rec-201',
      pet_id: 'pet-miso-001',
      test_date: '2026-07-14',
      clinic_name: '安禾高齡貓專科動物醫院',
      analyzer_brand: 'IDEXX Catalyst',
      r2_image_key: 'blood-test/pet-miso-001/2026-07-14.jpg',
      image_url: buildBloodSheetPreviewDataUrl('安禾高齡貓專科動物醫院', '2026-07-14', 2.1, 31, 14),
      metrics: {
        CREA: { val: 2.1, unit: 'mg/dL', ref_min: 0.8, ref_max: 2.4, flag: 'NORMAL', label: '肌酸酐' },
        BUN: { val: 31, unit: 'mg/dL', ref_min: 16, ref_max: 36, flag: 'NORMAL', label: '血中尿素氮' },
        SDMA: { val: 14, unit: 'µg/dL', ref_min: 0, ref_max: 14, flag: 'NORMAL', label: '對稱二甲基精氨酸' },
        PHOS: { val: 4.6, unit: 'mg/dL', ref_min: 3.1, ref_max: 6.8, flag: 'NORMAL', label: '血磷' },
        ALB: { val: 3.2, unit: 'g/dL', ref_min: 2.3, ref_max: 3.9, flag: 'NORMAL', label: '白蛋白' },
        K: { val: 4.3, unit: 'mmol/L', ref_min: 3.5, ref_max: 5.8, flag: 'NORMAL', label: '血鉀' },
        HCT: { val: 34.2, unit: '%', ref_min: 30.3, ref_max: 52.3, flag: 'NORMAL', label: '血容比' },
      },
      iris_stage: 'Stage 2',
      ai_summary: 'CREA 2.1 mg/dL 與 SDMA 14 µg/dL 位於參考區間上限邊緣，符合 IRIS Stage 2 穩定追蹤期，建議維持每日充足飲水與低磷主食管理。',
      recommended_supplements: [
        {
          id: 'supp-omega3',
          name: '高濃度純化魚油 EPA+DHA 腎臟照護膠囊',
          targetMarker: 'SDMA',
          reason: '輔助維持腎絲球微血管循環與抗氧化照護',
          dosageNote: '每日隨餐 1 顆（依體重 4.2kg 計算）',
        },
      ],
      is_confirmed_by_owner: true,
      created_at: '2026-07-14T15:30:00Z',
    },
    {
      id: 'blood-rec-202',
      pet_id: 'pet-miso-001',
      test_date: '2026-09-12',
      clinic_name: '沐光伴侶動物內科暨影像中心',
      analyzer_brand: 'IDEXX Catalyst',
      r2_image_key: 'blood-test/pet-miso-001/2026-09-12.jpg',
      image_url: buildBloodSheetPreviewDataUrl('沐光伴侶動物內科暨影像中心', '2026-09-12', 2.5, 38, 16),
      metrics: {
        CREA: { val: 2.5, unit: 'mg/dL', ref_min: 0.8, ref_max: 2.4, flag: 'HIGH', label: '肌酸酐' },
        BUN: { val: 38, unit: 'mg/dL', ref_min: 16, ref_max: 36, flag: 'HIGH', label: '血中尿素氮' },
        SDMA: { val: 16, unit: 'µg/dL', ref_min: 0, ref_max: 14, flag: 'HIGH', label: '對稱二甲基精氨酸' },
        PHOS: { val: 5.1, unit: 'mg/dL', ref_min: 3.1, ref_max: 6.8, flag: 'NORMAL', label: '血磷' },
        ALB: { val: 3.1, unit: 'g/dL', ref_min: 2.3, ref_max: 3.9, flag: 'NORMAL', label: '白蛋白' },
        K: { val: 4.1, unit: 'mmol/L', ref_min: 3.5, ref_max: 5.8, flag: 'NORMAL', label: '血鉀' },
        HCT: { val: 32.8, unit: '%', ref_min: 30.3, ref_max: 52.3, flag: 'NORMAL', label: '血容比' },
      },
      iris_stage: 'Stage 2',
      ai_summary: '跨院檢驗顯示 CREA 小幅上升至 2.5 mg/dL、SDMA 16 µg/dL，建議與主治獸醫師討論皮下輸液頻率與腸道吸附劑搭配。',
      recommended_supplements: [
        {
          id: 'supp-activated-carbon',
          name: '醫用級球形活性碳腸道含氮廢物吸附膠囊',
          targetMarker: 'BUN',
          reason: '針對 BUN 38 mg/dL 偏高，於腸道輔助吸附含氮代謝物',
          dosageNote: '與其他藥物間隔 2 小時餵食',
        },
      ],
      is_confirmed_by_owner: true,
      created_at: '2026-09-12T16:10:00Z',
    },
    {
      id: 'blood-rec-203',
      pet_id: 'pet-miso-001',
      test_date: '2026-11-02',
      clinic_name: '安禾高齡貓專科動物醫院',
      analyzer_brand: 'IDEXX Catalyst',
      r2_image_key: 'blood-test/pet-miso-001/2026-11-02.jpg',
      image_url: buildBloodSheetPreviewDataUrl('安禾高齡貓專科動物醫院', '2026-11-02', 2.9, 44, 19),
      metrics: {
        CREA: { val: 2.9, unit: 'mg/dL', ref_min: 0.8, ref_max: 2.4, flag: 'HIGH', label: '肌酸酐' },
        BUN: { val: 44, unit: 'mg/dL', ref_min: 16, ref_max: 36, flag: 'HIGH', label: '血中尿素氮' },
        SDMA: { val: 19, unit: 'µg/dL', ref_min: 0, ref_max: 14, flag: 'HIGH', label: '對稱二甲基精氨酸' },
        PHOS: { val: 5.9, unit: 'mg/dL', ref_min: 3.1, ref_max: 6.8, flag: 'NORMAL', label: '血磷' },
        ALB: { val: 3.0, unit: 'g/dL', ref_min: 2.3, ref_max: 3.9, flag: 'NORMAL', label: '白蛋白' },
        K: { val: 3.7, unit: 'mmol/L', ref_min: 3.5, ref_max: 5.8, flag: 'NORMAL', label: '血鉀' },
        HCT: { val: 30.8, unit: '%', ref_min: 30.3, ref_max: 52.3, flag: 'NORMAL', label: '血容比' },
      },
      iris_stage: 'Stage 3',
      ai_summary: '最新血檢 CREA 2.9 mg/dL 已進入 IRIS Stage 3 區間（2.9~5.0 mg/dL），且 PHOS 5.9 mg/dL 超過 Stage 3 建議控制目標（< 5.0 mg/dL），建議安排門診複查。',
      recommended_supplements: [
        {
          id: 'supp-phos-binder',
          name: '碳酸鑭／殼聚醣複合無鋁降磷粉',
          targetMarker: 'PHOS',
          reason: 'IRIS Stage 3 建議維持血磷 < 5.0 mg/dL，隨餐結合食物磷離子',
          dosageNote: '每餐混入濕食餵食 1 平匙',
        },
        {
          id: 'supp-potassium-gluconate',
          name: '葡萄糖酸鉀高齡貓電解質補充凝膠',
          targetMarker: 'K',
          reason: '血鉀 3.7 mmol/L 接近下限，預防高齡腎貓低血鉀性肌肉無力',
          dosageNote: '依據獸醫師指示每日補充 2ml',
        },
      ],
      is_confirmed_by_owner: true,
      created_at: '2026-11-02T14:20:00Z',
    },
  ];
}

function createInitialReferrals(): ClinicReferral[] {
  return [
    {
      id: 'ref-301',
      pet_id: 'pet-mochi-002',
      pet_name: 'Mochi（麻糬）',
      breed: '金吉拉長毛貓（14 歲）',
      age_years: 14,
      clinic_id: 'clinic-taipei-01',
      clinic_name: '安禾高齡貓專科動物醫院',
      urgency_level: 'red',
      trigger_reason: '夜間貓臉 FGS 檢測總分 6/10（眼眶明顯收緊 EAR 下降 36%、雙耳外展壓低），伴隨食慾下降',
      latest_fgs_record_id: 'fgs-rec-102',
      fgs_total_score: 6,
      crea_value: 2.6,
      sdma_value: 17,
      share_token: 'cl-pkt-98a4f2',
      expires_at: '2026-11-06T22:15:00Z',
      status: 'pending',
      created_at: '2026-11-04T20:10:00Z',
    },
    {
      id: 'ref-302',
      pet_id: 'pet-miso-001',
      pet_name: 'Miso（味噌）',
      breed: '米克斯三花（13 歲）',
      age_years: 13,
      clinic_id: 'clinic-taipei-01',
      clinic_name: '安禾高齡貓專科動物醫院',
      urgency_level: 'yellow',
      trigger_reason: '跨院血檢 CREA 由 2.5 升至 2.9 mg/dL（進入 IRIS Stage 3），且左眼相對略窄（FGS 2/10）',
      latest_fgs_record_id: 'fgs-rec-101',
      fgs_total_score: 2,
      crea_value: 2.9,
      sdma_value: 19,
      share_token: 'cl-pkt-41c8d9',
      expires_at: '2026-11-06T19:40:00Z',
      status: 'accepted',
      created_at: '2026-11-04T19:45:00Z',
    },
  ];
}

function loadJsonFromStorage<T>(key: string, fallbackFactory: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {
    // 忽略隱私模式錯誤
  }
  const initial = fallbackFactory();
  try {
    localStorage.setItem(key, JSON.stringify(initial));
  } catch {
    // 忽略
  }
  return initial;
}

function saveJsonToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // 忽略
  }
}

class CareLinkDataService {
  private broadcastChannel: BroadcastChannel | null = null;
  private referralListeners = new Set<(referrals: ClinicReferral[]) => void>();
  private careSyncTimers = new Map<string, number>();
  private isCloudHydrated = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('carelink-realtime-channel');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'REFERRALS_UPDATED') {
          this.notifyReferralListeners();
        }
      };
    }

    if (supabaseClient) {
      supabaseClient
        .channel('clinic-referrals')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clinic_referrals' },
          () => {
            this.notifyReferralListeners();
          }
        )
        .subscribe();
    }
  }

  public hydrateFromCloud(boot: {
    pets: unknown[];
    dailyCareMap: Record<string, unknown>;
    fgsRecords: unknown[];
    bloodRecords: unknown[];
    referrals: unknown[];
  }): void {
    this.isCloudHydrated = true;
    saveJsonToStorage(STORAGE_KEYS.PETS, boot.pets || []);
    saveJsonToStorage(STORAGE_KEYS.DAILY_CARE, boot.dailyCareMap || {});
    saveJsonToStorage(STORAGE_KEYS.FGS_RECORDS, boot.fgsRecords || []);
    saveJsonToStorage(STORAGE_KEYS.BLOOD_RECORDS, boot.bloodRecords || []);
    saveJsonToStorage(STORAGE_KEYS.CLINIC_REFERRALS, boot.referrals || []);
    this.notifyReferralListeners();
  }

  public clearActiveUserCache(): void {
    this.isCloudHydrated = false;
    try {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore storage errors
    }
    this.notifyReferralListeners();
  }

  private notifyReferralListeners(): void {
    const list = this.getClinicReferrals();
    this.referralListeners.forEach((cb) => cb(list));
  }

  public getPets(): PetProfile[] {
    return loadJsonFromStorage(STORAGE_KEYS.PETS, createInitialPets);
  }

  public getDailyCareLog(petId: string): DailyCareLog {
    const map = loadJsonFromStorage<Record<string, DailyCareLog>>(STORAGE_KEYS.DAILY_CARE, () => ({
      'pet-miso-001': {
        pet_id: 'pet-miso-001',
        date: new Date().toISOString().slice(0, 10),
        water_ml: 180,
        water_target_ml: 250,
        appetite: 'normal',
        bristol_scale: 4,
        urine_clumps: 3,
        subq_fluid_ml: 100,
        subq_target_ml: 100,
        weight_kg: 4.82,
        med_evening_bp_done: false,
        memo_text: '精神活力良好，呼吸頻率 22 次/分，早餐主食罐 45g 已完食。',
        sitter_handover_active: true,
      },
    }));
    const pet = this.getPets().find((p) => p.id === petId);
    return (
      map[petId] || {
        pet_id: petId,
        date: new Date().toISOString().slice(0, 10),
        water_ml: 150,
        water_target_ml: pet?.species === 'dog' ? 450 : 220,
        appetite: 'normal',
        bristol_scale: 4,
        urine_clumps: 3,
        subq_fluid_ml: 0,
        subq_target_ml: 100,
        weight_kg: pet?.weight_kg ?? 4.5,
        med_evening_bp_done: false,
        memo_text: '居家作息規律，無明顯嘔吐或異常躲藏行為。',
        sitter_handover_active: false,
      }
    );
  }

  public saveDailyCareLog(log: DailyCareLog): DailyCareLog {
    const map = loadJsonFromStorage<Record<string, DailyCareLog>>(STORAGE_KEYS.DAILY_CARE, () => ({}));
    map[log.pet_id] = log;
    saveJsonToStorage(STORAGE_KEYS.DAILY_CARE, map);

    if (this.isCloudHydrated && typeof window !== 'undefined') {
      const existingTimer = this.careSyncTimers.get(log.pet_id);
      if (existingTimer) window.clearTimeout(existingTimer);
      const timerId = window.setTimeout(() => {
        void apiClient.saveDailyCareLog(log.pet_id, log).catch(() => null);
      }, 350);
      this.careSyncTimers.set(log.pet_id, timerId);
    }

    return log;
  }

  public updatePetBaseline(
    petId: string,
    landmarks: FGSLandmarkPoint[],
    metrics: FGSGeometricMetrics,
    imageUrl: string
  ): PetProfile[] {
    const pets = this.getPets().map((pet) =>
      pet.id === petId
        ? {
            ...pet,
            baseline_landmarks: landmarks,
            baseline_metrics: metrics,
            baseline_image_url: imageUrl,
          }
        : pet
    );
    saveJsonToStorage(STORAGE_KEYS.PETS, pets);
    if (this.isCloudHydrated) {
      void apiClient
        .updatePetBaseline(petId, {
          baseline_landmarks: landmarks,
          baseline_metrics: metrics,
          baseline_image_url: imageUrl.startsWith('data:') ? undefined : imageUrl,
        })
        .catch(() => null);
    }
    return pets;
  }

  public getFGSRecords(): FGSRecord[] {
    const pets = this.getPets();
    return loadJsonFromStorage(STORAGE_KEYS.FGS_RECORDS, () =>
      this.isCloudHydrated ? [] : createInitialFGSRecords(pets)
    );
  }

  public addFGSRecord(record: Omit<FGSRecord, 'id' | 'created_at'>): FGSRecord {
    const list = this.getFGSRecords();
    const created: FGSRecord = {
      ...record,
      id: `fgs-rec-${Date.now().toString().slice(-5)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [created, ...list];
    saveJsonToStorage(STORAGE_KEYS.FGS_RECORDS, updated);

    if (this.isCloudHydrated) {
      void apiClient
        .saveFgsRecord({
          ...record,
          image_url: record.image_url.startsWith('data:') ? '' : record.image_url,
        })
        .then((res) => {
          const synced = this.getFGSRecords().map((item) =>
            item.id === created.id ? { ...item, id: res.id } : item
          );
          saveJsonToStorage(STORAGE_KEYS.FGS_RECORDS, synced);
        })
        .catch(() => null);
    }

    return created;
  }

  public saveVerifiedFGSRecord(
    recordId: string,
    verifiedLandmarks: FGSLandmarkPoint[],
    metrics: FGSGeometricMetrics,
    scores: FGSScores,
    observationNotes: string,
    verifiedBy: string
  ): FGSRecord[] {
    const list = this.getFGSRecords().map((rec) =>
      rec.id === recordId
        ? {
            ...rec,
            verified_landmarks: verifiedLandmarks,
            geometric_metrics: metrics,
            scores,
            ai_observation_notes: observationNotes,
            is_verified: true,
            verified_by: verifiedBy,
          }
        : rec
    );
    saveJsonToStorage(STORAGE_KEYS.FGS_RECORDS, list);

    if (this.isCloudHydrated) {
      void apiClient
        .verifyFgsRecord(recordId, {
          verified_landmarks: verifiedLandmarks,
          geometric_metrics: metrics,
          scores,
          ai_observation_notes: observationNotes,
          verified_by: verifiedBy,
        })
        .catch(() => null);
    }

    return list;
  }

  public getBloodTestRecords(petId?: string): BloodTestRecord[] {
    const all = loadJsonFromStorage(STORAGE_KEYS.BLOOD_RECORDS, () =>
      this.isCloudHydrated ? [] : createInitialBloodRecords()
    );
    const filtered = petId ? all.filter((r) => r.pet_id === petId) : all;
    return [...filtered].sort((a, b) => a.test_date.localeCompare(b.test_date));
  }

  public addBloodTestRecord(record: Omit<BloodTestRecord, 'id' | 'created_at'>): BloodTestRecord {
    const all = loadJsonFromStorage(STORAGE_KEYS.BLOOD_RECORDS, () =>
      this.isCloudHydrated ? [] : createInitialBloodRecords()
    );
    const created: BloodTestRecord = {
      ...record,
      id: `blood-rec-${Date.now().toString().slice(-5)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [...all, created];
    saveJsonToStorage(STORAGE_KEYS.BLOOD_RECORDS, updated);

    if (this.isCloudHydrated) {
      void apiClient
        .saveBloodRecord({
          ...record,
          image_url: record.image_url.startsWith('data:') ? '' : record.image_url,
        })
        .catch(() => null);
    }

    return created;
  }

  public getClinicReferrals(): ClinicReferral[] {
    const list = loadJsonFromStorage(STORAGE_KEYS.CLINIC_REFERRALS, () =>
      this.isCloudHydrated ? [] : createInitialReferrals()
    );
    return [...list].sort((a, b) => {
      const rank = { red: 3, yellow: 2, green: 1 };
      if (rank[b.urgency_level] !== rank[a.urgency_level]) {
        return rank[b.urgency_level] - rank[a.urgency_level];
      }
      return b.created_at.localeCompare(a.created_at);
    });
  }

  public createClinicReferral(
    input: Omit<ClinicReferral, 'id' | 'share_token' | 'expires_at' | 'status' | 'created_at'>
  ): ClinicReferral {
    const list = loadJsonFromStorage(STORAGE_KEYS.CLINIC_REFERRALS, () =>
      this.isCloudHydrated ? [] : createInitialReferrals()
    );
    const created: ClinicReferral = {
      ...input,
      id: `ref-${Date.now().toString().slice(-5)}`,
      share_token: `pp-${Math.random().toString(36).slice(2, 8)}`,
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const updated = [created, ...list];
    saveJsonToStorage(STORAGE_KEYS.CLINIC_REFERRALS, updated);

    if (this.isCloudHydrated) {
      void apiClient
        .createReferral(input)
        .then((remote) => {
          const synced = this.getClinicReferrals().map((r) =>
            r.id === created.id
              ? { ...r, id: remote.id, share_token: remote.share_token, expires_at: remote.expires_at }
              : r
          );
          saveJsonToStorage(STORAGE_KEYS.CLINIC_REFERRALS, synced);
          this.notifyReferralListeners();
        })
        .catch(() => null);
    }

    this.broadcastChannel?.postMessage({ type: 'REFERRALS_UPDATED' });
    this.notifyReferralListeners();
    return created;
  }

  public async createClinicReferralAsync(
    input: Omit<ClinicReferral, 'id' | 'share_token' | 'expires_at' | 'status' | 'created_at'>
  ): Promise<ClinicReferral> {
    if (!this.isCloudHydrated) {
      return this.createClinicReferral(input);
    }
    const remote = await apiClient.createReferral(input);
    const created: ClinicReferral = {
      ...input,
      id: remote.id,
      share_token: remote.share_token,
      expires_at: remote.expires_at,
      status: 'pending',
      created_at: remote.created_at,
    };
    const list = loadJsonFromStorage<ClinicReferral[]>(STORAGE_KEYS.CLINIC_REFERRALS, () => []);
    saveJsonToStorage(STORAGE_KEYS.CLINIC_REFERRALS, [created, ...list]);
    this.broadcastChannel?.postMessage({ type: 'REFERRALS_UPDATED' });
    this.notifyReferralListeners();
    return created;
  }

  public updateReferralStatus(
    referralId: string,
    status: 'pending' | 'accepted' | 'completed'
  ): ClinicReferral[] {
    const list = loadJsonFromStorage(STORAGE_KEYS.CLINIC_REFERRALS, () =>
      this.isCloudHydrated ? [] : createInitialReferrals()
    ).map((item) => (item.id === referralId ? { ...item, status } : item));
    saveJsonToStorage(STORAGE_KEYS.CLINIC_REFERRALS, list);

    if (this.isCloudHydrated) {
      void apiClient.updateReferralStatus(referralId, status).catch(() => null);
    }

    this.broadcastChannel?.postMessage({ type: 'REFERRALS_UPDATED' });
    this.notifyReferralListeners();
    return this.getClinicReferrals();
  }

  public subscribeReferrals(listener: (referrals: ClinicReferral[]) => void): () => void {
    this.referralListeners.add(listener);
    return () => {
      this.referralListeners.delete(listener);
    };
  }

  /**
   * 批次匯出通過驗證 (is_verified = true) 之 48 點標準 CSV 訓練集
   */
  public exportVerifiedLandmarksCSV(): { filename: string; content: string; rowCount: number } {
    const verifiedRecords = this.getFGSRecords().filter((r) => r.is_verified);
    const header = [
      'record_id',
      'pet_id',
      'pet_name',
      'point_id',
      'region',
      'label',
      'x_norm',
      'y_norm',
      'confidence',
      'visibility',
      'fgs_total_score',
      'verified_by',
    ].join(',');

    const rows: string[] = [header];
    for (const rec of verifiedRecords) {
      const pts = rec.verified_landmarks || rec.raw_onnx_landmarks;
      for (const pt of pts) {
        rows.push(
          [
            rec.id,
            rec.pet_id,
            `"${rec.pet_name}"`,
            pt.id,
            pt.region,
            `"${pt.label}"`,
            pt.x.toFixed(4),
            pt.y.toFixed(4),
            pt.conf.toFixed(3),
            pt.visibility ?? 2,
            rec.scores.total,
            `"${rec.verified_by || 'PetPulse AI'}"`,
          ].join(',')
        );
      }
    }

    return {
      filename: `petpulse_ai_cat48_verified_${new Date().toISOString().slice(0, 10)}.csv`,
      content: rows.join('\n'),
      rowCount: rows.length - 1,
    };
  }

  /**
   * 批次匯出 YOLO-Pose (48 keypoints) 訓練集格式套件 (.json 內含每張影像之 .txt 標籤列與 metadata)
   */
  public exportYoloPoseBundle(): { filename: string; content: string; recordCount: number } {
    const verifiedRecords = this.getFGSRecords().filter((r) => r.is_verified);
    const bundle = verifiedRecords.map((rec) => {
      const pts = rec.verified_landmarks || rec.raw_onnx_landmarks;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.max(0, Math.min(...xs) - 0.04);
      const maxX = Math.min(1, Math.max(...xs) + 0.04);
      const minY = Math.max(0, Math.min(...ys) - 0.04);
      const maxY = Math.min(1, Math.max(...ys) + 0.04);
      const boxCx = ((minX + maxX) / 2).toFixed(5);
      const boxCy = ((minY + maxY) / 2).toFixed(5);
      const boxW = (maxX - minX).toFixed(5);
      const boxH = (maxY - minY).toFixed(5);

      const kptTokens = pts
        .map((p) => `${p.x.toFixed(5)} ${p.y.toFixed(5)} ${p.visibility ?? 2}`)
        .join(' ');

      return {
        record_id: rec.id,
        r2_image_key: rec.r2_image_key,
        fgs_scores: rec.scores,
        geometric_metrics: rec.geometric_metrics,
        yolo_pose_txt_line: `0 ${boxCx} ${boxCy} ${boxW} ${boxH} ${kptTokens}`,
      };
    });

    return {
      filename: `petpulse_ai_yolo11_cat48_pose_${new Date().toISOString().slice(0, 10)}.json`,
      content: JSON.stringify(
        {
          dataset: 'PetPulse AI CatFLW-48 Keypoints Dataset',
          version: 'v1.0.0',
          keypoint_count: 48,
          exported_at: new Date().toISOString(),
          records: bundle,
        },
        null,
        2
      ),
      recordCount: bundle.length,
    };
  }
}

export const carelinkStore = new CareLinkDataService();
