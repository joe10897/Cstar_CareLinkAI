# CareLink AI —— 寵物高齡照護與「AI 貓臉 48 點疼痛初篩／健檢數據管理」雙棲系統開發規格書

> **給 AI Coding Agent 的核心指令（System Prompt for Agent）**：
> 你現在是一位資深全端工程師與電腦視覺架構師。請根據本規格書，建構一套完整的「CareLink AI」MVP 專案。
> 本系統採用 **「單一專案雙棲架構（Mobile LINE LIFF 飼主端 + Desktop Web 後台管理與資料標註中心）」**。
> 請優先確保前端互動流暢度、48 點貓臉 Canvas 互動標註器的精準渲染、血檢趨勢圖表視覺化，以及預置豐富且真實的台灣在地寵物醫療 Mock Data，以利團隊進行競賽實機展示（Demo）與簡報截圖。

---

## 1. 專案背景與核心價值
台灣寵物數量已超越新生兒，高齡犬貓（特別是慢性腎病貓、老犬）照護面臨兩大痛點：
1. **症狀急診分流焦慮**：貓咪極度能忍痛，飼主難以判斷微小的外觀或表情異常是否需要半夜衝高價急診。
2. **紙本血檢難以長期追蹤**：各家動物醫院血檢單格式不一（IDEXX、Abaxis 等），紙本報告難以直觀看出跨月份的慢性病惡化趨勢。

**法規與商業定位**：嚴格遵守《獸醫師法》，系統定位為**「健康數據管理、衛教資訊輔助與就醫分流導引（非醫療診斷）」**。
**獲利模式**：
- **B2C 飼主訂閱制**：NT$ 99/月（解鎖無限次血檢追蹤、個體健康基線比對、多寵管理）。
- **B2B2C 精準導購分潤**：根據血檢異常或缺乏指標，精準推薦處方/保健品並抽取分潤。
- **B2B 動物醫院 SaaS CRM 月費**：為中小型動物醫院提供病患未到院前的 AI 預審分流看板與慢性病回診雷達。

---

## 2. 技術棧規範 (Tech Stack)
請使用現代、高開發效率且易於部署的技術棧：
- **Frontend (雙棲前端)**：
  - 框架：React 18+ (Vite, TypeScript)
  - 路由：React Router v6（切分 `/app/*` 手機端與 `/admin/*` 電腦後台端）
  - 樣式：Tailwind CSS + Lucide React Icons + shadcn/ui 風格元件
  - 圖表與視覺化：`recharts`（血檢趨勢折線圖與商業指標圖表）、HTML5 `<canvas>` 或互動式 `<svg>`（繪製與拖曳貓臉 48 點關鍵點）
  - LINE 整合：`@line/liff` SDK（需實作 Fallback 機制：若非在 LINE 內開啟，自動切換為「競賽評審 Demo 免登入模式」）
- **Backend & AI Pipeline (後端與推論服務)**：
  - 框架：Python FastAPI（或於前端內建完整 Service Mock 層並支援切換真實 API）
  - 視覺與多模態模型：
    - 貓臉 48 點關鍵點：整合基於 CatFLW 資料集之輕量級關鍵點檢測模型（ONNX / YOLO-Pose）+ 無尺度幾何特徵計算器（Geometric AU Calculator）+ Vision LLM（Gemini 1.5 Pro / GPT-4o）語義補償。
    - 血檢單 OCR：Vision LLM 結構化 JSON 萃取管線。
- **Database (資料庫)**：
  - Supabase (PostgreSQL) 或本地端持久化狀態（支援匯出標準 YOLO/CSV 訓練集）。

---

## 3. 系統路由與雙棲介面規格

請在導覽列提供一個明顯的**「視角切換器（View Switcher）」**，方便評審在 Demo 時一鍵切換「📱 飼主手機端 (LINE LIFF)」與「💻 後台數據與獸醫 CRM 中心 (Web Admin)」。

### 3.1 飼主端：LINE Mini App (`/app/*`，鎖定手機版寬度 `max-w-md mx-auto`)

1. **首頁：毛孩健康護照儀表板 (`/app/dashboard`)**
   - 頂部寵物切換膠囊（預設兩隻示範貓咪：8 歲布偶貓「雪球」（長毛、慢性腎病 Stage 2）、5 歲米克斯「橘子」（短毛、左眼微瞇異常））。
   - 顯示當前寵物的**「平時健康 0 分基線照（Individual Baseline）」**狀態標籤。
   - 兩大核心行動按鈕（CTA）：
     - 📸 **「AI 貓臉疼痛與外觀初篩 (FGS 48 點分析)」**
     - 📄 **「拍攝紙本血檢單 (OCR 趨勢建檔)」**
   - 近期健康警示卡片與精準保健品推薦橫幅（如：偵測到磷離子偏高，推薦「腎貓專用降磷保健粉」並附上導購標籤）。

2. **核心功能一：FGS 貓咪面部 48 點疼痛初篩頁 (`/app/fgs-scanner`)**
   - **前端拍攝防呆引導框 (Camera Guide Overlay)**：
     - 提供即時相機預覽或上傳照片功能，畫面疊加「貓臉雙眼水平對齊線與鼻頭定位框」，提示飼主：「請保持水平正視拍攝，避免廣角近拍與低機位影響眼形」。
   - **48 點科技感視覺化標註渲染 (Canvas Overlay)**：
     - 分析完成後，於貓咪照片上精準渲染 48 個編號座標點，並依部位分色顯示（支援切換三色或五色模式）：
       - 🟣 **耳部 / 耳根 (10 點，編號 01-10)**：紫色圓點與編號
       - 🔵 **眼周 / 雙眼輪廓 (16 點，編號 11-26，左眼 8 點、右眼 8 點)**：藍色圓點與編號
       - 🟡/🟠 **鼻口與鬍鬚墊 / 鼻樑下巴兩側頰部 (22 點，編號 27-48)**：金黃色（或細分為橘色鼻部、粉色口唇下巴、綠色兩側頰部）圓點與編號
   - **FGS 疼痛表情量表初評卡 (右側或下方滑動面板)**：
     - 總分顯示：`X / 10`（0-1 分綠色「未見典型急性疼痛表情」、2-3 分黃色「輕微不適建議居家觀察」、$\ge 4$ 分紅色「達到臨床疼痛干預門檻，建議立即就醫」）。
     - **五大動作單元 (5 Action Units) 明細表**：
       1. `耳朵位置` (0 / 2)：例如「直立，未見貼耳或外旋」
       2. `眼眶收緊` (0 / 2 或 1 / 2)：例如「雙眼睜開，無明顯瞇眼」或「左眼相對略窄 (EAR 比值下降)」
       3. `口鼻緊張` (0 / 2)：例如「口鼻自然，未見向兩側拉緊」
       4. `鬍鬚位置` (0 / 2)：例如「向兩側舒展，自然向下彎曲」
       5. `頭部位置` (0 / 2)：例如「頭高於肩線，未明顯低垂」
     - **方法提示與免責聲明區塊（必須完整呈現）**：
       - 「FGS 正式評分是 5 個動作單元，並非 48 分或 48 個 FGS 指標。」
       - 「48 點結合電腦視覺形態定位與個體健康基線比對；長毛遮擋處或廣角低機位可能影響眼形精度。」
       - 「單張照片不能用於臨床診斷或排除疼痛與疾病，僅供居家觀察與就醫分流參考。」

3. **核心功能二：AI 紙本血檢 OCR 與長期趨勢頁 (`/app/blood-test`)**
   - 上傳血檢單照片後，展示 AI 自動辨識過程（擷取醫院名稱、檢驗日期、核心腎病與高齡指標：`CREA` 肌酸酐、`BUN` 血中尿素氮、`SDMA` 早期腎指標、`PHOS` 磷、`ALB` 白蛋白）。
   - **跨月份趨勢折線圖 (`recharts`)**：在圖表背景畫出「正常參考值區間帶（Reference Range Band）」，清楚標示近 6 個月數據變化趨勢。
   - **AI 白話文衛教解讀與導購**：將生硬醫學數值轉為溫暖易懂的照護建議，並自動連結對應保健品。

4. **O2O 合作動物醫院一鍵分流預約頁 (`/app/clinics`)**
   - 當 FGS $\ge 4$ 分或血檢指標亮紅燈時，自動帶入「AI 初篩摘要包（含 48 點標註圖 + 近期血檢趨勢）」，讓飼主一鍵預約周邊合作動物醫院，將資料預先傳送至醫院後台。

---

### 3.2 後台端：資料收集標註中心與 B2B 獸醫 CRM (`/admin/*`，電腦寬螢幕佈局)

這是展示給評審看「資料收集飛輪（Data Flywheel）」與「B2B 商業變現」的關鍵後台，包含三個子頁面：

1. **模組一：AI 貓臉 48 點資料收集與互動標註審核器 (`/admin/fgs-dataset`)**
   - **資料集清單**：列出所有飼主上傳的貓咪影像、品種標籤（長毛/短毛/扁臉）、AI 原始預測信心度、審核狀態（`Pending` / `Verified`）。
   - **互動式 Canvas 48 點微調工具 (Human-in-the-Loop Annotator)**：
     - 支援管理員或獸醫在畫布上**用滑鼠直接拖曳修正任一編號座標點 $(x, y)$**（特別針對長毛遮擋處或低機位偏差點進行微調）。
     - 即時顯示當前選中點的座標資訊（如 `Point #15 [左眼內眼角] - X: 412px, Y: 389px`）與重算後的幾何比例。
     - 提供 **「✅ 審核通過並納入訓練集 (Verify)」**、**「📥 匯出當前影像 48 點 CSV」** 與 **「📦 批次匯出 YOLO-Pose 訓練集格式 (`.json` / `.csv`)」** 按鈕，實際觸發瀏覽器下載檔案。

2. **模組二：B2B 合作動物醫院 CRM 與分流預警看板 (`/admin/clinic-crm`)**
   - **紅燈高優先級轉診清單**：即時顯示透過 LINE 預約轉診的病患（顯示飼主 LINE 名稱、寵物名、觸發原因如「FGS 疼痛評分 5/10」或「CREA 升至 3.2 mg/dL」）。
   - **看診前 AI 預審視圖**：獸醫點擊病患即可在同一畫面查看「跨院歷史血檢折線圖」與「48 點外觀初篩圖」，節省 50% 問診時間。
   - **慢性病回診雷達**：列出超過 90 天未上傳血檢報告的慢性腎貓名單，提供「一鍵發送 LINE 官方帳號回診關懷推播」按鈕。

3. **模組三：商業營運與導購分潤數據中心 (`/admin/analytics`)**
   - 展示關鍵商業指標 KPI 卡片與圖表：
     - 累計收集有效貓臉 48 點標註樣本數（如：12,480 張）與血檢單 OCR 樣本數
     - C 端 NT$ 99/月 進階訂閱轉換率與 MRR（月經常性收入）
     - 保健品精準導購點擊率（CTR）與預估分潤收益
     - B 端合作動物醫院家數與 O2O 成功導流人次

---

## 4. 貓臉 48 點轉 FGS 五大指標之無尺度幾何演算法規範

請在程式碼中實作一套真實運作的幾何特徵計算模組（`utils/fgsGeometryCalculator.ts`），以便在後台拖曳 48 點座標時，能動態重算幾何特徵與 FGS 建議分數：

1. **無尺度標準化基準 (Scale Normalization)**：
   - 以雙眼內眼角點之歐氏距離作為基準單位 $D_{\text{base}}$：
     $$D_{\text{base}} = \sqrt{(x_{\text{left\_inner}} - x_{\text{right\_inner}})^2 + (y_{\text{left\_inner}} - y_{\text{right\_inner}})^2}$$
2. **眼眶收緊度 (Orbital Tightening) — 計算雙眼縱橫比 (EAR, Eye Aspect Ratio)**：
   - 對左右眼分別取上眼瞼關鍵點與下眼瞼關鍵點的垂直距離和，除以內外眼角水平距離：
     $$\text{EAR} = \frac{\|P_{\text{top1}} - P_{\text{bottom1}}\| + \|P_{\text{top2}} - P_{\text{bottom2}}\|}{2 \cdot \|P_{\text{outer}} - P_{\text{inner}}\|}$$
   - 判定邏輯：與該貓咪健康基線 $\text{EAR}_0$ 比較（或預設常模 $\text{EAR} \approx 0.65$）。若單眼或雙眼 $\text{EAR}$ 下降 $15\% \sim 35\%$ 評為 `1/2`（微瞇眼）；下降超過 $35\%$ 評為 `2/2`（明顯閉眼/緊縮）。
3. **耳朵位置 (Ear Position) — 耳尖外旋角與扁平比**：
   - 計算左右耳尖點與耳根內外側點構成之夾角 $\theta_{\text{ear}}$，以及雙耳尖水平距離與頭寬之比值。當雙耳向外壓平旋轉導致耳尖高度下降、外展比值升高時，對應評為 `1/2` 或 `2/2`。
4. **口鼻緊張度 (Muzzle Tension) — 鬍鬚墊橢圓扁平率 (Whisker Pad Ellipticity)**：
   - 計算鼻口與兩側頰部鬍鬚墊關鍵點構成之寬高比 $R_{\text{muzzle}} = \frac{W_{\text{whisker\_pad}}}{H_{\text{muzzle}}}$。疼痛時口鼻向兩側拉緊，$R_{\text{muzzle}}$ 較健康基線顯著上升。

---

## 5. 資料庫 Schema 設計 (TypeScript Interfaces / Supabase SQL)

請在專案中建立 `types/schema.ts` 並預載至少 4~5 筆擬真度極高的預設案例（包含「0/10 健康布偶貓（長毛遮擋提示）」、「1/10 左眼微瞇橘白貓（廣角低機位提示）」與「5/10 急性疼痛腎貓（觸發急診轉診）」）：

```typescript
export interface LandmarkPoint {
  id: number; // 1 to 48
  region: 'ear' | 'eye' | 'muzzle_whisker' | 'mouth_chin' | 'cheek';
  label: string; // e.g., "左耳尖", "左眼上緣", "鼻頭中心"
  x: number; // Normalized 0-1000 or percentage 0-100% for responsive canvas
  y: number;
  confidence: number;
}

export interface FGSRecord {
  id: string;
  petId: string;
  petName: string;
  breed: string;
  isLongHair: boolean;
  imageUrl: string;
  createdAt: string;
  cameraWarning?: string; // e.g., "廣角近拍與低機位影響眼形" or "長毛遮擋處精度較低"
  landmarks: LandmarkPoint[]; // 48 points
  scores: {
    earPosition: 0 | 1 | 2;
    orbitalTightening: 0 | 1 | 2;
    muzzleTension: 0 | 1 | 2;
    whiskerPosition: 0 | 1 | 2;
    headPosition: 0 | 1 | 2;
    total: number; // 0 to 10
  };
  observations: {
    earPosition: string;
    orbitalTightening: string;
    muzzleTension: string;
    whiskerPosition: string;
    headPosition: string;
    summary: string;
  };
  metrics: {
    leftEAR: number;
    rightEAR: number;
    earSpanRatio: number;
    muzzleEllipticity: number;
  };
  isVerified: boolean; // 用於後台資料收集標註狀態
  annotatedBy?: string;
}

export interface BloodTestRecord {
  id: string;
  petId: string;
  testDate: string;
  clinicName: string;
  metrics: {
    CREA: number; // mg/dL (Ref: 0.8 - 2.4)
    BUN: number;  // mg/dL (Ref: 16 - 36)
    SDMA: number; // ug/dL (Ref: 0 - 14)
    PHOS: number; // mg/dL (Ref: 3.1 - 7.5)
  };
  aiSummary: string;
  recommendedSupplement?: {
    name: string;
    reason: string;
    price: number;
    commissionRate: string;
  };
}
```

---

## 6. UI/UX 設計與競賽防呆規範 (Critical Rules)
1. **競賽匿名合規（極重要）**：介面任何地方（包含 Footer、後台管理員名稱、Logo 旁字樣）**絕對不可出現任何大學校名、科系名稱或指導老師姓名**，統一使用品牌名稱 **「CareLink AI」**。
2. **視覺配色**：
   - 飼主端（LINE LIFF）：採用溫暖醫療綠（Emerald `#10B981`）搭配柔和米白底色，減輕飼主焦慮感。
   - 48 點視覺化畫布：支援切換「淺色醫療卡片模式（對齊圖一風格）」與「深色專業暗房標註模式（對齊圖二 `#1E242B` 深藍灰背景風格）」，方便截圖放進簡報。
3. **互動完整性**：
   - 所有按鈕皆須可點擊並給予視覺回饋（如：點擊「匯出 48 點 CSV」能真實下載包含 `point_id,region,x,y,confidence` 的 CSV 檔；在後台畫布拖曳任一關鍵點能即時改變座標與幾何數值）。