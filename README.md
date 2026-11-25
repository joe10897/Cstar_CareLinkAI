# CareLink AI — 寵物高齡照護與「AI 貓臉 48 點疼痛初篩／健檢數據管理」全端系統

CareLink AI 是專為台灣高齡犬貓（慢性腎病貓、退化性關節炎高齡犬貓）打造的生產級健康數據管理與就醫分流導引系統。全站嚴格遵守《獸醫師法》非診斷規範與 **Hallmark Design Skill (`Dose` 主題)** 設計工程標準。

---

## 1. 系統路由架構

### 飼主手機端 (`/app/*` & `/packet/*`)
- **`/app/fgs-scanner`**：貓臉 48 點拍攝與即時防呆相機（支援 WebRTC 真實相機串流、JPEG EXIF 方向自動轉正、Stage 1 `10~15 FPS` 水平傾角引導、Stage 2 `256x256` 仿射轉正 48 點回歸、深色暗房五色／淺色臨床三色畫布切換、FGS 五大動作單元評分與個體 0 分健康基線比對）。
- **`/app/blood-test`**：跨院紙本血檢單 OCR 解析與長期趨勢追蹤（R2 預簽章上傳、血檢原圖與 `DM Mono` 等寬字體並列之人工確認表單、正常參考值陰影帶與 IRIS Stage 3 分期折線圖、對應營養保健品建議）。
- **`/app/clinics`**：O2O 合作動物醫院轉診預約與時效性預審授權分享。
- **`/packet/:shareToken`**：看診前 AI 預審臨床摘要封包獨立檢視頁。

### 獸醫與標註員後台 (`/admin/*`)
- **`/admin/fgs-dataset`**：Human-in-the-Loop 48 點座標微調工作台（支援滑鼠／觸控筆直接拖曳 `01` 至 `48` 號關鍵點、右上角局部放大鏡檢視長毛遮擋、即時重算無尺度幾何指標、批次匯出標準 `CSV` 與 `YOLO-Pose (.json)` 訓練集）。
- **`/admin/clinic-crm`**：B2B 合作動物醫院看診前預審 CRM（透過 `Supabase Realtime` 與 `BroadcastChannel` 零延遲置頂顯示紅燈急診病患，同屏調閱 48 點貓臉圖譜與跨院血檢對照表）。

---

## 2. 本地端開發與驗證指令

```bash
# 1. 安裝依賴
npm install

# 2. 啟動本地開發伺服器 (http://localhost:5173)
npm run dev

# 3. 執行生產級打包
npm run build

# 4. 執行 Hallmark Sloplint 靜態與無頭瀏覽器渲染驗證
npm run sloplint
node scripts/ verify-carelink.mjs
```

---

## 3. 混合雲生產部署指南 (Cloudflare + Supabase + Railway)

1. **Supabase PostgreSQL & Realtime**：
   - 於 Supabase SQL Editor 執行 `supabase/migrations/0001_init.sql` 建立 `pets`、`fgs_records`、`blood_test_records` 與 `clinic_referrals` 表並啟用 Realtime Publication。
2. **Cloudflare R2 & Workers API Gateway**：
   - 設定 `wrangler.toml` 綁定 R2 儲存桶 `carelink-ai-assets`，執行 `npx wrangler deploy` 部署 `workers/api-gateway.ts`。
3. **Python FastAPI 降級推論容器**：
   - 使用 `backend/Dockerfile` 部署至 Railway 或 Modal，提供長毛遮擋或低算力裝置之雲端二次校驗。
