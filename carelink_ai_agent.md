# CareLink AI —— 寵物高齡照護與「AI 貓臉 48 點疼痛初篩／健檢數據管理」生產級全端系統開發規格書 (Production Spec)

> **給 AI Coding Agent 的核心指令（System Prompt for Agent）**：
> 你現在是一位具備高品味設計能力的資深全端工程師與電腦視覺架構師。本專案**並非僅供展示的拋棄式 Demo，而是要正式上線營運的 Production-Grade 產品**。
>
> 1. **UI/UX 強制載入 Hallmark Design Skill**：開發任何前端與手機介面時，必須安裝並嚴格遵守 `Nutlope/hallmark` 設計規範（Anti-AI-Slop），通過 57 道 Slop-Test Gates 與手機端四斷點（320 / 375 / 414 / 768 px）檢驗。
> 2. **完整生產級實作**：不寫假按鈕或死資料，必須實作完整的相機串流（WebRTC）、EXIF 方向校正、**ONNX Runtime Web 本地端 48 點視覺推論管線**、Canvas 幾何運算、非同步推論狀態機、錯誤邊界處理（Error Boundary）與實際檔案匯出管線。
> 3. **確定版生產級後端架構（方案 C 混合雲架構 + Edge AI）**：
>    * **前端與邊緣 API**：Cloudflare Pages + Cloudflare Workers（處理 LINE Login JWT 驗證、R2 預簽章上傳 URL 簽發、Vision LLM API 安全代理）。
>    * **物件儲存（高畫質影像與 ONNX 權重檔）**：Cloudflare R2（Zero Egress Fee 零流量費，存放貓臉原圖、血檢單照片與 `.onnx` 模型檔）。
>    * **核心資料庫與即時通訊**：Supabase PostgreSQL（使用 `JSONB` 儲存 48 點座標與血檢結構化數據，並透過 `Supabase Realtime` 實現獸醫後台 CRM 秒級紅燈預警推播）。
>    * **視覺模型推論引擎（Edge-First Hybrid）**：主引擎採用 **ONNX Runtime Web (`onnxruntime-web`)** 於瀏覽器本地端（WebGPU / WASM SIMD）執行兩階段貓臉 48 點檢測；同時搭配輕量 Python FastAPI 容器（部署於 Railway / Modal）作為舊款手機低算力降級（Fallback）與後台批次重訓驗證引擎。

---

## 1. 產品定位與商業閉環 (Production Scope)

台灣高齡犬貓（如慢性腎病貓、退化性關節炎老犬）照護面臨兩大痛點：「貓咪極度忍痛導致飼主半夜急診分流焦慮」與「各家醫院紙本血檢單難以跨院長期追蹤」。

* **合規與定位**：嚴格遵守《獸醫師法》，定位為「健康數據管理、衛教資訊輔助與就醫分流導引（非醫療診斷）」。
* **雙棲架構路由**：
  * **飼主手機端 (`/app/*`)**：以 LINE Mini App (LIFF) 與 Mobile Web 為核心，極致優化單手大拇指操作與手機相機拍攝體驗。
  * **獸醫與標註員後台 (`/admin/*`)**：供內部團隊進行「48 點貓臉座標 Human-in-the-Loop 微調並匯出訓練集」，以及供合作動物醫院查看「病患到院前 AI 預審分流看板（CRM）」。

---

## 2. UI/UX 設計工程規範：整合 `Nutlope/hallmark` (Mobile-First)

在開始編寫任何前端程式碼前，請 Agent 先在專案環境執行：

```bash
npx skills add nutlope/hallmark
```

### 2.1 Hallmark 主題與視覺材質選擇 (Theme & Material)

針對高齡寵物醫療與用藥/健康紀錄場景，請在 Hallmark v2 的主題庫中優先採用 **`Dose`（家庭醫療與健康紀錄主題）** 或 **`Studio` / `Custom`（溫潤紙質與精準醫療排版）**：

* **Locked Design Tokens（嚴禁行內硬編碼色碼）**：所有顏色、字體與間距必須定義於全域 CSS 變數（如 `var(--color-surface)`, `var(--color-ink)`, `var(--color-accent)`, `var(--font-display)`, `var(--font-mono)`），違反 Hallmark Gate 48（行內亂寫 hex/rgb）視為不及格。
* **拒絕 AI 罐頭感（Anti-AI-Slop）**：
  * 嚴禁使用廉價的紫藍漸層按鈕、發光霓虹陰影或千篇一律的三欄式假卡片。
  * 嚴禁繪製假手機外框或假瀏覽器頂欄（Hallmark Gate 47：Re-drawn chrome forbidden），因為使用者就是在真實手機與 LINE 內開啟。
  * **誠實文案與真實數據狀態（Hallmark Gate 46）**：禁止編造「99.9% 準確率」或「10 萬名飼主信賴」等假行銷詞；尚未確認的統計欄位必須顯示真實計算結果或標準待確認佔位符（`—` 搭配清晰狀態標籤）。

### 2.2 手機端非妥協響應式鐵律 (Hallmark Mobile Non-Negotiables)

所有 `/app/*` 手機頁面在產出前，必須通過 `scripts/sloplint.mjs --render` 於 **320px / 375px / 414px / 768px** 四個寬度的檢驗：

1. **零水平捲動（Gate 34）**：`html` 與 `body` 強制設定 `overflow-x: clip`（不可用 `hidden` 破壞 `position: sticky`）。
2. **按鈕與導覽連結禁止斷行（Gate 49）**：所有 CTA 按鈕、底部導覽列（Bottom Tab Bar）、膠囊標籤文字必須保持單行（`white-space: nowrap`），且觸控熱區高度 $\ge 44\text{px}$。
3. **網格防撐破（Gate 50）**：所有含圖片或圖表的 CSS Grid 軌道必須使用 `minmax(0, 1fr)`，嚴禁裸寫 `1fr`。
4. **Pre-emit Self-Critique**：每個核心頁面頂部註解須標註 Hallmark 六維度自評分數（`/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */`）。

---

## 3. 視覺模型架構：ONNX Runtime Web 兩階段 48 點檢測管線

為確保在 LINE 內建瀏覽器（iOS WKWebView / Android Chrome WebView）達到高準確度且不阻塞 UI 主執行緒，請在 `src/workers/fgsOnnxWorker.ts` 實作 **Web Worker 非同步 ONNX 推論管線**。

### 3.1 為什麼採用兩階段輕量 ONNX 模型（解決單一模型精度不足與載入過慢）

1. **Stage 1：貓臉邊界與姿態檢測器 (`cat_face_detector_yolov8n_int8.onnx`，約 3.2 MB)**
   * 在相機預覽時以 `10~15 FPS` 運行，快速抓取貓臉 Bounding Box 與 5 個基礎錨點（雙眼中心、鼻頭、雙耳尖），即時計算 **雙眼水平傾角（Roll Angle）** 與 **臉部佔比**，在畫面給出「請將鏡頭移至與貓咪視線平行」的防呆引導。
2. **Stage 2：高解析度局部裁切與 48 點關鍵點回歸 (`catflw_48pts_hrnet_w18_fp16.onnx` 或 `yolov11n_cat48_pose.onnx`，約 6.5 MB)**
   * 當快門觸發或飼主上傳照片後，Worker 根據 Stage 1 抓到的貓臉框進行 **仿射變換（Affine Alignment）水平轉正** 並裁切出 `256x256`（或局部五官 ROI 放大）的高清區塊，送入 Stage 2 模型精準預測 48 個 $(x, y, \text{confidence})$ 座標，再逆轉換回原圖座標系。

### 3.2 ONNX Runtime Web 生產級優化規範 (`src/services/onnxEngine.ts`)

1. **Execution Providers 自動降級策略**：
   * 優先嘗試 `['webgpu', 'wasm']`（iOS 17.4+ 與新版 Android 支援 WebGPU 加速；若在舊版 LINE WebView 則無縫降級至 `wasm` 搭配 `simd: true` 與多執行緒 `numThreads: navigator.hardwareConcurrency || 4`）。
2. **Cloudflare R2 CDN + IndexedDB 權重持久化快取**：
   * `.onnx` 模型檔託管於 Cloudflare R2 公開儲存桶（綁定自訂網域開啟 Cache-Control 強快取）。首次載入時由前端下載並存入瀏覽器 `IndexedDB`（依模型版本號 `v1.0.0` 控管），使飼主第二次開啟 LINE Mini App 時達到 **0 秒瞬間載入模型**。
3. **CORS 與 COOP/COEP 標頭配置**：
   * 在 Cloudflare Pages 的 `public/_headers` 設定適當的跨域標頭，確保 `ort-wasm-simd-threaded.wasm` 可正常啟用 SharedArrayBuffer 加速。
4. **雙引擎互補（ONNX + Vision LLM / FastAPI Fallback）**：
   * 當前端 ONNX 推論完 48 點座標與幾何分數後，若遇到極端長毛遮擋（平均關鍵點 confidence $< 0.65$）或設備記憶體不足失敗時，自動將原圖與初步座標送往 Cloudflare Worker $\rightarrow$ 後端 Python FastAPI / Vision LLM（Gemini 2.5 Flash / GPT-4o）進行語義級二次校驗與白話文觀察報告生成。

---

## 4. 生產級核心功能與技術實作規格

### 4.1 飼主手機端 (`/app/*`)

#### A. 貓臉 48 點拍攝與即時防呆相機 (`/app/fgs-scanner`)

1. **真實相機串流與權限降級處理**：
   * 使用 `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1920 } } })` 調用高解析度後置鏡頭；若在 LINE WebView 權限受阻，無縫切換為 `<input type="file" accept="image/*" capture="environment">` 並讀取 EXIF 方向自動轉正。
2. **前端姿態引導疊加層 (Pose Guide Overlay)**：
   * 畫面中央繪製精緻的幾何引導線（雙眼水平基準線 + 鼻頭中心十字），並附帶低機位/廣角防呆提示：「請與貓咪視線平行拍攝，避免由下往上仰拍影響眼眶收緊度判讀」。
3. **48 點高精度響應式畫布渲染 (`<FGSAnnotationCanvas />`)**：
   * 支援手指雙指縮放（Pinch-to-Zoom）與平移檢視細節，並提供一鍵切換 **「淺色臨床報告模式（對應白底三色標註）」** 與 **「深色暗房檢測模式（對應 `#1E242B` 五色標註）」**：
     * `01–10` 雙耳與耳根（10 點）
     * `11–26` 雙眼輪廓（16 點，左眼 8 點、右眼 8 點）
     * `27–34` 鼻樑與鼻頭（8 點）
     * `35–38` 口唇與下巴（4 點）
     * `39–48` 兩側頰部與鬍鬚墊（10 點）
4. **FGS 五大動作單元 (AU) 評分卡與個體基線比對**：
   * 列出 `耳朵位置`、`眼眶收緊`、`口鼻緊張`、`鬍鬚位置`、`頭部位置` 各項得分（`0/2`, `1/2`, `2/2`）與總分（`0–10`）。
   * 支援載入該貓咪的 **「平時健康 0 分基線照（Baseline Profile）」**，顯示當下幾何指標（如左眼 EAR、鬍鬚墊扁平率）相較於平時基線的偏移百分比（$\Delta\%$）。
   * 底部固定呈現方法提示與醫療合規免責聲明。

#### B. 紙本血檢單 OCR 解析與長期趨勢追蹤 (`/app/blood-test`)

1. **影像預處理與 R2 直傳**：
   * 手機拍攝或上傳各家動物醫院血檢單（IDEXX、Abaxis、富士等）後，透過 Cloudflare Worker 取得 R2 Presigned URL 直接上傳原圖，並調用 Vision LLM 萃取結構化指標（`CREA`, `BUN`, `SDMA`, `PHOS`, `ALB`, `K`, `HCT`）與醫院檢驗參考區間。
2. **人工確認表單（Human Verification Step）**：
   * 正式寫入 Supabase 前，以 `var(--font-mono)` 等寬字體並列顯示「原圖局部裁切」與「AI 辨識數值輸入框」，讓飼主可一鍵確認或微調小數點，確保醫療紀錄 100% 準確。
3. **跨月份臨床趨勢折線圖**：
   * 標示正常參考值陰影帶（Reference Band）、IRIS 慢性腎病分期線（Stage 1~4），並針對異常指標生成白話文衛教說明與對應營養保健品導購連結。

#### C. O2O 合作動物醫院轉診預約與授權分享 (`/app/clinics`)

* 當 FGS 總分 $\ge 4/10$ 或血檢關鍵指標異常超標時，可一鍵生成具時效性的 **「看診前 AI 預審摘要連結（Shareable Clinical Packet）」**，寫入 Supabase `clinic_referrals` 表並透過 Realtime 即時推播至合作醫院後台。

### 4.2 後台資料標註與獸醫 CRM 系統 (`/admin/*`)

1. **Human-in-the-Loop 48 點座標微調工作台 (`/admin/fgs-dataset`)**：
   * 支援滑鼠與觸控筆在 Canvas 上直接拖曳任一編號點（1~48），支援放大鏡檢視（Loupe Magnifier）處理長毛貓耳根與嘴角遮擋問題。
   * 拖曳座標點時，透過 `utils/fgsGeometryCalculator.ts` **即時重算並更新** 右側面板的雙眼縱橫比（EAR）、耳尖外展角與口鼻橢圓率。
   * 實作真實匯出引擎：可從 Supabase 篩選 `is_verified = true` 的紀錄，批次匯出標準 `CSV`（含 `point_id, region, x_norm, y_norm, visibility`）與 `YOLO-Pose (.txt / .json)` 訓練集壓縮包，直接用於下一輪 ONNX 模型微調。
2. **B2B 動物醫院看診前預審 CRM (`/admin/clinic-crm`)**：
   * 透過 `supabase.channel('clinic-referrals').on('postgres_changes', ...)` 訂閱即時轉診通知，紅燈病患（$\ge 4$ 分）零延遲置頂顯示，獸醫點開即可對照跨院血檢折線圖與貓臉 48 點分析紀錄。

---

## 5. 貓臉 48 點無尺度幾何演算法 (`utils/fgsGeometryCalculator.ts`)

請完整實作以下數學模型，勿使用隨機數值：

1. **無尺度標準化基準 (Inter-Ocular Scale Normalization)**：
   以雙眼內眼角點（左眼內角 $P_{15}$、右眼內角 $P_{19}$）之歐氏距離作為基準分母 $D_{\text{base}}$，消除拍攝遠近影響：
   $$D_{\text{base}} = \sqrt{(x_{15} - x_{19})^2 + (y_{15} - y_{19})^2}$$

2. **眼眶收緊度 (Orbital Tightening) — 眼部縱橫比 $\text{EAR}$**：
   對左右眼分別計算上下眼瞼垂直距離與內外眼角水平距離之比值：
   $$\text{EAR} = \frac{\Vert P_{\text{upper1}} - P_{\text{lower1}} \Vert + \Vert P_{\text{upper2}} - P_{\text{lower2}} \Vert}{2 \cdot \Vert P_{\text{outer}} - P_{\text{inner}} \Vert}$$
   * 若單眼或雙眼 $\text{EAR}$ 較個體基線下降 $15\% \sim 35\%$ 判定為 `1/2`（同時檢測左右眼對稱比，若單眼偏窄則自動生成觀察描述如「左眼相對略窄」）；下降 $>35\%$ 判定為 `2/2`。

3. **耳朵位置 (Ear Position) — 耳軸外旋角 $\theta_{\text{ear}}$ 與雙耳展開比**：
   計算耳尖點與耳根內外側點構成之向量夾角，以及兩耳尖連線距離除以 $D_{\text{base}}$ 的比例。

4. **口鼻緊張度 (Muzzle Tension) — 鬍鬚墊寬高扁平比 $R_{\text{muzzle}}$**：
   $$R_{\text{muzzle}} = \frac{\Vert P_{\text{cheek\_left}} - P_{\text{cheek\_right}} \Vert}{\Vert P_{\text{nose\_bridge}} - P_{\text{chin}} \Vert}$$

---

## 6. 方案 C 後端基礎設施與資料庫規格 (Supabase + Cloudflare R2 + Workers)

### 6.1 Supabase PostgreSQL 核心資料表 (`supabase/migrations/0001_init.sql`)

```sql
-- 1. 寵物檔案與 0 分健康基線表
create table public.pets (
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
create table public.fgs_records (
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
create table public.blood_test_records (
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
create table public.clinic_referrals (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  clinic_id text not null,
  urgency_level text check (urgency_level in ('green', 'yellow', 'red')) not null,
  trigger_reason text not null,
  latest_fgs_record_id uuid references public.fgs_records(id),
  status text check (status in ('pending', 'accepted', 'completed')) default 'pending',
  created_at timestamptz default now()
);

alter publication supabase_realtime add table public.clinic_referrals;
```

### 6.2 Cloudflare Workers 邊緣閘道與 R2 儲存 (`workers/api-gateway.ts`)

1. **`POST /api/auth/line-verify`**：接收前端 `liff.getIDToken()`，向 LINE 官方驗證後簽發 Supabase 相容之 Custom JWT。
2. **`POST /api/storage/presign`**：簽發 Cloudflare R2 的單次上傳 Presigned URL（限制 `image/jpeg`, `image/png`, `image/webp` 且大小 $\le 15\text{MB}$），讓手機端直接把照片傳入 R2 儲存桶，不消耗伺服器頻寬。
3. **`POST /api/ai/blood-ocr` & `/api/ai/fgs-vlm-review`**：封裝 Gemini / OpenAI 多模態 API 金鑰，讀取 R2 圖片進行血檢單結構化解析與貓臉語義補充說明。

### 6.3 環境變數範本 (`.env.example`)

```env
# Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# LINE LIFF 配置
VITE_LINE_LIFF_ID=2000000000-xxxxxxxx

# Cloudflare Worker API & R2 Public CDN (存放圖片與 .onnx 權重)
VITE_WORKER_API_BASE_URL=https://api.carelink-ai.workers.dev
VITE_R2_PUBLIC_CDN_URL=https://cdn.carelink-ai.com
VITE_ONNX_DETECTOR_MODEL_URL=https://cdn.carelink-ai.com/models/cat_face_detector_yolov8n_int8.onnx
VITE_ONNX_LANDMARK_MODEL_URL=https://cdn.carelink-ai.com/models/catflw_48pts_hrnet_w18_fp16.onnx

# 後端 Python 視覺推論 Fallback 服務 (Railway / Modal)
FALLBACK_CV_API_URL=https://cv-engine.up.railway.app
```

---

## 7. 競賽合規與交付檢查清單 (Final Gate)

1. **匿名原則**：全站 UI、Meta Tags、匯出之 CSV/PDF 報表檔名與內文，**嚴禁出現學校、科系或指導老師名稱**，一律使用 `CareLink AI`。
2. **Hallmark Sloplint 驗證**：完成前端切版後，必須執行 `hallmark audit` 確保無任何 AI Slop 反模式殘留，且在手機 375px 視角下具備極致的原生 App 操作手感。