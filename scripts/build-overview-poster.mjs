/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve('d:/Github/Cstar_CareLinkAI');
const DOCS_SHOTS = path.join(ROOT, 'docs', 'screenshots');
const IMG_DIR = path.join(ROOT, 'public', 'images');
const OUT_PNG = path.join(ROOT, 'submission', 'PetPulse_AI_專案總覽說明圖_16x9.png');
const EDGE_EXE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function dataUri(fullPath) {
  const ext = path.extname(fullPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(fullPath).toString('base64')}`;
}

const assets = {
  studioBg: dataUri(path.join(IMG_DIR, 'studio-tech-bg.jpg')),
  catHero: dataUri(path.join(IMG_DIR, 'studio-cat-hero.jpg')),
  miso: dataUri(path.join(IMG_DIR, 'miso-ragdoll.jpg')),
  shiba: dataUri(path.join(IMG_DIR, 'yuanyuan-shiba.jpg')),
  home: dataUri(path.join(DOCS_SHOTS, 'mobile-home-2x.jpg')),
  fgs: dataUri(path.join(DOCS_SHOTS, 'mobile-fgs-2x.jpg')),
  trends: dataUri(path.join(DOCS_SHOTS, 'mobile-trends-2x.jpg')),
  packet: dataUri(path.join(DOCS_SHOTS, 'mobile-packet-2x.jpg')),
  sitter: dataUri(path.join(DOCS_SHOTS, 'mobile-sitter-2x.jpg')),
  adminFgs: dataUri(path.join(DOCS_SHOTS, 'desktop-admin-fgs-2x.jpg')),
  adminCrm: dataUri(path.join(DOCS_SHOTS, 'desktop-admin-crm-2x.jpg')),
};

const BRAND_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="17.5" cy="6.5" r="2.2" fill="currentColor"/></svg>`;

function phoneMini(imgSrc, widthPx, heightScreenPx) {
  return `
  <div class="iphone" style="width:${widthPx}px;">
    <div class="iphone-inner">
      <div class="ios-bar">
        <span class="mono">09:41</span>
        <span class="island"></span>
        <span class="mono">5G</span>
      </div>
      <img src="${imgSrc}" style="width:100%; height:${heightScreenPx}px; object-fit:cover; object-position:top center; display:block;" alt="" />
      <div class="ios-home"></div>
    </div>
  </div>`;
}

function macbookMini(imgSrc, screenHeightPx, objPos = 'top center') {
  return `
  <div class="macbook">
    <div class="mac-lid">
      <div class="mac-cam"></div>
      <div class="mac-screen" style="height:${screenHeightPx}px;">
        <img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; object-position:${objPos}; display:block;" alt="" />
      </div>
    </div>
    <div class="mac-base"></div>
  </div>`;
}

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<title>PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務｜專案總覽說明圖 (16:9)</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: #080E12;
    color: #F4F7F6;
    font-family: "Microsoft JhengHei", "Noto Sans TC", "PingFang TC", -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .mono {
    font-family: "JetBrains Mono", "Consolas", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
  }
  .canvas {
    position: relative;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: #080E12;
  }
  .bg-studio {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.55;
    z-index: 0;
  }
  .bg-cat-watermark {
    position: absolute;
    right: -40px;
    top: 40px;
    width: 820px;
    height: 820px;
    object-fit: cover;
    opacity: 0.14;
    mask-image: radial-gradient(circle at 60% 45%, black 22%, transparent 72%);
    -webkit-mask-image: radial-gradient(circle at 60% 45%, black 22%, transparent 72%);
    z-index: 0;
  }
  .bg-veil {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 50% 42%, rgba(43, 196, 138, 0.14), transparent 52%),
      radial-gradient(circle at 12% 18%, rgba(31, 78, 61, 0.25), transparent 40%),
      linear-gradient(180deg, rgba(8,14,18,0.82) 0%, rgba(8,14,18,0.68) 50%, rgba(8,14,18,0.92) 100%);
    z-index: 1;
  }
  .grid-lines {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    z-index: 2;
  }
  .stage {
    position: relative;
    z-index: 5;
    width: 100%;
    height: 100%;
    padding: 36px 52px 30px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
  }

  /* Header */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
  }
  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-mark {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(145deg, #25634D 0%, #163A2D 100%);
    border: 1px solid rgba(70, 221, 163, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #E2F8EE;
  }
  .brand-name {
    font-size: 22px;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: 0.02em;
  }
  .brand-sub {
    font-size: 13px;
    color: #93ADA4;
    letter-spacing: 0.06em;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    background: rgba(25, 68, 53, 0.56);
    border: 1px solid rgba(70, 221, 163, 0.45);
    color: #BFF5DF;
    white-space: nowrap;
  }
  .pill--amber {
    background: rgba(180, 83, 9, 0.30);
    border-color: rgba(245, 158, 11, 0.58);
    color: #FDE68A;
  }
  .pill--sky {
    background: rgba(14, 116, 144, 0.32);
    border-color: rgba(56, 189, 248, 0.52);
    color: #BAE6FD;
  }
  .dot-mint { width: 7px; height: 7px; border-radius: 50%; background: #46DDA3; display: inline-block; box-shadow: 0 0 8px #46DDA3; }
  .dot-amber { width: 7px; height: 7px; border-radius: 50%; background: #F59E0B; display: inline-block; }

  /* Hero Title */
  .hero-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 28px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.09);
  }
  .main-title {
    font-size: 40px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.015em;
    color: #FFFFFF;
  }
  .main-title .accent { color: #46DDA3; }
  .main-desc {
    font-size: 17px;
    line-height: 1.45;
    color: #C4D2D6;
    margin-top: 6px;
  }
  .hero-kpis {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
  }
  .kpi-chip {
    background: rgba(16, 28, 33, 0.84);
    border: 1px solid rgba(70, 221, 163, 0.32);
    border-radius: 14px;
    padding: 9px 15px;
    text-align: center;
  }
  .kpi-chip strong {
    display: block;
    font-size: 22px;
    color: #46DDA3;
    line-height: 1.1;
  }
  .kpi-chip span {
    font-size: 12px;
    color: #B4C5CA;
  }

  /* Main 3-Column Bento Grid */
  .bento {
    display: grid;
    grid-template-columns: 430px 792px 546px;
    gap: 24px;
    height: 708px;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
  }
  .panel {
    background: rgba(14, 22, 27, 0.84);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    padding: 16px 18px;
    backdrop-filter: blur(12px);
  }
  .panel--spruce {
    background: rgba(18, 44, 36, 0.72);
    border-color: rgba(70, 221, 163, 0.36);
  }
  .panel--amber {
    background: rgba(40, 27, 13, 0.70);
    border-color: rgba(245, 158, 11, 0.38);
  }
  .sec-eyebrow {
    font-size: 12px;
    font-weight: 700;
    color: #46DDA3;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }
  .panel-title {
    font-size: 19px;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 6px;
  }
  .panel-text {
    font-size: 14px;
    line-height: 1.48;
    color: #C7D4D8;
  }

  /* Hardware Mockups */
  .iphone {
    background: linear-gradient(155deg, #4B5760 0%, #1B2227 34%, #101518 68%, #39444B 100%);
    padding: 6px;
    border-radius: 28px;
    box-shadow: 0 22px 46px rgba(0,0,0,0.68), 0 0 0 1px rgba(255,255,255,0.16);
    flex-shrink: 0;
  }
  .iphone-inner {
    border-radius: 22px;
    overflow: hidden;
    background: #FAF8F5;
  }
  .ios-bar {
    height: 17px;
    padding: 0 10px;
    background: #FAF8F5;
    color: #18181B;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 8.5px;
    font-weight: 700;
    position: relative;
  }
  .island {
    width: 44px;
    height: 9px;
    border-radius: 999px;
    background: #0D1114;
    position: absolute;
    left: 50%;
    top: 3px;
    transform: translateX(-50%);
  }
  .ios-home {
    height: 8px;
    background: #FAF8F5;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ios-home::after {
    content: '';
    width: 54px;
    height: 2.5px;
    border-radius: 999px;
    background: rgba(24,24,27,0.24);
  }

  .macbook { display: flex; flex-direction: column; align-items: center; width: 100%; }
  .mac-lid {
    width: 96%;
    background: linear-gradient(155deg, #353F46 0%, #12171B 52%, #242C32 100%);
    padding: 8px 8px 6px;
    border-radius: 13px 13px 4px 4px;
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: 0 18px 36px rgba(0,0,0,0.64);
    position: relative;
  }
  .mac-cam {
    width: 4px; height: 4px; border-radius: 50%; background: #46DDA3; opacity: 0.7;
    position: absolute; top: 2px; left: 50%; transform: translateX(-50%);
  }
  .mac-screen { border-radius: 6px; overflow: hidden; background: #FAF8F5; }
  .mac-base {
    width: 100%; height: 8px; border-radius: 2px 2px 8px 8px;
    background: linear-gradient(180deg, #4B5760 0%, #242C32 60%, #161C20 100%);
  }

  .phone-label {
    margin-top: 8px;
    text-align: center;
  }
  .phone-label strong {
    display: block;
    font-size: 14.5px;
    color: #FFFFFF;
  }
  .phone-label span {
    font-size: 12px;
    color: #B4C6CB;
  }

  /* Microservice & Tech Stack Grid */
  .stack-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .stack-box {
    background: rgba(8, 14, 18, 0.62);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 12px;
    padding: 10px 12px;
  }
  .stack-box strong {
    display: block;
    font-size: 13.5px;
    color: #FFFFFF;
    margin-bottom: 3px;
  }
  .stack-box span {
    font-size: 12px;
    line-height: 1.38;
    color: #B7C7CC;
  }

  /* Bottom Bar */
  .bottom-strip {
    display: grid;
    grid-template-columns: 1.28fr 0.72fr;
    gap: 20px;
    align-items: center;
    background: rgba(13, 21, 26, 0.90);
    border: 1px solid rgba(70, 221, 163, 0.30);
    border-radius: 16px;
    padding: 12px 20px;
  }
  .flow-steps {
    display: grid;
    grid-template-columns: 1fr 18px 1fr 18px 1fr 18px 1fr;
    gap: 8px;
    align-items: center;
  }
  .flow-node {
    background: rgba(25, 62, 49, 0.45);
    border: 1px solid rgba(70, 221, 163, 0.28);
    border-radius: 10px;
    padding: 8px 11px;
  }
  .flow-node b { display: block; font-size: 12px; color: #46DDA3; }
  .flow-node span { font-size: 13px; font-weight: 700; color: #FFFFFF; }
  .flow-arrow { text-align: center; color: #46DDA3; font-weight: 700; font-size: 16px; }

  .footbar {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    color: #8EA1A6;
    padding-top: 2px;
  }
</style>
</head>
<body>
<div class="canvas">
  <img class="bg-studio" src="${assets.studioBg}" alt="" />
  <img class="bg-cat-watermark" src="${assets.catHero}" alt="" />
  <div class="bg-veil"></div>
  <div class="grid-lines"></div>

  <div class="stage">
    <!-- TOPBAR -->
    <div class="topbar">
      <div class="brand-lockup">
        <div class="brand-mark">${BRAND_SVG}</div>
        <span class="brand-name">PetPulse AI</span>
        <span class="brand-sub mono">PROJECT ARCHITECTURE &amp; OVERVIEW // 2026 C★STAR</span>
      </div>
      <div style="display:flex; gap:10px;">
        <span class="pill"><span class="dot-mint"></span>已完成可實機操作全端原型（10/10 路由）</span>
        <span class="pill pill--amber"><span class="dot-amber"></span>嚴守《獸醫師法》非醫療診斷分流定位</span>
      </div>
    </div>

    <!-- HERO HEADER -->
    <div class="hero-header">
      <div>
        <h1 class="main-title">PetPulse AI —— <span class="accent">全齡犬貓疼痛視覺初篩與健康生態微服務</span></h1>
        <p class="main-desc">從高齡／慢性腎病貓「夜間疼痛識別 × 跨院血檢整合」剛性痛點切入（Phase 1 MVP），以統一微服務底座平滑擴展全齡犬貓與院所保姆生態（Phase 2）。</p>
      </div>
      <div class="hero-kpis">
        <div class="kpi-chip"><strong class="mono">320萬+</strong><span>全台犬貓規模 (家貓 174.2萬)</span></div>
        <div class="kpi-chip"><strong class="mono">48-Pt</strong><span>無尺度幾何＋0分健康基線</span></div>
        <div class="kpi-chip"><strong class="mono">NT$ 149</strong><span>Pro 訂閱假設 (毛利 79.2%)</span></div>
      </div>
    </div>

    <!-- MAIN 3-COLUMN SYSTEM MAP -->
    <div class="bento">
      <!-- COL 1: WHY + WHO + BUSINESS -->
      <div class="col">
        <div class="panel panel--spruce" style="flex: 1;">
          <div class="sec-eyebrow mono">01 // TARGET AUDIENCE &amp; PAIN POINTS</div>
          <div class="panel-title">聚焦海灘頭切入：解決誰的什麼痛點？</div>
          <div style="display:flex; flex-direction:column; gap:9px; margin-top:8px;">
            <div style="background:rgba(8,14,18,0.52); border-radius:11px; padding:10px 12px;">
              <div style="font-size:14px; font-weight:700; color:#FDE68A;">痛點 1｜毛孩極度忍痛 → 半夜急診分流兩難</div>
              <div style="font-size:13px; color:#CDD8DC; margin-top:3px; line-height:1.42;">高齡貓早期疼痛僅見微瞇眼或耳外展，飼主深夜難判斷該衝高價急診（加劇緊迫）或觀望。</div>
            </div>
            <div style="background:rgba(8,14,18,0.52); border-radius:11px; padding:10px 12px;">
              <div style="font-size:14px; font-weight:700; color:#BAE6FD;">痛點 2｜跨院紙本血檢與飲水紀錄嚴重斷鏈</div>
              <div style="font-size:13px; color:#CDD8DC; margin-top:3px; line-height:1.42;">各院血檢單散落相簿，難以將 CREA/BUN 與每日飲水、皮下輸液對齊，診間 10 分鐘口述困難。</div>
            </div>
          </div>
          <!-- Mini Golden Cross Indicator -->
          <div style="margin-top:10px; background:rgba(8,14,18,0.60); border:1px solid rgba(70,221,163,0.24); border-radius:11px; padding:9px 12px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div class="mono" style="font-size:11.5px; color:#46DDA3;">農業部 2025 官方調查實證</div>
              <div style="font-size:13.5px; font-weight:700; color:#FFFFFF;">家貓兩年 +32.8% 首超家犬</div>
              <div style="font-size:11.5px; color:#A8BBC0;">174.2 萬貓 vs 146 萬犬（登記率 66.48%）</div>
            </div>
            <svg width="92" height="44" viewBox="0 0 92 44">
              <line x1="8" y1="20" x2="84" y2="23" stroke="#94A3B8" stroke-width="2" stroke-dasharray="3 2"/>
              <line x1="8" y1="34" x2="84" y2="8" stroke="#46DDA3" stroke-width="3" stroke-linecap="round"/>
              <circle cx="42" cy="21.5" r="4.5" fill="none" stroke="#F59E0B" stroke-width="1.5"/>
              <circle cx="84" cy="8" r="3.5" fill="#46DDA3"/>
            </svg>
          </div>
        </div>

        <div class="panel panel--amber">
          <div class="sec-eyebrow mono" style="color:#FDE68A;">02 // MOAT &amp; UNIT ECONOMICS 【規劃假設】</div>
          <div class="panel-title" style="font-size:18px;">鮮明競品差異 × 精實訂閱模型</div>
          <div style="display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:8px; margin:8px 0;">
            <div style="background:rgba(8,14,18,0.58); border-radius:10px; padding:8px; text-align:center;">
              <div class="mono" style="font-size:18px; font-weight:700; color:#FDE68A;">NT$149</div>
              <div style="font-size:11.5px; color:#D4DCE0;">Pro 月費假設</div>
            </div>
            <div style="background:rgba(8,14,18,0.58); border-radius:10px; padding:8px; text-align:center;">
              <div class="mono" style="font-size:18px; font-weight:700; color:#38BDF8;">~NT$22</div>
              <div style="font-size:11.5px; color:#D4DCE0;">月變動成本</div>
            </div>
            <div style="background:rgba(8,14,18,0.58); border-radius:10px; padding:8px; text-align:center;">
              <div class="mono" style="font-size:18px; font-weight:700; color:#46DDA3;">382 戶</div>
              <div style="font-size:11.5px; color:#D4DCE0;">推估兩平門檻</div>
            </div>
          </div>
          <p style="font-size:12.8px; line-height:1.45; color:#EADFD0;">
            <strong>差異優勢：</strong>超越海外單次黑箱測痛 App（Tably），獨創「<strong>個體 0 分基線可解釋 48 點幾何 × 跨院血檢雙軌 × 48H 免登入獸醫摘要</strong>」，Edge-First 壓低單戶成本（全項定價為待驗證假設）。
          </p>
        </div>
      </div>

      <!-- COL 2: LIVE APP PROTOTYPE & 48-PT CORE TECH -->
      <div class="col">
        <div class="panel panel--spruce" style="height: 100%; display:flex; flex-direction:column; justify-content:space-between; padding: 16px 20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
              <div class="sec-eyebrow mono">03 // PHASE 1 CORE MVP — LIVE INTERACTIVE PROTOTYPE（實機 Retina 渲染）</div>
              <div class="panel-title" style="font-size:20px; margin-bottom:0;">三大實機閉環：日常打卡 × 48 點無尺度初篩 × 血檢雙軌</div>
            </div>
            <span class="pill mono">FGS &ge; 4/10 THRESHOLD</span>
          </div>

          <!-- 3 Crisp Titanium Phones Side-by-Side -->
          <div style="display:grid; grid-template-columns: 1fr 22px 1.06fr 22px 1fr; gap:8px; align-items:center; padding: 2px 6px;">
            <div style="display:flex; flex-direction:column; align-items:center;">
              ${phoneMini(assets.home, 194, 384)}
              <div class="phone-label">
                <strong>① 3 秒居家打卡 (/app/home)</strong>
                <span>+50ml 飲水 · 布里斯托 · 多犬貓切換</span>
              </div>
            </div>

            <div style="text-align:center; color:#46DDA3; font-size:22px; font-weight:700; transform:translateY(-24px);">→</div>

            <div style="display:flex; flex-direction:column; align-items:center;">
              ${phoneMini(assets.fgs, 206, 408)}
              <div class="phone-label">
                <strong style="color:#46DDA3;">② 48 點幾何初篩 (/app/fgs-scan)</strong>
                <span>EAR 0.474 · 耳外展角 · 個體 0 分基線</span>
              </div>
            </div>

            <div style="text-align:center; color:#46DDA3; font-size:22px; font-weight:700; transform:translateY(-24px);">→</div>

            <div style="display:flex; flex-direction:column; align-items:center;">
              ${phoneMini(assets.trends, 194, 384)}
              <div class="phone-label">
                <strong>③ 血檢覆核 × 雙軌圖 (/app/trends)</strong>
                <span>原圖並排人工覆核 · CREA × 飲水關聯</span>
              </div>
            </div>
          </div>

          <!-- Explainable Formula + Step 4 Packet Strip -->
          <div style="display:grid; grid-template-columns: 1.15fr 0.85fr; gap:12px;">
            <div style="background:rgba(8,14,18,0.68); border:1px solid rgba(70,221,163,0.32); border-radius:12px; padding:10px 14px;">
              <div class="mono" style="font-size:11.5px; color:#46DDA3; margin-bottom:4px;">SCALE-INVARIANT MATH ENGINE (src/utils/fgsGeometryCalculator.ts)</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <span class="mono" style="font-size:12px; background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:6px; color:#FFFFFF;">D_base = ||P15−P19||</span>
                <span class="mono" style="font-size:12px; background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:6px; color:#BAE6FD;">EAR &amp; 雙眼對稱差</span>
                <span class="mono" style="font-size:12px; background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:6px; color:#FDE68A;">θ_ear &amp; R_muzzle</span>
              </div>
            </div>
            <div style="background:rgba(8,14,18,0.68); border:1px solid rgba(56,189,248,0.32); border-radius:12px; padding:10px 14px; display:flex; align-items:center; gap:10px;">
              <img src="${assets.packet}" style="width:40px; height:54px; object-fit:cover; object-position:top; border-radius:6px; border:1px solid rgba(255,255,255,0.2);" alt="" />
              <div>
                <div style="font-size:13px; font-weight:700; color:#FFFFFF;">④ AI 分流 × 48H 免登入獸醫摘要包</div>
                <div style="font-size:11.8px; color:#B7C9CE;"><code>/app/chat</code> 三級分流 ＋ <code>/packet/:token</code> 跨院唯讀</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- COL 3: PHASE 2 ECOSYSTEM + MICROSERVICES ARCHITECTURE -->
      <div class="col">
        <div class="panel panel--amber">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
            <div>
              <div class="sec-eyebrow mono" style="color:#FDE68A;">04 // HEALTH ECOSYSTEM MICROSERVICES</div>
              <div class="panel-title" style="font-size:18.5px; margin-bottom:0;">全齡犬貓擴展 × 院所／保姆微服務</div>
            </div>
            <!-- Dual Dog & Cat Badges -->
            <div style="display:flex; gap:6px; align-items:center;">
              <div style="display:flex; align-items:center; gap:5px; background:rgba(8,14,18,0.6); padding:3px 8px 3px 3px; border-radius:999px; border:1px solid rgba(70,221,163,0.4);">
                <img src="${assets.miso}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;" alt="" />
                <span style="font-size:11px;font-weight:700;">咪寶·貓</span>
              </div>
              <div style="display:flex; align-items:center; gap:5px; background:rgba(8,14,18,0.6); padding:3px 8px 3px 3px; border-radius:999px; border:1px solid rgba(245,158,11,0.45);">
                <img src="${assets.shiba}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;" alt="" />
                <span style="font-size:11px;font-weight:700;">圓圓·犬</span>
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1.48fr 0.52fr; gap:12px; align-items:center; margin:8px 0 6px;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
              ${macbookMini(assets.adminCrm, 198, 'top center')}
              <span style="font-size:12px; color:#FDE68A;"><strong>動物醫院預審 CRM</strong> (<code>/admin/clinic-crm</code>)</span>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
              ${phoneMini(assets.sitter, 114, 212)}
              <span style="font-size:12px; color:#FDE68A;"><strong>醫療保姆端</strong> (<code>/sitter/portal</code>)</span>
            </div>
          </div>
        </div>

        <div class="panel" style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:12px;">
          <div>
            <div class="sec-eyebrow mono" style="color:#38BDF8;">05 // EDGE-FIRST HYBRID CLOUD &amp; FLYWHEEL</div>
            <div class="panel-title" style="font-size:18.5px; margin-bottom:2px;">四層模組化微服務架構</div>
          </div>
          <div class="stack-grid" style="gap:11px;">
            <div class="stack-box" style="border-color:rgba(70,221,163,0.34);">
              <strong style="color:#46DDA3;">① 端側 Edge 推論層</strong>
              <span>React 19 PWA + ONNX Web Worker，運算留於裝置免 GPU 費（量產權重【規劃】）。</span>
            </div>
            <div class="stack-box" style="border-color:rgba(56,189,248,0.34);">
              <strong style="color:#BAE6FD;">② Cloudflare Edge 閘道</strong>
              <span>Workers API（LINE 驗證 / R2 預簽章直傳 / Vision OCR 接口【規劃】）。</span>
            </div>
            <div class="stack-box">
              <strong>③ Supabase PG + R2 零流量</strong>
              <span>4 表 Migration (<code>0001_init.sql</code>) ＋ Realtime 推播 ＋ R2 免輸出流量費。</span>
            </div>
            <div class="stack-box" style="border-color:rgba(245,158,11,0.34);">
              <strong style="color:#FDE68A;">④ 資料飛輪標註後台</strong>
              <span><code>/admin/fgs-dataset</code> 放大鏡校正＋真實匯出 <code>CSV</code> 與 <code>YOLO-Pose</code>。</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BOTTOM VALUE LOOP + HONESTY DISCLOSURE -->
    <div class="bottom-strip">
      <div class="flow-steps">
        <div class="flow-node"><b>STEP 01</b><span>3 秒日常飲水與症況快記</span></div>
        <div class="flow-arrow">→</div>
        <div class="flow-node"><b>STEP 02</b><span>48 點幾何＋0 分基線初篩</span></div>
        <div class="flow-arrow">→</div>
        <div class="flow-node"><b>STEP 03</b><span>跨院血檢 OCR 雙軌關聯</span></div>
        <div class="flow-arrow">→</div>
        <div class="flow-node"><b>STEP 04</b><span>48H 摘要與全齡生態擴展</span></div>
      </div>
      <div style="border-left:1px solid rgba(255,255,255,0.14); padding-left:16px; font-size:12.5px; line-height:1.45; color:#D0DCDF;">
        <span style="color:#46DDA3; font-weight:700;">● 已實作雛型：</span>10 條前後台路由、無尺度數學核、標註匯出、48H 摘要包<br/>
        <span style="color:#FDE68A; font-weight:700;">◐ 規劃／假設：</span>量產 .onnx 權重、商用 OCR API、NT$149 定價與 Phase 2 商務簽約
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footbar">
      <span>PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務 ‧ 2026 第 12 屆 C★STAR 創新創業競賽（已移除校系班級與個人可識別資訊）</span>
      <span class="mono">SYSTEM OVERVIEW v2.4 // 1920x1080 (16:9)</span>
    </div>
  </div>
</div>
</body>
</html>`;

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_EXE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: OUT_PNG, type: 'png' });
    const sizeMB = (fs.statSync(OUT_PNG).size / (1024 * 1024)).toFixed(2);
    console.log(`Rendered Overview PNG: ${OUT_PNG} (${sizeMB} MB)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
