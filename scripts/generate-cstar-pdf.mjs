import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve('d:/Github/Cstar_CareLinkAI');
const SHOTS_DIR = path.join(ROOT, '.hallmark', 'retina_shots');
const OUT_DIR = path.join(ROOT, 'submission');
const BASE_NAME = '黃澤然_PetPulse_AI_全齡犬貓疼痛視覺初篩與健康生態微服務';
const HTML_PATH = path.join(OUT_DIR, `${BASE_NAME}.html`);
const PDF_PATH = path.join(OUT_DIR, `${BASE_NAME}.pdf`);

function imgDataUri(filename) {
  const full = path.join(SHOTS_DIR, filename);
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const buf = fs.readFileSync(full);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

const shots = {
  home: imgDataUri('mobile-home-2x.jpg'),
  fgs: imgDataUri('mobile-fgs-2x.jpg'),
  trends: imgDataUri('mobile-trends-2x.jpg'),
  chat: imgDataUri('mobile-chat-2x.jpg'),
  adminFgs: imgDataUri('desktop-admin-fgs-2x.jpg'),
  adminCrm: imgDataUri('desktop-admin-crm-2x.jpg'),
};

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<title>PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12.5mm 13.5mm 12.5mm 13.5mm;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #FFFFFF;
    color: #18181B;
    font-family: "Microsoft JhengHei", "Noto Sans TC", "PingFang TC", -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 9.2pt;
    line-height: 1.48;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .mono {
    font-family: "JetBrains Mono", "Consolas", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
  }

  /* Cover Banner */
  .cover {
    background: #FAF8F5;
    border: 1px solid #E2DDD4;
    border-top: 5px solid #1F4E3D;
    border-radius: 12px;
    padding: 15px 18px 13px;
    margin-bottom: 10px;
  }

  .cover-eyebrow {
    display: inline-block;
    background: #E8F0ED;
    color: #1F4E3D;
    font-size: 8pt;
    font-weight: 700;
    padding: 2.5px 9px;
    border-radius: 999px;
    margin-bottom: 6px;
  }

  .cover h1 {
    margin: 0 0 5px;
    font-size: 15.6pt;
    line-height: 1.24;
    color: #18181B;
    letter-spacing: -0.015em;
  }

  .cover-sub {
    margin: 0 0 10px;
    font-size: 9.4pt;
    color: #3F3F46;
  }

  .cover-meta-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid #E5E0D8;
  }

  .meta-box {
    background: #FFFFFF;
    border: 1px solid #E5E0D8;
    border-radius: 8px;
    padding: 7px 10px;
  }

  .meta-box .lbl {
    display: block;
    font-size: 7.6pt;
    color: #52525B;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .meta-box .val {
    font-size: 8.8pt;
    font-weight: 700;
    color: #1F4E3D;
  }

  /* Compliance / Honesty Callout */
  .notice-bar {
    background: #FEF9EC;
    border: 1px solid #F3D99B;
    border-left: 4px solid #B45309;
    border-radius: 8px;
    padding: 7px 11px;
    font-size: 8.3pt;
    color: #3F3F46;
    margin-bottom: 10px;
  }

  .notice-bar strong { color: #92400E; }

  /* Section Titles */
  h2 {
    margin: 12px 0 6px;
    font-size: 12pt;
    font-weight: 700;
    color: #1F4E3D;
    border-bottom: 2px solid #1F4E3D;
    padding-bottom: 3px;
    break-after: avoid;
    page-break-after: avoid;
  }

  h3 {
    margin: 8px 0 4px;
    font-size: 9.8pt;
    font-weight: 700;
    color: #18181B;
    break-after: avoid;
    page-break-after: avoid;
  }

  p { margin: 0 0 5px; }
  ul, ol { margin: 3px 0 6px; padding-left: 17px; }
  li { margin-bottom: 2px; }

  /* Tags */
  .tag {
    display: inline-block;
    font-size: 7.3pt;
    font-weight: 700;
    padding: 1.5px 6px;
    border-radius: 999px;
    vertical-align: middle;
    white-space: nowrap;
  }
  .tag-done { background: #DCFCE7; color: #15803D; }
  .tag-plan { background: #FEF3C7; color: #B45309; }
  .tag-core { background: #E8F0ED; color: #1F4E3D; }
  .tag-alert { background: #FEE2E2; color: #B91C1C; }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 5px 0 8px;
    font-size: 8.1pt;
    line-height: 1.4;
  }

  th {
    background: #1F4E3D;
    color: #FFFFFF;
    text-align: left;
    padding: 5px 7px;
    font-weight: 700;
    border: 1px solid #1F4E3D;
  }

  td {
    padding: 5px 7px;
    border: 1px solid #E2DDD4;
    vertical-align: top;
  }

  tbody tr:nth-child(even) td {
    background: #FAF8F5;
  }

  /* Two-Column Cards */
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 6px 0 10px;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 6px 0 10px;
  }

  .card {
    background: #FAF8F5;
    border: 1px solid #E2DDD4;
    border-radius: 10px;
    padding: 10px 12px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .card--white {
    background: #FFFFFF;
  }

  .card--spruce {
    background: #E8F0ED;
    border-color: #B7CFC6;
  }

  .card-title {
    font-size: 9.4pt;
    font-weight: 700;
    color: #1F4E3D;
    margin-bottom: 4px;
  }

  .kpi-num {
    font-size: 15pt;
    font-weight: 700;
    color: #1F4E3D;
    line-height: 1.2;
  }

  .kpi-sub {
    font-size: 7.8pt;
    color: #52525B;
    margin-top: 2px;
  }

  /* Screenshot Gallery */
  .mobile-shots-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin: 8px 0 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .shot-card {
    background: #FAF8F5;
    border: 1px solid #E2DDD4;
    border-radius: 10px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .shot-frame {
    width: 100%;
    height: 238px;
    overflow: hidden;
    border-radius: 7px;
    border: 1px solid #DDD8CE;
    background: #FFFFFF;
  }

  .shot-frame img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
    object-position: top center;
  }

  .shot-caption {
    font-size: 7.6pt;
    line-height: 1.35;
    color: #3F3F46;
  }

  .shot-caption strong {
    display: block;
    color: #18181B;
    font-size: 8pt;
    margin-bottom: 1px;
  }

  .desktop-shots-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 8px 0 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .desktop-frame {
    width: 100%;
    border-radius: 7px;
    overflow: hidden;
    border: 1px solid #DDD8CE;
    background: #FFFFFF;
  }

  .desktop-frame img {
    width: 100%;
    height: auto;
    display: block;
  }

  .formula-box {
    background: #FAF8F5;
    border: 1px solid #E2DDD4;
    border-left: 4px solid #1F4E3D;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 8.5pt;
    margin: 6px 0 10px;
    break-inside: avoid;
  }

  .page-break {
    page-break-before: always;
    break-before: page;
  }

  .avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .doc-footer {
    margin-top: 12px;
    padding-top: 7px;
    border-top: 1px solid #E2DDD4;
    display: flex;
    justify-content: space-between;
    font-size: 7.4pt;
    color: #52525B;
    white-space: nowrap;
  }
</style>
</head>
<body>

  <!-- COVER & EXECUTIVE SUMMARY -->
  <section class="cover">
    <span class="cover-eyebrow">C-Star 創新創業競賽 ‧ 正式修訂提案書（匿名版）</span>
    <h1>PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務</h1>
    <p class="cover-sub">
      以可解釋 48 點臉部無尺度幾何初篩與跨院紙本血檢 OCR 覆核為核心微服務，Phase 1 首站精準切入高齡／慢性腎病貓「夜間急診分流焦慮」與「跨院血檢斷鏈」，並模組化銜接全齡犬貓照護、認證保姆與醫院預審之健康生態微服務。
    </p>
    <div class="cover-meta-grid">
      <div class="meta-box">
        <span class="lbl">Phase 1 首發聚焦 × 長期架構</span>
        <span class="val">高齡腎病貓切入 → 全齡犬貓健康生態微服務</span>
      </div>
      <div class="meta-box">
        <span class="lbl">目前產品進度</span>
        <span class="val">Web 全端互動雛型已完成（可實機操作）</span>
      </div>
      <div class="meta-box">
        <span class="lbl">醫療法規定位</span>
        <span class="val">遵守《獸醫師法》‧ 非醫療診斷導引工具</span>
      </div>
    </div>
  </section>

  <div class="notice-bar">
    <strong>誠實揭露與匿名聲明：</strong>本正式版提案已完全移除學校、科系、班級、學號與指導教師等可識別資訊。凡屬<strong>尚未完成上線的功能、未經臨床／市場實測之成效、定價與財務估算</strong>，內文均以 <span class="tag tag-plan">規劃／假設</span> 清楚標註，與 <span class="tag tag-done">已實作可操作雛型</span> 嚴格區隔，絕不將假設當作實際成果。
  </div>

  <!-- EXECUTIVE REVISION MATRIX -->
  <div class="avoid-break">
    <h3>修訂重點總覽（逐項對應競賽五大評審修正要求）</h3>
    <table>
      <thead>
        <tr>
          <th style="width:15%;">修正面向</th>
          <th style="width:65%;">本次聚焦修正與實作重點</th>
          <th style="width:20%;">目前驗證狀態</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. 聚焦主題</strong></td>
          <td>以「<strong>PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務</strong>」為統一微服務架構，捨棄一次性全面重開發，將 Phase 1 MVP 精準收斂於高齡慢性腎病貓（IRIS Stage 2–3）「日常打卡 → 48 點疼痛初篩 → 跨院血檢雙軌與 48H 摘要包」；全齡犬隻評估、認證保姆交接與醫院 CRM 列為 Phase 2 健康生態微服務擴展。</td>
          <td><span class="tag tag-core">已完成收斂</span></td>
        </tr>
        <tr>
          <td><strong>2. 提出證據</strong></td>
          <td>納入農業部 2025 官方調查（174 萬家貓首超家犬）與蒙特婁大學 FGS 國際期刊文獻佐證痛點；並建立標準化「真實飼主訪談／問卷／雛型試用紀錄表」，未回收前絕不捏造假樣本數據。</td>
          <td><span class="tag tag-plan">公開證據完備／實測待回填</span></td>
        </tr>
        <tr>
          <td><strong>3. 展示雛型</strong></td>
          <td>已完成可實際操作的行動優先 Web App（React + TypeScript + Vite），涵蓋日常打卡、48 點無尺度幾何運算引擎與互動標註畫布、血檢覆核與雙軌趨勢圖、48 小時免登入看診摘要頁與資料集匯出。</td>
          <td><span class="tag tag-done">已實作可操作</span></td>
        </tr>
        <tr>
          <td><strong>4. 商業模式</strong></td>
          <td>明確定義 B2C 高齡貓飼主 Freemium 訂閱（假設 <span class="mono">NT$ 149/月</span>），交代邊緣推論＋R2 零流量費低變動成本（假設 <span class="mono">NT$ 22/戶/月</span>）與損益兩平假設試算。</td>
          <td><span class="tag tag-plan">規劃與假設</span></td>
        </tr>
        <tr>
          <td><strong>5. 創新差異</strong></td>
          <td>對比紙本、11pets、Sylvester.ai / Tably、毛小愛 Fluv 四類既有方案，確立「個體 0 分基線可解釋幾何 × 跨院血檢飲水三軌整合 × LINE 輕量合規」差異優勢。</td>
          <td><span class="tag tag-core">已完成競品比較</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 1: FOCUS -->
  <h2>一、聚焦主題：解決誰的什麼問題（Phase 1 MVP 收斂）</h2>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">痛點 1｜貓咪高度忍痛引發「夜間急診分流焦慮」</div>
      <p>高齡貓與腎病貓天性善於隱藏疼痛，初期僅表現為微幅瞇眼、耳朵外壓或食慾稍減。飼主深夜發現異常時，常陷入兩難：</p>
      <ul>
        <li><strong>立刻衝夜間急診</strong>：急診掛號與檢驗費動輒數千元，且外出緊迫可能加重高齡貓心腎負擔。</li>
        <li><strong>在家觀望至隔日門診</strong>：缺乏客觀量化依據，飼主整夜焦慮，甚至錯失黃金處置時機。</li>
      </ul>
    </div>
    <div class="card">
      <div class="card-title">痛點 2｜「跨院紙本血檢」與「日常飲水照護」斷鏈</div>
      <p>IRIS Stage 2–3 腎病貓需長期跨院追蹤（日常門診、夜間急診、影像專科），但各院儀器（IDEXX、Abaxis、富士）僅提供紙本單據：</p>
      <ul>
        <li>血檢數值（<span class="mono">CREA / BUN / SDMA</span>）散落於紙本與手機相簿，無法對齊每日飲水量與皮下輸液紀錄。</li>
        <li>看診 10 分鐘內飼主難以精準口述近 3 個月波動，增加獸醫師問診整理時間。</li>
      </ul>
    </div>
  </div>

  <div class="avoid-break">
    <h3>產品範疇嚴格分期：聚焦執行，不貪多求全</h3>
    <table>
      <thead>
        <tr>
          <th style="width:18%;">階段定位</th>
          <th style="width:36%;">包含功能模組</th>
          <th style="width:46%;">聚焦理由與策略角色</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Phase 1 核心 MVP</strong><br/><span class="tag tag-done">本次主打與實作</span></td>
          <td>
            1. 單手日常飲水／食慾／排泄／輸液快記<br/>
            2. AI 貓臉 48 點 FGS 幾何快篩＋個體 0 分基線<br/>
            3. 紙本血檢 OCR 人工覆核＋CREA×飲水雙軌圖<br/>
            4. 48 小時免登入獸醫唯讀看診摘要包
          </td>
          <td>集中解決高齡腎病貓「每天都要記、半夜最焦慮、回診最難整理」的剛性閉環，不依賴線下人力即可輕量啟動驗證並收費。</td>
        </tr>
        <tr>
          <td><strong>Phase 2 健康生態微服務</strong><br/><span class="tag tag-plan">遠期擴展規劃</span></td>
          <td>
            1. 擴展全齡犬隻疼痛／步態視覺評估與多寵家庭照護<br/>
            2. 醫療級到府保姆交接包與保姆執勤端微服務<br/>
            3. 合作動物醫院看診前即時預審 CRM 看板微服務
          </td>
          <td>已於同一多寵原型系統（含犬隻切換、保姆端與醫院看板）驗證延伸架構；待 Phase 1 高齡貓付費留存達標後，再逐步開放全齡犬貓與線下 B2B 健康生態微服務。</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 2: EVIDENCE -->
  <h2>二、需求證據：公開客觀佐證與第一手實證驗證機制</h2>

  <h3>2.1 公開客觀產業與臨床文獻證據（可查證事實）</h3>
  <div class="grid-3">
    <div class="card card--spruce">
      <div class="kpi-num mono">174.2 萬隻</div>
      <div class="kpi-sub"><strong>台灣 2025 年家貓推估數</strong><br/>農業部調查兩年成長 32.8%，首度超越家犬（146 萬隻），多貓高齡化趨勢明確。</div>
    </div>
    <div class="card card--spruce">
      <div class="kpi-num mono">66.48%</div>
      <div class="kpi-sub"><strong>家貓寵物登記率提升</strong><br/>2026 年起台灣家貓強制寵物登記正式執法，醫療與數位化管理基礎加速成熟。</div>
    </div>
    <div class="card card--spruce">
      <div class="kpi-num mono">FGS &ge; 4/10</div>
      <div class="kpi-sub"><strong>蒙特婁大學臨床門檻</strong><br/>Evangelista et al. (<em>Scientific Reports</em>, 2019) 驗證五大臉部動作單元具疼痛評估效度。</div>
    </div>
  </div>

  <h3>2.2 第一手使用者訪談、問卷與雛型試用紀錄 <span class="tag tag-plan">驗證執行中／待彙整真實數據</span></h3>
  <p>
    為嚴格遵守競賽「未驗證不虛報」原則，本表保留團隊進行高齡貓飼主深度訪談、問卷調查與實機操作雛型之真實紀錄欄位；<strong>所有尚未收回之受訪數據絕不以推測值替代</strong>，團隊將於繳交定稿前持續補入實際受訪原話與統計結果：
  </p>

  <table class="avoid-break">
    <thead>
      <tr>
        <th style="width:8%;">樣本</th>
        <th style="width:20%;">受訪者背景（匿名）</th>
        <th style="width:28%;">實際遭遇痛點原話摘錄</th>
        <th style="width:28%;">操作本雛型後之實測回饋</th>
        <th style="width:16%;">真實願付價格</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="mono">#01</td>
        <td>[待填入：高齡腎病貓飼主]</td>
        <td>[待填入：夜間猶豫急診或血檢整理實際經驗]</td>
        <td>[待填入：實測飲水打卡／48 點快篩操作意見]</td>
        <td>[待填入：NT$/月]</td>
      </tr>
      <tr>
        <td class="mono">#02</td>
        <td>[待填入：多貓家庭飼主]</td>
        <td>[待填入：實際訪談原話]</td>
        <td>[待填入：實測介面優缺點回饋]</td>
        <td>[待填入：NT$/月]</td>
      </tr>
      <tr>
        <td class="mono">#03</td>
        <td>[待填入：曾帶貓跑急診飼主]</td>
        <td>[待填入：實際訪談原話]</td>
        <td>[待填入：對 FGS 0 分基線功能之評價]</td>
        <td>[待填入：NT$/月]</td>
      </tr>
      <tr>
        <td class="mono">#04</td>
        <td>[待填入：動物醫院獸醫／助理]</td>
        <td>[待填入：臨床問診資訊缺口觀察]</td>
        <td>[待填入：對 48 小時看診摘要頁之實用性評估]</td>
        <td>[待填入：試用意見]</td>
      </tr>
      <tr>
        <td class="mono">#05</td>
        <td>[待填入：熟齡貓飼主]</td>
        <td>[待填入：實際訪談原話]</td>
        <td>[待填入：最希望優先補強之功能]</td>
        <td>[待填入：NT$/月]</td>
      </tr>
    </tbody>
  </table>

  <div class="card card--white">
    <div class="card-title">標準化實地驗證問卷與 3 分鐘雛型試用任務（已備妥可立即執行）</div>
    <ol>
      <li><strong>痛點頻率</strong>：過去 12 個月內，有幾次因無法判斷貓咪是否疼痛而陷入「是否衝急診」焦慮？</li>
      <li><strong>既有替代痛點</strong>：目前跨院血檢單與飲水紀錄如何保存？看診前需花多少時間翻找整理？</li>
      <li><strong>實機試用任務</strong>：請受訪者直接操作 PetPulse AI 網頁原型，依序完成「點擊飲水 +50ml → 檢視 48 點貓臉評分與切換情境 → 檢視 CREA×飲水趨勢並開啟獸醫唯讀摘要頁」，紀錄完成時間與卡點。</li>
      <li><strong>定價敏感度測試（Van Westendorp 簡版）</strong>：詢問針對 Pro 訂閱方案（<span class="mono">NT$ 99 / 149 / 199</span>）之接受度與最願意付費的單一核心功能。</li>
    </ol>
  </div>

  <!-- SECTION 3: PROTOTYPE -->
  <div class="page-break"></div>
  <h2>三、產品雛型展示：可實際操作之系統流程與實機畫面</h2>

  <p>
    本團隊已完成可於瀏覽器與手機即時操作之 <strong>PetPulse AI 全端互動原型</strong>（React 19 + TypeScript + Vite，微服務模組化設計），採低焦慮臨床紙感配色（<span class="mono">#FAF8F5</span> 暖米白底搭配 <span class="mono">#1F4E3D</span> 鼠尾草深綠），並通過全站 10 條路由於 <span class="mono">320px–1440px</span> 寬度之自動化版面與無障礙對比檢驗（0 錯誤、0 警告）。
  </p>

  <h3>3.1 Phase 1 核心 MVP 手機端實機畫面（均為本系統真實運行渲染截圖）</h3>
  <div class="mobile-shots-grid">
    <div class="shot-card">
      <div class="shot-frame"><img src="${shots.home}" alt="日常打卡頁實機畫面" /></div>
      <div class="shot-caption">
        <strong>① 日常快記 (/app/home)</strong>
        單手點擊 +50ml 即時更新飲水進度與觸覺提示音；下方可折疊排泄布里斯托、皮下輸液與體重折線。
      </div>
    </div>
    <div class="shot-card">
      <div class="shot-frame"><img src="${shots.fgs}" alt="48點貓臉快篩實機畫面" /></div>
      <div class="shot-caption">
        <strong>② 48 點貓臉快篩 (/app/fgs-scan)</strong>
        暗房五色 48 點網格與 EAR 眼眶縱橫比遙測；底部抽屜即時計算三大 AU 分數並銜接 AI 分流。
      </div>
    </div>
    <div class="shot-card">
      <div class="shot-frame"><img src="${shots.trends}" alt="跨院血檢與飲水雙軌趨勢實機畫面" /></div>
      <div class="shot-caption">
        <strong>③ 跨院血檢趨勢 (/app/trends)</strong>
        CREA 安全帶折線對照每日飲水柱狀與體重虛線；支援紙本 OCR 覆核與 48 小時看診摘要碼。
      </div>
    </div>
    <div class="shot-card">
      <div class="shot-frame"><img src="${shots.chat}" alt="AI 問診分流實機畫面" /></div>
      <div class="shot-caption">
        <strong>④ AI 情境分流 (/app/chat)</strong>
        自動掛載近期血檢與 FGS 分數，輸出三級緊急度建議與居家 3 項檢查清單（嚴守非診斷定位）。
      </div>
    </div>
  </div>

  <h3>3.2 核心演算法實作與後台標註／預審原型畫面</h3>
  <div class="formula-box">
    <strong>已實作無尺度 48 點幾何計算核心（<span class="mono">src/utils/fgsGeometryCalculator.ts</span>）：</strong>
    以左眼內角 <span class="mono">P15</span> 與右眼內角 <span class="mono">P19</span> 歐氏距離 <span class="mono">D_base</span> 作為標準化分母消除拍攝遠近誤差，即時演算
    ① <strong>左右眼縱橫比 EAR</strong>（與雙眼對稱差檢測單眼微瞇）、② <strong>雙耳外展角 &theta;_ear 與雙耳展開比</strong>、③ <strong>口鼻鬍鬚墊扁平比 R_muzzle</strong>，並對照個體 0 分健康基線偏移百分比輸出 FGS 0–10 評分。
  </div>

  <div class="desktop-shots-grid">
    <div class="shot-card">
      <div class="desktop-frame"><img src="${shots.adminFgs}" alt="48點座標微調工作台實機畫面" /></div>
      <div class="shot-caption">
        <strong>⑤ Human-in-the-Loop 48 點標註後台 (/admin/fgs-dataset) <span class="tag tag-done">已實作</span></strong>
        支援滑鼠直接拖曳 01–48 號座標、局部放大鏡輔助長毛遮擋校正、右側即時重算無尺度幾何公式，並可真實匯出 <span class="mono">CSV</span> 與 <span class="mono">YOLO-Pose JSON</span> 訓練集。
      </div>
    </div>
    <div class="shot-card">
      <div class="desktop-frame"><img src="${shots.adminCrm}" alt="合作醫院看診前預審看板原型畫面" /></div>
      <div class="shot-caption">
        <strong>⑥ 醫院看診前預審看板原型 (/admin/clinic-crm) <span class="tag tag-plan">Phase 2 概念原型</span></strong>
        展示未來串接 Supabase Realtime 後之紅燈病患置頂分流與 48 點圖譜調閱介面；目前於本地端以 BroadcastChannel 模擬跨頁即時推播流程。
      </div>
    </div>
  </div>

  <!-- IMPLEMENTATION HONESTY TABLE -->
  <div class="page-break"></div>
  <h3>3.3 系統功能「已實作 vs 規劃／模擬」誠實對照表</h3>
  <table class="avoid-break">
    <thead>
      <tr>
        <th style="width:20%;">模組項目</th>
        <th style="width:40%;">已完成並可於實機操作之項目 <span class="tag tag-done">已實作</span></th>
        <th style="width:40%;">尚未完成或於雛型以模擬呈現 <span class="tag tag-plan">規劃／假設</span></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>前端介面與互動流程</strong></td>
        <td>完成 10 個前後台路由、響應式行動介面、多寵切換、飲水／食慾／排泄／輸液打卡與 Web Audio 觸覺提示音。</td>
        <td>LINE LIFF 正式頻道上架與 LINE 官方帳號排程推播待正式環境部署。</td>
      </tr>
      <tr>
        <td><strong>48 點貓臉幾何與 AI 模型</strong></td>
        <td>已完成 48 點無尺度幾何數學引擎、五色互動標註畫布、WebRTC 相機與 EXIF 轉正、Web Worker 推論介面與標註匯出。</td>
        <td><strong>正式量產用 <span class="mono">.onnx</span> 深度學習模型權重尚未完成大樣本訓練與臨床準確率驗證</strong>；現階段以預設點位引擎＋手動微調展示完整運算閉環。</td>
      </tr>
      <tr>
        <td><strong>跨院血檢 OCR 與摘要包</strong></td>
        <td>已完成血檢原圖並列人工確認表單、CREA×飲水雙軌圖表，以及實際可開啟之 48 小時唯讀病歷頁（<span class="mono">/packet/:token</span>）。</td>
        <td>外部 Vision LLM 自動擷取商用 API 金鑰與跨院檢驗單辨識準確率實測待串接驗證。</td>
      </tr>
      <tr>
        <td><strong>後端雲端與 Phase 2 生態</strong></td>
        <td>已撰寫 PostgreSQL 資料表遷移腳本（<span class="mono">0001_init.sql</span>）、Cloudflare Worker 閘道架構與保姆／醫院端互動介面原型。</td>
        <td>雲端正式機部署、動物醫院合作簽約、認證到府保姆招募與責任險對接皆屬 Phase 2 規劃。</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 4: BUSINESS MODEL -->
  <h2>四、商業模式、收費定價與成本結構 <span class="tag tag-plan">全節為商業規劃與財務假設</span></h2>

  <div class="grid-2">
    <div class="card card--white">
      <div class="card-title">4.1 誰願意付費與收費機制（Phase 1 主力）</div>
      <ul>
        <li><strong>免費基礎版（<span class="mono">NT$ 0</span>）【假設】</strong>：開放日常飲水／食慾／排泄打卡、每月 3 次貓臉快篩與單次血檢存檔，以低門檻養成日常習慣。</li>
        <li><strong>PetPulse Pro 照護訂閱（Phase 1 主力營收）【假設】</strong>：
          <ul>
            <li>規劃定價：<strong><span class="mono">NT$ 149 / 月</span></strong> 或 <strong><span class="mono">NT$ 1,490 / 年</span></strong>。</li>
            <li>付費對象：每月已投入數千元購買處方罐、皮下點滴與血檢之高齡／腎病貓飼主（訂閱費佔月照護支出約 2%–5%）。</li>
            <li>核心付費價值：不限次 48 點快篩與「個體 0 分基線」長期對照、無限跨院血檢 OCR 趨勢追蹤、一鍵生成 48 小時免登入獸醫摘要連結。</li>
          </ul>
        </li>
        <li><strong>Phase 2 延伸營收（不計入首年保底）【遠期規劃】</strong>：合作貓友善醫院預審 SaaS（假設 <span class="mono">NT$ 1,500–2,500/月/院</span>）與醫療保姆抽成（假設 <span class="mono">15%</span>）。</li>
      </ul>
    </div>

    <div class="card card--white">
      <div class="card-title">4.2 主要成本結構與損益兩平試算【假設模型】</div>
      <ul>
        <li><strong>架構降本優勢</strong>：規劃採 Edge-First（瀏覽器端 ONNX Runtime 推論）降低雲端 GPU 算力費，並採 Cloudflare R2 零流量費存放圖片。</li>
        <li><strong>單一付費用戶月均變動成本【假設】</strong>：
          <ul>
            <li>血檢 Vision LLM OCR 與偶發複檢 API：約 <span class="mono">NT$ 12 / 月</span></li>
            <li>R2 儲存與 Supabase 資料庫分攤：約 <span class="mono">NT$ 3 / 月</span></li>
            <li>金流手續費（約 3%–5%）：約 <span class="mono">NT$ 7 / 月</span></li>
            <li><strong>合計變動成本約 <span class="mono">NT$ 22 / 戶 / 月</span></strong>（保守以平均月營收 <span class="mono">NT$ 140</span> 計，單戶邊際貢獻假設約 <strong><span class="mono">NT$ 118 / 月</span></strong>）。</li>
          </ul>
        </li>
        <li><strong>初期月固定營運成本與兩平推估【假設】</strong>：試營運期雲端基建（<span class="mono">$5,000</span>）＋社群推廣（<span class="mono">$15,000</span>）＋獸醫顧問與標註費（<span class="mono">$25,000</span>）合計約 <strong><span class="mono">NT$ 45,000 / 月</span></strong>（不含全職創辦人薪資），約需 <strong><span class="mono">382 名</span></strong> 穩定付費戶覆蓋營運開支。</li>
      </ul>
    </div>
  </div>

  <!-- SECTION 5: COMPETITIVE DIFFERENCE -->
  <div class="page-break"></div>
  <h2>五、創新差異與市場競品比較</h2>

  <table class="avoid-break">
    <thead>
      <tr>
        <th style="width:16%;">比較維度</th>
        <th style="width:22%;">PetPulse AI（本提案）</th>
        <th style="width:15%;">紙本／LINE 記事本</th>
        <th style="width:15%;">一般寵物紀錄 App<br/>(如 11pets)</th>
        <th style="width:16%;">海外 AI 貓痛 App<br/>(Sylvester.ai / Tably)</th>
        <th style="width:16%;">台灣保姆平台<br/>(如毛小愛 Fluv)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>貓臉疼痛初篩與可解釋性</strong></td>
        <td><strong>48 點無尺度幾何＋五大 AU 分項解構</strong>（可視覺化檢視）</td>
        <td>無</td>
        <td>無</td>
        <td>有單次拍照判讀，偏向單一結果且英文介面</td>
        <td>無</td>
      </tr>
      <tr>
        <td><strong>個體 0 分基線比對</strong></td>
        <td><strong>支援建立自家貓健康基準照</strong>，消除品種臉型誤差</td>
        <td>無</td>
        <td>無</td>
        <td>通用常模為主，缺乏個體歷史偏移比對</td>
        <td>無</td>
      </tr>
      <tr>
        <td><strong>跨院血檢 × 飲水關聯</strong></td>
        <td><strong>紙本 OCR 人工覆核＋CREA×飲水雙軌圖</strong></td>
        <td>單據分散相簿，無趨勢圖</td>
        <td>需手動逐筆輸入，無 OCR 與雙軌關聯</td>
        <td>無血檢追蹤功能</td>
        <td>無慢病數據管理</td>
      </tr>
      <tr>
        <td><strong>獸醫診間協作效率</strong></td>
        <td><strong>一鍵 48 小時免登入唯讀看診摘要包</strong></td>
        <td>現場翻找相簿口述</td>
        <td>僅限飼主手機端查看</td>
        <td>僅單張截圖</td>
        <td>無看診摘要</td>
      </tr>
      <tr>
        <td><strong>台灣在地化與法規合規</strong></td>
        <td><strong>繁中、LINE 免下載規劃、嚴守《獸醫師法》</strong></td>
        <td>門檻低但無整合</td>
        <td>在地醫療格式支援有限</td>
        <td>英文為主，未整合台灣院所流程</td>
        <td>聚焦一般保姆媒合而非慢病管理</td>
      </tr>
    </tbody>
  </table>

  <div class="grid-3">
    <div class="card">
      <div class="card-title">差異 1｜個體化可解釋幾何</div>
      <p>相較黑箱給分，以雙眼內角距 <span class="mono">D_base</span> 正規化並比對自家貓 0 分健康基線，有效克服折耳、扁臉與長毛品種天生臉型差異。</p>
    </div>
    <div class="card">
      <div class="card-title">差異 2｜腎病照護三軌閉環</div>
      <p>專攻高齡腎病貓最具價值的「飲水 × 跨院血檢 × 疼痛指標」連動分析，並轉為獸醫 30 秒可讀懂的免登入看診摘要包。</p>
    </div>
    <div class="card">
      <div class="card-title">差異 3｜輕量成本與資料飛輪</div>
      <p>規劃以瀏覽器端推論與零流量費儲存壓低成本，搭配已實作的 Human-in-the-Loop 48 點標註工具，逐步累積在地貓臉資料壁壘。</p>
    </div>
  </div>

  <!-- SECTION 6: ROADMAP & RISK -->
  <h2>六、分階段執行規劃與風險控管 <span class="tag tag-plan">規劃</span></h2>

  <div class="grid-2">
    <div class="card card--white">
      <div class="card-title">務實三階段執行里程碑【規劃】</div>
      <ul>
        <li><strong>M1–M3（需求實證期）</strong>：完成 20–30 位高齡／腎病貓飼主訪談與現有 Web 雛型試用，驗證高頻痛點與 <span class="mono">NT$ 149/月</span> 願付價格；訪談 2–3 位獸醫師校對看診摘要欄位。</li>
        <li><strong>M4–M6（核心模型與封測期）</strong>：以合法授權資料集與既有標註後台訓練首版輕量 ONNX 權重，串接正式血檢 OCR API 與雲端資料庫，展開 100 名目標飼主封閉測試。</li>
        <li><strong>M7–M12（訂閱驗證與擴張評估）</strong>：上架 LINE LIFF 正式服務並驗證真實留存與付費轉換率；待 Phase 1 單位經濟達標後，再評估啟動 Phase 2 醫院合作與醫療保姆試點。</li>
      </ul>
    </div>
    <div class="card card--white">
      <div class="card-title">三大關鍵風險與緩解對策</div>
      <ul>
        <li><strong>《獸醫師法》醫療界線風險</strong>：全站常駐非醫療診斷免責聲明，嚴禁確診或開藥字眼，定位為數據管理與就醫前分流參考。</li>
        <li><strong>AI 辨識誤判／長毛遮擋風險</strong>：前端內建拍攝姿態引導與低信心度警示，提示重拍並強調不可單憑分數延誤就醫。</li>
        <li><strong>血檢 OCR 小數點錯讀風險</strong>：強制採「AI 初讀＋原圖並排人工覆核」雙重確認機制，杜絕 <span class="mono">2.9</span> 誤存為 <span class="mono">29</span> 之紀錄錯誤。</li>
      </ul>
    </div>
  </div>

  <footer class="doc-footer">
    <span>PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務｜C-Star 正式修訂提案書（匿名版）</span>
    <span class="mono">Prototype Verified · Warm Clinical Paper v2.4</span>
  </footer>

</body>
</html>`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(HTML_PATH, html, 'utf8');
console.log(`Wrote HTML: ${HTML_PATH}`);

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
execFileSync(
  edgeExe,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${PDF_PATH}`,
    `file:///${HTML_PATH.replace(/\\/g, '/')}`,
  ],
  { stdio: 'inherit' }
);

const stat = fs.statSync(PDF_PATH);
console.log(`Wrote PDF: ${PDF_PATH} (${stat.size} bytes)`);
