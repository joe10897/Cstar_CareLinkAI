/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve('d:/Github/Cstar_CareLinkAI');
const RETINA_DIR = path.join(ROOT, '.hallmark', 'retina_shots');
const IMG_DIR = path.join(ROOT, 'public', 'images');
const ASSET_ROOT = path.join(ROOT, 'submission', 'cstar_assets');
const OUT_IMAGES = path.join(ASSET_ROOT, 'images');
const OUT_VIDEO_FRAMES = path.join(ASSET_ROOT, 'video', '_frames');
const OUT_VIDEO = path.join(ASSET_ROOT, 'video', 'PetPulse_AI_CStar_Product_Demo_1080p.mp4');
const DECK_HTML = path.join(ASSET_ROOT, '黃澤然_PetPulse_AI_CStar提案簡報_16x9.html');
const DECK_PDF = path.join(ASSET_ROOT, '黃澤然_PetPulse_AI_CStar提案簡報_16x9.pdf');
const EDGE_EXE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FFMPEG_EXE = fs.existsSync('D:\\Anaconda3\\Library\\bin\\ffmpeg.exe')
  ? 'D:\\Anaconda3\\Library\\bin\\ffmpeg.exe'
  : 'ffmpeg';

fs.mkdirSync(OUT_IMAGES, { recursive: true });
fs.mkdirSync(OUT_VIDEO_FRAMES, { recursive: true });

function dataUri(fullPath) {
  const ext = path.extname(fullPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(fullPath).toString('base64')}`;
}

function retinaJpgUri(pngName) {
  const pngPath = path.join(RETINA_DIR, pngName);
  const jpgPath = path.join(RETINA_DIR, pngName.replace(/\.png$/i, '.jpg'));
  // Convert @2x Retina PNG to visually-lossless high-quality JPEG so vector PDF stays < 5 MB with crisp selectable text
  execFileSync(FFMPEG_EXE, ['-y', '-i', pngPath, '-q:v', '2', jpgPath, '-loglevel', 'error']);
  return dataUri(jpgPath);
}

const media = {
  studioBg: dataUri(path.join(IMG_DIR, 'studio-tech-bg.jpg')),
  catHero: dataUri(path.join(IMG_DIR, 'studio-cat-hero.jpg')),
  home: retinaJpgUri('mobile-home-2x.png'),
  fgs: retinaJpgUri('mobile-fgs-2x.png'),
  trends: retinaJpgUri('mobile-trends-2x.png'),
  chat: retinaJpgUri('mobile-chat-2x.png'),
  packet: retinaJpgUri('mobile-packet-2x.png'),
  sitterPortal: retinaJpgUri('mobile-sitter-2x.png'),
  adminFgs: retinaJpgUri('desktop-admin-fgs-2x.png'),
  adminCrm: retinaJpgUri('desktop-admin-crm-2x.png'),
};

const SHARED_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1920px;
    background: #080E12;
    color: #F4F7F6;
    font-family: "Microsoft JhengHei", "Noto Sans TC", "PingFang TC", -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .mono {
    font-family: "JetBrains Mono", "Consolas", ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
  }
  .slide {
    position: relative;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: #080E12;
    page-break-after: always;
    break-after: page;
  }
  .slide:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .bg-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }
  .bg-vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 74% 48%, rgba(43, 196, 138, 0.14), transparent 44%),
      linear-gradient(90deg, rgba(8,14,18,0.95) 0%, rgba(8,14,18,0.80) 44%, rgba(8,14,18,0.22) 76%, rgba(8,14,18,0.52) 100%),
      linear-gradient(180deg, rgba(8,14,18,0.50) 0%, rgba(8,14,18,0.10) 42%, rgba(8,14,18,0.88) 100%);
    z-index: 1;
  }
  .bg-tech-veil {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 84% 16%, rgba(43, 196, 138, 0.16), transparent 42%),
      radial-gradient(circle at 14% 86%, rgba(31, 78, 61, 0.22), transparent 44%),
      linear-gradient(180deg, rgba(8, 14, 18, 0.78) 0%, rgba(8, 14, 18, 0.62) 52%, rgba(8, 14, 18, 0.90) 100%);
    z-index: 1;
  }
  .tech-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.032) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.032) 1px, transparent 1px);
    background-size: 64px 64px;
    z-index: 2;
    pointer-events: none;
  }
  .stage {
    position: relative;
    z-index: 5;
    width: 100%;
    height: 100%;
    padding: 62px 84px 54px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .stage--video {
    padding-top: 70px;
    padding-bottom: 134px;
  }

  /* Video Top Timeline Progress Bar */
  .video-progress-track {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    z-index: 30;
  }
  .video-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #1F4E3D 0%, #46DDA3 100%);
    box-shadow: 0 0 14px rgba(70, 221, 163, 0.65);
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand-lockup {
    display: inline-flex;
    align-items: center;
    gap: 14px;
  }
  .brand-mark {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(145deg, #25634D 0%, #163A2D 100%);
    border: 1px solid rgba(70, 221, 163, 0.50);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.42);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #E2F8EE;
  }
  .brand-name {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #FFFFFF;
  }
  .brand-tag {
    font-size: 13.5px;
    color: #93ADA4;
    margin-left: 6px;
    font-weight: 500;
    letter-spacing: 0.06em;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 17px;
    border-radius: 999px;
    font-size: 14.5px;
    font-weight: 700;
    background: rgba(25, 68, 53, 0.52);
    border: 1px solid rgba(70, 221, 163, 0.44);
    color: #BFF5DF;
  }
  .pill--amber {
    background: rgba(180, 83, 9, 0.30);
    border-color: rgba(245, 158, 11, 0.58);
    color: #FDE68A;
  }
  .pill--sky {
    background: rgba(14, 116, 144, 0.30);
    border-color: rgba(56, 189, 248, 0.50);
    color: #BAE6FD;
  }
  .pill--slate {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.18);
    color: #DCE4E8;
  }
  .dot-mint {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #46DDA3;
    display: inline-block;
    box-shadow: 0 0 8px rgba(70, 221, 163, 0.75);
  }
  .dot-amber {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #F59E0B;
    display: inline-block;
  }
  .hero-title {
    font-size: 66px;
    font-weight: 700;
    line-height: 1.16;
    letter-spacing: -0.02em;
    color: #FFFFFF;
  }
  .hero-title .accent {
    color: #46DDA3;
  }
  .slide-title {
    font-size: 44px;
    font-weight: 700;
    line-height: 1.20;
    letter-spacing: -0.015em;
    color: #FFFFFF;
  }
  .slide-sub {
    font-size: 20.5px;
    line-height: 1.48;
    color: #B4C4C9;
    margin-top: 10px;
  }

  /* Authentic Titanium iPhone 16 Pro Hardware Frame */
  .iphone-frame {
    position: relative;
    background: linear-gradient(155deg, #47535B 0%, #1B2227 32%, #11161A 66%, #39444B 100%);
    padding: 9px;
    border-radius: 42px;
    box-shadow:
      0 34px 72px rgba(0, 0, 0, 0.72),
      0 0 0 1px rgba(255, 255, 255, 0.16),
      inset 0 1px 1px rgba(255, 255, 255, 0.28);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }
  .iphone-frame--compact {
    padding: 7px;
    border-radius: 34px;
  }
  .iphone-inner {
    width: 100%;
    border-radius: 34px;
    overflow: hidden;
    background: #FAF8F5;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .iphone-frame--compact .iphone-inner {
    border-radius: 27px;
  }
  .ios-status {
    height: 24px;
    padding: 0 16px;
    background: #FAF8F5;
    color: #18181B;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 10.5px;
    font-weight: 700;
    flex-shrink: 0;
    position: relative;
    z-index: 3;
  }
  .ios-status--dark {
    background: #FAF8F5;
  }
  .dynamic-island {
    width: 66px;
    height: 14px;
    border-radius: 999px;
    background: #0D1114;
    position: absolute;
    left: 50%;
    top: 5px;
    transform: translateX(-50%);
  }
  .iphone-frame--compact .ios-status {
    height: 20px;
    padding: 0 12px;
    font-size: 9px;
  }
  .iphone-frame--compact .dynamic-island {
    width: 52px;
    height: 11px;
    top: 4px;
  }
  .iphone-screen-img {
    width: 100%;
    display: block;
    flex: 1;
    object-fit: cover;
    object-position: top center;
  }
  .ios-home-bar {
    height: 12px;
    background: #FAF8F5;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .ios-home-bar::after {
    content: '';
    width: 84px;
    height: 3.5px;
    border-radius: 999px;
    background: rgba(24, 24, 27, 0.24);
  }
  .iphone-frame--compact .ios-home-bar {
    height: 9px;
  }
  .iphone-frame--compact .ios-home-bar::after {
    width: 64px;
    height: 3px;
  }

  /* Authentic Space Black MacBook Pro Workstation Frame */
  .macbook-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  .macbook-lid {
    width: 96%;
    background: linear-gradient(155deg, #353F46 0%, #12171B 52%, #242C32 100%);
    padding: 11px 11px 9px;
    border-radius: 18px 18px 6px 6px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: 0 26px 56px rgba(0, 0, 0, 0.68), inset 0 1px 1px rgba(255,255,255,0.22);
    position: relative;
  }
  .macbook-cam {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #2BC48A;
    opacity: 0.65;
    position: absolute;
    top: 3px;
    left: 50%;
    transform: translateX(-50%);
  }
  .macbook-screen {
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    background: #FAF8F5;
  }
  .macbook-screen img {
    width: 100%;
    height: auto;
    display: block;
  }
  .macbook-base {
    width: 100%;
    height: 11px;
    border-radius: 2px 2px 10px 10px;
    background: linear-gradient(180deg, #4B5760 0%, #242C32 55%, #161C20 100%);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6);
    position: relative;
  }
  .macbook-base::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 72px;
    height: 4px;
    border-radius: 0 0 6px 6px;
    background: rgba(10, 14, 18, 0.55);
  }

  /* Frosted Dark Tech Cards */
  .glass-card {
    background: rgba(15, 23, 28, 0.80);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 24px 26px;
    backdrop-filter: blur(12px);
  }
  .glass-card--spruce {
    background: rgba(18, 46, 37, 0.72);
    border-color: rgba(70, 221, 163, 0.38);
  }
  .glass-card--amber {
    background: rgba(44, 29, 13, 0.68);
    border-color: rgba(245, 158, 11, 0.38);
  }
  .card-h {
    font-size: 22px;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: 8px;
  }
  .card-p {
    font-size: 17px;
    line-height: 1.54;
    color: #C7D4D8;
  }
  .kpi-val {
    font-size: 44px;
    font-weight: 700;
    color: #46DDA3;
    line-height: 1.08;
  }
  .kpi-lbl {
    font-size: 16px;
    color: #C8D5D9;
    margin-top: 8px;
    line-height: 1.44;
  }
  .footbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14.5px;
    color: #8CA1A7;
    border-top: 1px solid rgba(255,255,255,0.10);
    padding-top: 15px;
  }

  /* Clean Tech Table */
  table.tech-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 16.5px;
    line-height: 1.44;
    background: rgba(14, 21, 26, 0.86);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.10);
  }
  table.tech-table th {
    background: #1B4637;
    color: #FFFFFF;
    padding: 14px 18px;
    text-align: left;
    font-weight: 700;
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  table.tech-table td {
    padding: 13px 18px;
    color: #D6E1E4;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    vertical-align: top;
  }
  table.tech-table tr:nth-child(even) td {
    background: rgba(255,255,255,0.024);
  }
  table.tech-table td.hi {
    color: #FFFFFF;
    font-weight: 700;
    background: rgba(31, 78, 61, 0.30);
  }

  .badge-done {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    background: rgba(70, 221, 163, 0.16);
    color: #6EE7B7;
    border: 1px solid rgba(70, 221, 163, 0.38);
    margin-bottom: 6px;
  }
  .badge-plan {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    background: rgba(245, 158, 11, 0.16);
    color: #FDE68A;
    border: 1px solid rgba(245, 158, 11, 0.40);
    margin-bottom: 6px;
  }

  /* Telemetry HUD Overlay for Hero */
  .hud-float {
    position: absolute;
    background: rgba(9, 16, 20, 0.88);
    border: 1px solid rgba(70, 221, 163, 0.48);
    border-radius: 16px;
    padding: 14px 18px;
    backdrop-filter: blur(12px);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.65);
    z-index: 12;
  }

  /* Video Caption Bar */
  .video-caption {
    position: absolute;
    left: 84px;
    right: 84px;
    bottom: 34px;
    z-index: 25;
    background: rgba(7, 12, 16, 0.92);
    border: 1px solid rgba(70, 221, 163, 0.50);
    border-radius: 16px;
    padding: 16px 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    box-shadow: 0 16px 42px rgba(0, 0, 0, 0.72);
  }
  .video-chapter {
    font-size: 14px;
    font-weight: 700;
    color: #46DDA3;
    background: rgba(31, 78, 61, 0.50);
    border: 1px solid rgba(70, 221, 163, 0.40);
    border-radius: 8px;
    padding: 5px 12px;
    white-space: nowrap;
  }
  .video-sub-text {
    font-size: 23px;
    font-weight: 600;
    line-height: 1.38;
    color: #FFFFFF;
  }
`;

const BRAND_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="17.5" cy="6.5" r="2.2" fill="currentColor"/></svg>`;

function phoneMockup(imgSrc, widthPx, compact = false, extraStyle = '') {
  const imgH = Math.round(widthPx * (844 / 390) - (compact ? 14 : 18));
  return `
  <div class="iphone-frame ${compact ? 'iphone-frame--compact' : ''}" style="width:${widthPx}px; ${extraStyle}">
    <div class="iphone-inner">
      <div class="ios-status">
        <span class="mono">09:41</span>
        <div class="dynamic-island"></div>
        <span class="mono" style="letter-spacing:0.03em;">5G 100%</span>
      </div>
      <img class="iphone-screen-img" src="${imgSrc}" style="height:${imgH}px;" alt="" />
      <div class="ios-home-bar"></div>
    </div>
  </div>`;
}

function macbookMockup(imgSrc, maxImgHeightPx, objectPos = 'top center') {
  return `
  <div class="macbook-wrap">
    <div class="macbook-lid">
      <div class="macbook-cam"></div>
      <div class="macbook-screen" style="height:${maxImgHeightPx}px;">
        <img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; object-position:${objectPos};" alt="" />
      </div>
    </div>
    <div class="macbook-base"></div>
  </div>`;
}

function topBar(rightPillHtml) {
  return `
  <div class="topbar">
    <div class="brand-lockup">
      <div class="brand-mark">${BRAND_SVG}</div>
      <span class="brand-name">PetPulse AI</span>
      <span class="brand-tag mono">PET HEALTH MICROSERVICES v2.4</span>
    </div>
    ${rightPillHtml}
  </div>`;
}

function footBar(leftText, pageLabel) {
  return `
  <div class="footbar">
    <span>${leftText}</span>
    <span class="mono">${pageLabel}</span>
  </div>`;
}

function videoOverlay(videoMeta) {
  if (!videoMeta) return '';
  return `
    <div class="video-progress-track">
      <div class="video-progress-fill" style="width:${videoMeta.pct}%;"></div>
    </div>
    <div class="video-caption">
      <span class="video-chapter mono">${videoMeta.chapter}</span>
      <span class="video-sub-text">${videoMeta.caption}</span>
    </div>`;
}

/* ============================================================================
   SVG DATA VISUALIZATIONS (Pure Vector, Razor-Sharp in PNG / PDF / 1080p MP4)
   ============================================================================ */

const SVG_GOLDEN_CROSS = `
<svg viewBox="0 0 640 248" width="100%" height="236" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="catArea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#46DDA3" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#46DDA3" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <!-- Gridlines -->
  <line x1="68" y1="44" x2="604" y2="44" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 4"/>
  <line x1="68" y1="100" x2="604" y2="100" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 4"/>
  <line x1="68" y1="156" x2="604" y2="156" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 4"/>
  <line x1="68" y1="208" x2="604" y2="208" stroke="rgba(255,255,255,0.18)"/>
  <!-- Y Labels -->
  <text x="56" y="49" fill="#8FA3A8" font-size="12" text-anchor="end" font-family="Consolas,monospace">180萬</text>
  <text x="56" y="105" fill="#8FA3A8" font-size="12" text-anchor="end" font-family="Consolas,monospace">150萬</text>
  <text x="56" y="161" fill="#8FA3A8" font-size="12" text-anchor="end" font-family="Consolas,monospace">120萬</text>
  <!-- Cat Area Fill -->
  <path d="M 140 136 L 520 55 L 520 208 L 140 208 Z" fill="url(#catArea)"/>
  <!-- Dog Line (approx 148萬 -> 146萬) -->
  <line x1="140" y1="104" x2="520" y2="108" stroke="#94A3B8" stroke-width="3" stroke-dasharray="7 5"/>
  <circle cx="140" cy="104" r="6" fill="#94A3B8"/>
  <circle cx="520" cy="108" r="6" fill="#94A3B8"/>
  <text x="140" y="90" fill="#CBD5E1" font-size="13.5" font-weight="700" text-anchor="middle">家犬 ~148 萬</text>
  <text x="520" y="131" fill="#CBD5E1" font-size="13.5" font-weight="700" text-anchor="middle">家犬 ~146 萬</text>
  <!-- Cat Growth Line (131.1萬 -> 174.2萬, +32.8%) -->
  <line x1="140" y1="136" x2="520" y2="55" stroke="#46DDA3" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="140" cy="136" r="7" fill="#0B1216" stroke="#46DDA3" stroke-width="3.5"/>
  <circle cx="520" cy="55" r="8.5" fill="#46DDA3" stroke="#FFFFFF" stroke-width="2.5"/>
  <!-- Golden Cross Marker -->
  <circle cx="290" cy="105" r="14" fill="rgba(245,158,11,0.18)" stroke="#F59E0B" stroke-width="1.8" stroke-dasharray="3 3"/>
  <text x="290" y="76" fill="#FDE68A" font-size="13" font-weight="700" text-anchor="middle">黃金交叉</text>
  <!-- Cat Labels -->
  <text x="140" y="162" fill="#6EE7B7" font-size="14" font-weight="700" text-anchor="middle" font-family="Consolas,monospace">家貓 131.1 萬</text>
  <rect x="424" y="12" width="182" height="30" rx="8" fill="rgba(31,78,61,0.88)" stroke="#46DDA3" stroke-width="1.2"/>
  <text x="515" y="32" fill="#FFFFFF" font-size="14" font-weight="700" text-anchor="middle">家貓 174.2 萬 (+32.8%)</text>
  <!-- X Axis -->
  <text x="140" y="232" fill="#DCE5E8" font-size="14" font-weight="700" text-anchor="middle" font-family="Consolas,monospace">2023 農業部調查</text>
  <text x="520" y="232" fill="#46DDA3" font-size="14" font-weight="700" text-anchor="middle" font-family="Consolas,monospace">2025 農業部調查</text>
</svg>`;

const SVG_UNIT_ECONOMICS = `
<svg viewBox="0 0 640 124" width="100%" height="118" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="18" fill="#B8C9CE" font-size="13.5" font-weight="700">單戶月訂閱收入拆解【規劃假設模型】：NT$ 149 / 月 = 100%</text>
  <!-- Stacked Bar -->
  <rect x="0" y="32" width="507" height="44" rx="10" fill="#1F4E3D" stroke="#46DDA3" stroke-width="1.5"/>
  <rect x="513" y="32" width="89" height="44" rx="8" fill="rgba(56,189,248,0.28)" stroke="#38BDF8" stroke-width="1.3"/>
  <rect x="608" y="32" width="32" height="44" rx="6" fill="rgba(245,158,11,0.30)" stroke="#F59E0B" stroke-width="1.3"/>
  <!-- Bar Labels -->
  <text x="253" y="59" fill="#FFFFFF" font-size="16" font-weight="700" text-anchor="middle">單戶邊際貢獻 NT$ 118（79.2%）</text>
  <text x="557" y="58" fill="#BAE6FD" font-size="13.5" font-weight="700" text-anchor="middle">NT$ 22</text>
  <text x="624" y="58" fill="#FDE68A" font-size="12" font-weight="700" text-anchor="middle">9</text>
  <!-- Legend -->
  <circle cx="8" cy="100" r="5" fill="#46DDA3"/>
  <text x="20" y="105" fill="#DCE8E3" font-size="13">毛利貢獻（覆蓋初期營運與研發）</text>
  <circle cx="268" cy="100" r="5" fill="#38BDF8"/>
  <text x="280" y="105" fill="#BAE6FD" font-size="13">變動成本（OCR API + R2 零流量費）</text>
  <circle cx="516" cy="100" r="5" fill="#F59E0B"/>
  <text x="528" y="105" fill="#FDE68A" font-size="13">金流/稅費 NT$ 9</text>
</svg>`;

const SVG_ARCH_STRIP = `
<svg viewBox="0 0 1750 112" width="100%" height="104" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="8" width="390" height="96" rx="14" fill="rgba(18,46,37,0.74)" stroke="rgba(70,221,163,0.45)" stroke-width="1.5"/>
  <text x="24" y="38" fill="#46DDA3" font-size="13" font-weight="700" font-family="Consolas,monospace">01 // EDGE DEVICE (ZERO GPU COST)</text>
  <text x="24" y="65" fill="#FFFFFF" font-size="18.5" font-weight="700">React PWA + ONNX Runtime Web</text>
  <text x="24" y="89" fill="#C4D4CF" font-size="13.5">48 點幾何運算在用戶裝置執行，保護隱私免雲端算力費</text>

  <path d="M 404 56 L 444 56 M 436 48 L 446 56 L 436 64" stroke="#46DDA3" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <rect x="456" y="8" width="390" height="96" rx="14" fill="rgba(15,23,28,0.85)" stroke="rgba(56,189,248,0.42)" stroke-width="1.5"/>
  <text x="478" y="38" fill="#38BDF8" font-size="13" font-weight="700" font-family="Consolas,monospace">02 // EDGE API GATEWAY</text>
  <text x="478" y="65" fill="#FFFFFF" font-size="18.5" font-weight="700">Cloudflare Workers + Signed Token</text>
  <text x="478" y="89" fill="#C4D4CF" font-size="13.5">血檢 OCR 代理轉發、48H 免登入摘要簽章驗證與節流控管</text>

  <path d="M 858 56 L 898 56 M 890 48 L 900 56 L 890 64" stroke="#38BDF8" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <rect x="910" y="8" width="390" height="96" rx="14" fill="rgba(15,23,28,0.85)" stroke="rgba(70,221,163,0.35)" stroke-width="1.5"/>
  <text x="932" y="38" fill="#46DDA3" font-size="13" font-weight="700" font-family="Consolas,monospace">03 // DATA &amp; ZERO-EGRESS STORAGE</text>
  <text x="932" y="65" fill="#FFFFFF" font-size="18.5" font-weight="700">Supabase PostgreSQL + Cloudflare R2</text>
  <text x="932" y="89" fill="#C4D4CF" font-size="13.5">關聯式病歷結構＋原圖儲存免輸出流量費，壓低變動成本</text>

  <path d="M 1312 56 L 1352 56 M 1344 48 L 1354 56 L 1344 64" stroke="#F59E0B" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <rect x="1364" y="8" width="384" height="96" rx="14" fill="rgba(44,29,13,0.72)" stroke="rgba(245,158,11,0.45)" stroke-width="1.5"/>
  <text x="1386" y="38" fill="#FDE68A" font-size="13" font-weight="700" font-family="Consolas,monospace">04 // DATA FLYWHEEL 【下階段規劃】</text>
  <text x="1386" y="65" fill="#FFFFFF" font-size="18.5" font-weight="700">Human-in-the-Loop → 輕量 .onnx</text>
  <text x="1386" y="89" fill="#FDE68A" font-size="13.5">標註工作台匯出 YOLO-Pose 持續疊代高齡貓專屬模型</text>
</svg>`;

/* ============================================================================
   SLIDE BUILDERS (Shared across 5 Gallery PNGs, 10-Slide Deck, 8-Scene Video)
   ============================================================================ */

function slide01Cover(videoMeta = null, pageLabel = 'PETPULSE AI // 01 COVER') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.catHero}" style="object-position: 62% center;" alt="" />
    <div class="bg-vignette"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill"><span class="dot-mint"></span>2026 第 12 屆 C★STAR ‧ 全齡犬貓疼痛視覺初篩與健康生態微服務</span>')}
      <div style="display:grid; grid-template-columns: 1.06fr 0.94fr; gap: 36px; align-items: center;">
        <div style="display:flex; flex-direction:column; gap: 22px;">
          <span class="pill pill--slate" style="width:fit-content;">PHASE 1 高齡腎病貓切入 ‧ 延伸全齡犬貓與健康生態微服務</span>
          <h1 class="hero-title">
            讓毛孩無聲的痛<br/>
            化為<span class="accent">可解釋臨床數據</span>
          </h1>
          <p style="font-size:22px; line-height:1.55; color:#D1DCE0; max-width: 760px;">
            <strong>PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務</strong>。首站以 <strong>48 點無尺度幾何初篩</strong>、<strong>跨院血檢 OCR 雙軌圖</strong>與
            <strong>48H 免登入獸醫摘要包</strong>化解高齡貓夜間焦慮，並模組化擴展犬貓照護與認證保姆微服務。
          </p>
          <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; max-width: 720px; margin-top: 4px;">
            <div class="glass-card glass-card--spruce" style="padding:16px 18px; border-radius:16px;">
              <div class="mono" style="font-size:26px; font-weight:700; color:#46DDA3;">320萬+</div>
              <div style="font-size:13.5px; color:#CBE0D8; margin-top:4px;">全台犬貓合計規模</div>
            </div>
            <div class="glass-card" style="padding:16px 18px; border-radius:16px;">
              <div class="mono" style="font-size:26px; font-weight:700; color:#FFFFFF;">48-Pt</div>
              <div style="font-size:13.5px; color:#C2CFD4; margin-top:4px;">無尺度幾何＋0分基線</div>
            </div>
            <div class="glass-card" style="padding:16px 18px; border-radius:16px;">
              <div class="mono" style="font-size:26px; font-weight:700; color:#38BDF8;">10 / 10</div>
              <div style="font-size:13.5px; color:#C2CFD4; margin-top:4px;">微服務全端路由實機運作</div>
            </div>
          </div>
        </div>
        <div style="position:relative; display:flex; justify-content:flex-end; align-items:center; gap: 22px; padding-right: 10px;">
          ${phoneMockup(media.home, 294, false, 'transform: translateY(24px);')}
          ${phoneMockup(media.fgs, 316, false, 'transform: translateY(-16px);')}
          <div class="hud-float" style="left: -68px; bottom: 8px;">
            <div class="mono" style="font-size:12px; color:#46DDA3; letter-spacing:0.06em;">LIVE TELEMETRY // FGS-48P</div>
            <div style="display:flex; gap:18px; margin-top:6px; align-items:baseline;">
              <div><span class="mono" style="font-size:22px; font-weight:700; color:#FFFFFF;">0.474</span><span style="font-size:12px; color:#9FB3B8; margin-left:4px;">EAR</span></div>
              <div><span class="mono" style="font-size:22px; font-weight:700; color:#38BDF8;">40.3°</span><span style="font-size:12px; color:#9FB3B8; margin-left:4px;">θ_ear</span></div>
              <div><span class="mono" style="font-size:22px; font-weight:700; color:#FDE68A;">6/10</span><span style="font-size:12px; color:#9FB3B8; margin-left:4px;">FGS</span></div>
            </div>
          </div>
        </div>
      </div>
      ${videoMeta ? '' : footBar('嚴守《獸醫師法》非醫療診斷分流導引定位 ‧ 全畫面均為實機渲染 Retina 原型介面', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function slide02CoreTech(videoMeta = null, pageLabel = 'PETPULSE AI // 02 CORE TECHNOLOGY') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.studioBg}" alt="" />
    <div class="bg-tech-veil"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill"><span class="dot-mint"></span>核心演算法已實作 ‧ FGS 48-POINT SCALE-INVARIANT GEOMETRY</span>')}
      <div style="display:grid; grid-template-columns: 312px 1fr; gap: 40px; align-items: center;">
        <div style="display:flex; justify-content:center;">
          ${phoneMockup(media.fgs, 304, false)}
        </div>
        <div style="display:flex; flex-direction:column; gap: 18px;">
          <div>
            <h2 class="slide-title">48 點無尺度幾何演算 × 個體 0 分健康基線</h2>
            <p class="slide-sub">依據蒙特婁大學 <em>Feline Grimace Scale (Scientific Reports, 2019)</em>，以透明幾何比值克服折耳／長毛／扁臉品種誤差</p>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
              <span class="pill pill--slate mono" style="font-size:13px; padding:5px 13px;">D_base = ||P15 − P19||</span>
              <span class="pill pill--slate mono" style="font-size:13px; padding:5px 13px;">EAR = (|P11−P17| + |P13−P15|) / 2|P12−P16|</span>
              <span class="pill mono" style="font-size:13px; padding:5px 13px;">Δ% = (Current − 0pt Baseline) / Baseline</span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px;">
            <div class="glass-card glass-card--spruce" style="padding:18px 20px;">
              <div class="mono" style="font-size:13.5px; color:#46DDA3; margin-bottom:5px;">01 / SCALE NORMALIZATION</div>
              <div class="card-h" style="font-size:20px;">雙眼內角距 D_base</div>
              <p class="card-p" style="font-size:15.5px;">以雙眼內眼角歐氏距離為分母，徹底消除手機拍攝遠近縮放誤差。</p>
            </div>
            <div class="glass-card" style="padding:18px 20px;">
              <div class="mono" style="font-size:13.5px; color:#38BDF8; margin-bottom:5px;">02 / ORBITAL &amp; EARS</div>
              <div class="card-h" style="font-size:20px;">EAR 縱橫比與耳外展角</div>
              <p class="card-p" style="font-size:15.5px;">即時量測左右眼對稱差與雙耳外旋角 θ_ear，捕捉微幅瞇眼與飛機耳。</p>
            </div>
            <div class="glass-card" style="padding:18px 20px;">
              <div class="mono" style="font-size:13.5px; color:#F59E0B; margin-bottom:5px;">03 / INDIVIDUAL BASELINE</div>
              <div class="card-h" style="font-size:20px;">自家貓 0 分健康基線</div>
              <p class="card-p" style="font-size:15.5px;">建置平時放鬆基準照，每次快篩對照自身偏移量，杜絕通用常模誤判。</p>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1.38fr 0.62fr; gap: 20px; align-items: center;">
            ${macbookMockup(media.adminFgs, 356, 'center 78%')}
            <div class="glass-card" style="padding:20px 22px;">
              <span class="pill" style="font-size:13px; padding:5px 12px; margin-bottom:10px;">Human-in-the-Loop 後台已實作</span>
              <div class="card-h" style="font-size:20px;">48 點微調放大鏡與匯出</div>
              <p class="card-p" style="font-size:15px;">支援拖曳 01–48 點即時重算 9 項幾何指標，真實匯出 <span class="mono">CSV</span> 與 <span class="mono">YOLO-Pose</span>，為下階段輕量 <span class="mono">.onnx</span> 訓練建立資料飛輪（量產權重屬【規劃】）。</p>
            </div>
          </div>
        </div>
      </div>
      ${videoMeta ? '' : footBar('核心數學引擎已實作於 src/utils/fgsGeometryCalculator.ts ‧ 正式量產深度學習權重規劃於下階段訓練驗證', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function slide03KidneyLoop(videoMeta = null, pageLabel = 'PETPULSE AI // 03 CLINICAL WORKFLOW') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.studioBg}" alt="" />
    <div class="bg-tech-veil"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill"><span class="dot-mint"></span>PHASE 1 MVP ‧ 四步驟居家到診間實機操作閉環</span>')}
      <div>
        <h2 class="slide-title">從「每天 3 秒打卡」到「48 小時免登入獸醫看診摘要包」</h2>
        <p class="slide-sub">完整串聯高齡慢性腎病貓（IRIS Stage 2–3）居家補水、跨院血檢覆核、AI 分流與診間唯讀調閱四個實機畫面</p>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 22px 1fr 22px 1fr 22px 1fr; gap: 14px; align-items: center;">
        <div style="display:flex; flex-direction:column; align-items:center; gap: 14px;">
          ${phoneMockup(media.home, 250, true)}
          <div class="glass-card" style="width:100%; padding: 15px 17px;">
            <div class="mono" style="font-size:12.5px; color:#46DDA3; margin-bottom:3px;">STEP 01 // DAILY LOG</div>
            <div class="card-h" style="font-size:18.5px; margin-bottom:4px;">單手 3 秒居家快記</div>
            <p class="card-p" style="font-size:14px;">飲水 <span class="mono">+50ml</span> 進度、食慾三段、布里斯托便況與輸液打卡。</p>
          </div>
        </div>

        <div style="text-align:center; color:#46DDA3; font-size:28px; font-weight:700; transform:translateY(-64px);">→</div>

        <div style="display:flex; flex-direction:column; align-items:center; gap: 14px;">
          ${phoneMockup(media.trends, 250, true)}
          <div class="glass-card glass-card--spruce" style="width:100%; padding: 15px 17px;">
            <div class="mono" style="font-size:12.5px; color:#46DDA3; margin-bottom:3px;">STEP 02 // DUAL-TRACK LABS</div>
            <div class="card-h" style="font-size:18.5px; margin-bottom:4px;">血檢覆核 × 飲水疊圖</div>
            <p class="card-p" style="font-size:14px;">原圖並排防錯讀，<span class="mono">CREA</span> 安全帶對照每日飲水負相關趨勢。</p>
          </div>
        </div>

        <div style="text-align:center; color:#46DDA3; font-size:28px; font-weight:700; transform:translateY(-64px);">→</div>

        <div style="display:flex; flex-direction:column; align-items:center; gap: 14px;">
          ${phoneMockup(media.chat, 250, true)}
          <div class="glass-card" style="width:100%; padding: 15px 17px;">
            <div class="mono" style="font-size:12.5px; color:#38BDF8; margin-bottom:3px;">STEP 03 // AI TRIAGE</div>
            <div class="card-h" style="font-size:18.5px; margin-bottom:4px;">情境分流與 3 項檢查</div>
            <p class="card-p" style="font-size:14px;">自動掛載最新血檢與 FGS 分數，引導牙齦黏膜與呼吸頻率檢查。</p>
          </div>
        </div>

        <div style="text-align:center; color:#46DDA3; font-size:28px; font-weight:700; transform:translateY(-64px);">→</div>

        <div style="display:flex; flex-direction:column; align-items:center; gap: 14px;">
          ${phoneMockup(media.packet, 250, true)}
          <div class="glass-card glass-card--spruce" style="width:100%; padding: 15px 17px;">
            <div class="mono" style="font-size:12.5px; color:#FDE68A; margin-bottom:3px;">STEP 04 // VET PACKET</div>
            <div class="card-h" style="font-size:18.5px; margin-bottom:4px;">48H 免登入獸醫摘要</div>
            <p class="card-p" style="font-size:14px;">實機唯讀頁 <span class="mono">/packet/:token</span> 呈現 48 點圖譜與趨勢縮短診間溝通。</p>
          </div>
        </div>
      </div>
      ${videoMeta ? '' : footBar('四部裝置均呈現本專案實機運行 Retina 畫面 ‧ 外部商用 Vision LLM 自動辨識 API 規劃於正式環境串接', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function slide04Ecosystem(videoMeta = null, pageLabel = 'PETPULSE AI // 04 PROTOTYPE & ROADMAP') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.studioBg}" alt="" />
    <div class="bg-tech-veil"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill"><span class="dot-mint"></span>務實微服務分期 ‧ 已實作 MVP VS 全齡健康生態擴展</span>')}
      <div>
        <h2 class="slide-title">聚焦 Phase 1 腎病貓 MVP 閉環，擴展 Phase 2 全齡健康生態微服務</h2>
        <p class="slide-sub">明確區隔「已完成可實際操作之微服務原型」與「下階段擴展規劃」，展現團隊執行紀律與風險控管能力</p>
      </div>
      <div style="display:grid; grid-template-columns: 1.02fr 0.98fr; gap: 32px; align-items: stretch;">
        <div class="glass-card glass-card--spruce" style="display:flex; flex-direction:column; justify-content:space-between; gap:16px;">
          <div>
            <span class="pill" style="margin-bottom:12px;"><span class="dot-mint"></span>Phase 1 核心 MVP（已實作可操作雛型）</span>
            <div class="card-h" style="font-size:26px;">高齡腎病貓居家照護與就醫前疼痛分流</div>
            <ul style="font-size:17px; line-height:1.68; color:#DCE8E3; padding-left:22px; margin-top:10px;">
              <li><strong>行動端與多寵微服務 10 路由</strong>：支援高齡貓與犬隻建檔，通過 320px–1440px 響應式檢驗。</li>
              <li><strong>48 點無尺度幾何數學引擎</strong>：支援互動拖曳、個體 0 分基線比對與 CSV／YOLO-Pose 匯出。</li>
              <li><strong>血檢覆核與 48H 唯讀摘要頁</strong>：可即時新增紀錄、更新雙軌趨勢並開啟 <span class="mono">/packet/:token</span>。</li>
              <li><strong>誠實揭露【待下階段完成】</strong>：正式 <span class="mono">.onnx</span> 權重訓練、商用 OCR API、LINE LIFF 上架與實地飼主樣本驗證。</li>
            </ul>
          </div>
          <div style="display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px;">
            <div style="background:rgba(8,14,18,0.58); border:1px solid rgba(70,221,163,0.22); border-radius:14px; padding:13px 15px;">
              <div class="mono" style="font-size:27px; font-weight:700; color:#46DDA3;">10/10</div>
              <div style="font-size:13.5px; color:#B8C8CC;">前後台路由實機通過</div>
            </div>
            <div style="background:rgba(8,14,18,0.58); border:1px solid rgba(70,221,163,0.22); border-radius:14px; padding:13px 15px;">
              <div class="mono" style="font-size:27px; font-weight:700; color:#46DDA3;">48-Pt</div>
              <div style="font-size:13.5px; color:#B8C8CC;">無尺度幾何即時重算</div>
            </div>
            <div style="background:rgba(8,14,18,0.58); border:1px solid rgba(70,221,163,0.22); border-radius:14px; padding:13px 15px;">
              <div class="mono" style="font-size:27px; font-weight:700; color:#46DDA3;">0 Err</div>
              <div style="font-size:13.5px; color:#B8C8CC;">自動化視覺與無障礙檢核</div>
            </div>
          </div>
        </div>

        <div class="glass-card glass-card--amber" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            <span class="pill pill--amber" style="margin-bottom:12px;"><span class="dot-amber"></span>Phase 2 健康生態微服務【遠期規劃／介面概念原型】</span>
            <div class="card-h" style="font-size:25px;">全齡犬貓適配 × 醫院預審 CRM × 認證醫療保姆</div>
            <p class="card-p" style="font-size:16px;">待 Phase 1 驗證真實留存後，逐步擴展犬隻表情／步態篩檢及院所保姆生態；目前已完成介面原型：</p>
          </div>
          <div style="display:grid; grid-template-columns: 1.48fr 0.52fr; gap:16px; align-items:center;">
            ${macbookMockup(media.adminCrm, 286)}
            <div style="display:flex; justify-content:center;">
              ${phoneMockup(media.sitterPortal, 174, true)}
            </div>
          </div>
          <p style="font-size:14.5px; color:#FDE68A;">註：犬隻專屬模型、醫院 B2B 簽約、保姆招募與責任險皆屬 Phase 2 規劃，不列為現階段實際成果。</p>
        </div>
      </div>
      ${videoMeta ? '' : footBar('混合雲微服務架構：Cloudflare Pages / Workers / R2 零流量費 + Supabase PostgreSQL + Edge ONNX Runtime', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function slide05BusinessDiff(videoMeta = null, pageLabel = 'PETPULSE AI // 05 MARKET & BUSINESS MODEL') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.studioBg}" alt="" />
    <div class="bg-tech-veil"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill pill--amber"><span class="dot-amber"></span>市場證據 ‧ 競品差異 ‧ 商業模式【財務與定價為規劃假設】</span>')}
      <div>
        <h2 class="slide-title">可驗證市場切口、鮮明產品差異與精實訂閱假設</h2>
        <p class="slide-sub">鎖定台灣 174.2 萬家貓黃金交叉與 320 萬+ 犬貓市場，以 Edge-First 微服務架構建立長期護城河</p>
      </div>
      <div style="display:grid; grid-template-columns: 1.08fr 0.92fr; gap: 28px; align-items: stretch;">
        <div style="display:flex; flex-direction:column; gap: 16px;">
          <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;">
            <div class="glass-card glass-card--spruce" style="padding:18px 22px;">
              <div class="kpi-val mono" style="font-size:40px;">174.2 萬隻</div>
              <div class="kpi-lbl" style="font-size:15px;"><strong>農業部 2025 官方調查</strong><br/>兩年成長 32.8% 首度超越家犬（146 萬隻）</div>
            </div>
            <div class="glass-card" style="padding:18px 22px;">
              <div class="kpi-val mono" style="font-size:40px; color:#FDE68A;">NT$ 149<span style="font-size:20px;">/月</span></div>
              <div class="kpi-lbl" style="font-size:15px;"><strong>PetPulse Pro【規劃假設】</strong><br/>預估變動成本約 NT$ 22/戶/月，邊際貢獻 79%</div>
            </div>
          </div>

          <table class="tech-table" style="font-size:15px;">
            <thead>
              <tr>
                <th style="width:22%;">比較面向</th>
                <th style="width:32%;">PetPulse AI（本提案）</th>
                <th style="width:23%;">海外貓痛 App (Tably)</th>
                <th style="width:23%;">一般紀錄 / 紙本</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>疼痛初篩</strong></td>
                <td class="hi">48 點可解釋幾何＋0 分基線</td>
                <td>黑箱單次判讀，無個體基線</td>
                <td>無 AI 輔助評估</td>
              </tr>
              <tr>
                <td><strong>跨院血檢</strong></td>
                <td class="hi">OCR 覆核 × 飲水雙軌關聯</td>
                <td>無血檢管理</td>
                <td>單據散落、全手動輸入</td>
              </tr>
              <tr>
                <td><strong>獸醫協作</strong></td>
                <td class="hi">48H 免登入唯讀看診摘要</td>
                <td>僅單張截圖</td>
                <td>現場翻相簿口述</td>
              </tr>
              <tr>
                <td><strong>在地合規</strong></td>
                <td class="hi">繁中 LINE 輕量＋嚴守法規</td>
                <td>英文為主、未接台灣院所</td>
                <td>缺乏系統防呆提醒</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="glass-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            <span class="pill pill--amber" style="margin-bottom:10px;">單位經濟與商業假設【全項待實測驗證】</span>
            <div class="card-h" style="font-size:22px;">誰付費？收費多少？主要成本？</div>
            <div style="margin: 10px 0 8px;">${SVG_UNIT_ECONOMICS}</div>
            <ul style="font-size:15.5px; line-height:1.62; color:#D1DCDE; padding-left:20px;">
              <li><strong>付費客群</strong>：高齡／腎病貓飼主（月醫療耗材數千元，訂閱費佔比僅 2%–5%）。</li>
              <li><strong>定價【假設】</strong>：基礎打卡免費；Pro 訂閱 <span class="mono">NT$ 149/月</span>（年繳 <span class="mono">NT$ 1,490</span>）。</li>
              <li><strong>兩平【假設】</strong>：若初期試營運月開支 <span class="mono">NT$ 45,000</span>（不含全職薪資），約需 <span class="mono">382 戶</span> 達現金流兩平。</li>
            </ul>
          </div>
          <div style="background:rgba(31,78,61,0.38); border:1px solid rgba(70,221,163,0.38); border-radius:12px; padding:13px 16px; font-size:15px; color:#DCEFE7;">
            <strong>下一步驗證：</strong>執行 20–30 位高齡貓飼主訪談與原型實測，以真實願付價格校正上述假設。
          </div>
        </div>
      </div>
      ${videoMeta ? '' : footBar('所有定價、轉換率、成本與兩平戶數均為【規劃假設模型】，正式商業成效將於試營運實測後驗證', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

/* ============================================================================
   DEDICATED DECK & VIDEO SLIDES (Problem + Chart, Evidence, Honesty + Arch,
   Competitive Matrix, Business Economics + Sensitivity, Roadmap Closing)
   ============================================================================ */

function slideDeckProblem(videoMeta = null, pageLabel = 'PETPULSE AI // SLIDE 02 / 10') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.studioBg}" alt="" />
    <div class="bg-tech-veil"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill"><span class="dot-mint"></span>01 // 聚焦主題：解決誰的什麼問題</span>')}
      <div>
        <h2 class="slide-title">台灣進入「貓多於狗」黃金交叉，高齡腎病貓照護陷入兩大痛點</h2>
        <p class="slide-sub">精準鎖定台灣都會區 7 歲以上高齡貓與慢性腎病貓（CKD / IRIS Stage 2–3）飼主，絕不一次發散做過多無關功能</p>
      </div>
      <div style="display:grid; grid-template-columns: 1.05fr 0.95fr; gap: 28px; align-items: stretch;">
        <div class="glass-card glass-card--spruce" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            <div class="mono" style="font-size:13.5px; color:#46DDA3; margin-bottom:4px;">VERIFIED MARKET DATA // MINISTRY OF AGRICULTURE (2025)</div>
            <div class="card-h" style="font-size:23px;">全國家貓數兩年暴增 32.8% 首度超越家犬</div>
          </div>
          ${SVG_GOLDEN_CROSS}
          <div style="display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px;">
            <div style="background:rgba(8,14,18,0.52); border-radius:12px; padding:12px 14px;">
              <div class="mono" style="font-size:24px; font-weight:700; color:#46DDA3;">66.48%</div>
              <div style="font-size:13.5px; color:#C2D2CD;">2026 強制貓咪寵物登記率提升</div>
            </div>
            <div style="background:rgba(8,14,18,0.52); border-radius:12px; padding:12px 14px;">
              <div class="mono" style="font-size:24px; font-weight:700; color:#FDE68A;">FGS &ge; 4/10</div>
              <div style="font-size:13.5px; color:#C2D2CD;">蒙特婁大學實證疼痛建議介入門檻</div>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap: 20px; justify-content:space-between;">
          <div class="glass-card" style="flex:1; display:flex; flex-direction:column; justify-content:center;">
            <div class="mono" style="font-size:14px; color:#F59E0B; margin-bottom:8px;">CORE PAIN POINT 01 // NIGHTTIME TRIAGE ANXIETY</div>
            <div class="card-h" style="font-size:26px;">貓咪天性極度忍痛，引發「夜間急診分流焦慮」</div>
            <p class="card-p" style="font-size:17px;">初期疼痛僅表現為微幅瞇眼、耳朵外壓或食慾微降。半夜猶豫該冒著外出劇烈緊迫與高昂費用衝急診，或在家觀察怕延誤病情，飼主缺乏客觀量化參考工具。</p>
          </div>
          <div class="glass-card" style="flex:1; display:flex; flex-direction:column; justify-content:center;">
            <div class="mono" style="font-size:14px; color:#38BDF8; margin-bottom:8px;">CORE PAIN POINT 02 // FRAGMENTED CROSS-CLINIC LABS</div>
            <div class="card-h" style="font-size:26px;">「跨院紙本血檢」與「日常飲水」嚴重斷鏈</div>
            <p class="card-p" style="font-size:17px;">不同醫院檢驗機台（IDEXX、Abaxis、富士）輸出分散紙本單據，飼主難以將 <span class="mono">CREA / BUN / SDMA</span> 與每日飲水、皮下輸液對齊，診間 10 分鐘口述易漏失關鍵趨勢。</p>
          </div>
        </div>
      </div>
      ${videoMeta ? '' : footBar('資料來源：中華民國農業部全國家犬貓飼養數量調查（2025）、Université de Montréal FGS 臨床研究（Scientific Reports, 2019）', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function slideDeckEvidence(videoMeta = null, pageLabel = 'PETPULSE AI // SLIDE 03 / 10') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.studioBg}" alt="" />
    <div class="bg-tech-veil"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill pill--amber"><span class="dot-amber"></span>02 // 需求證據與雙層次實地驗證架構（絕不造假數據）</span>')}
      <div>
        <h2 class="slide-title">公開實證基礎 × 第一手高齡貓飼主實測驗證計畫</h2>
        <p class="slide-sub">嚴守「未驗證絕不充作成果」原則：整合已查核官方／醫學文獻，並備妥標準化 3 分鐘原型實測協議回收真實回饋</p>
      </div>
      <div style="display:grid; grid-template-columns: 0.96fr 1.04fr; gap: 28px; align-items: stretch;">
        <div class="glass-card glass-card--spruce" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            <span class="badge-done">● TIER 1：已查核公開實證依據</span>
            <div class="card-h" style="font-size:24px;">官方市場趨勢與臨床醫學文獻支撐</div>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
              <div style="background:rgba(8,14,18,0.52); border-radius:12px; padding:14px 16px;">
                <div style="font-weight:700; color:#FFFFFF; font-size:17px;">1. 農業部 2025 全國家犬貓調查（2026/04 公布）</div>
                <p class="card-p" style="font-size:15px; margin-top:4px;">家貓達 <span class="mono" style="color:#46DDA3;font-weight:700;">1,742,033 隻</span>（兩年增 32.8%）、寵物登記率躍升至 <span class="mono" style="color:#46DDA3;font-weight:700;">66.48%</span>，高齡精緻照護進入結構性成長。</p>
              </div>
              <div style="background:rgba(8,14,18,0.52); border-radius:12px; padding:14px 16px;">
                <div style="font-weight:700; color:#FFFFFF; font-size:17px;">2. 蒙特婁大學 FGS 臨床實證（<em>Scientific Reports</em>, 2019）</div>
                <p class="card-p" style="font-size:15px; margin-top:4px;">Evangelista &amp; Steagall 證實 5 項臉部動作單元（總分 0–10，門檻 &ge; 4）可有效量化貓咪急性痛，並具跨觀察者高信度。</p>
              </div>
              <div style="background:rgba(8,14,18,0.52); border-radius:12px; padding:14px 16px;">
                <div style="font-weight:700; color:#FFFFFF; font-size:17px;">3. 既有市場工具缺口盤點</div>
                <p class="card-p" style="font-size:15px; margin-top:4px;">台灣飼主普遍以紙本血檢單＋手機相簿＋LINE 記事本拼湊照護紀錄，缺乏整合疼痛初篩與血檢趨勢之在地中文方案。</p>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card glass-card--amber" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            <span class="badge-plan">◐ TIER 2：第一手飼主訪談與原型實測【M1–M3 規劃執行】</span>
            <div class="card-h" style="font-size:24px;">3 分鐘標準化原型實測與願付定價驗證協議</div>
            <p class="card-p" style="font-size:15.5px; margin-bottom:12px;">以現有可操作 Web 原型邀請 <strong>20–30 位高齡／腎病貓飼主</strong>與 <strong>2–3 位執業獸醫師</strong>實機測評，四大核心驗證指標如下：</p>
            <table class="tech-table" style="font-size:14.5px;">
              <thead>
                <tr>
                  <th style="width:24%;">驗證構面</th>
                  <th style="width:46%;">實機訪談／測試任務設計</th>
                  <th style="width:30%;">預期判定門檻【規劃】</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>痛點強度</strong></td>
                  <td>統計過去 1 年因難判忍痛而猶豫衝急診或跨院整理血檢耗時</td>
                  <td class="mono">&ge; 70% 認同中高痛點</td>
                </tr>
                <tr>
                  <td><strong>操作流暢度</strong></td>
                  <td>實機完成「飲水 +50ml → 48 點快篩 → 血檢雙軌 → 48H 摘要」</td>
                  <td class="mono">&lt; 3 分鐘獨立完成</td>
                </tr>
                <tr>
                  <td><strong>願付價格</strong></td>
                  <td>Van Westendorp 問卷測試 <span class="mono">NT$ 99 / 149 / 199</span> 月費接受度</td>
                  <td class="mono">實測校正 Pro 定價</td>
                </tr>
                <tr>
                  <td><strong>獸醫審查</strong></td>
                  <td>由臨床獸醫師檢視 <span class="mono">/packet/:token</span> 摘要欄位與免責措辭</td>
                  <td class="mono">確認臨床調閱實用性</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="font-size:14.5px; color:#FDE68A; border-top:1px solid rgba(245,158,11,0.28); padding-top:10px;">
            <strong>誠實聲明：</strong>本團隊目前尚未完成大樣本實地問卷回收，故絕不編造假滿意度或假受訪比例；上述驗證結果將於收樣後如實更新。
          </div>
        </div>
      </div>
      ${videoMeta ? '' : footBar('實證紀律：公開數據全數具名查核，第一手訪談與試用成效待實際回收後補充，不以規劃當成果', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function slideDeckHonesty(videoMeta = null, pageLabel = 'PETPULSE AI // SLIDE 07 / 10') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.studioBg}" alt="" />
    <div class="bg-tech-veil"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill"><span class="dot-mint"></span>03 // 雛型實作盤點與 Edge-First 混合雲架構</span>')}
      <div>
        <h2 class="slide-title">透明盤點「已完成程式碼」vs「待驗證規劃」與低成本架構</h2>
        <p class="slide-sub">不以概念冒充成果，現場即可實機開啟操作全端原型，並清楚交代各模組完成邊界</p>
      </div>
      <table class="tech-table" style="font-size:15.8px;">
        <thead>
          <tr>
            <th style="width:19%;">核心模組</th>
            <th style="width:43%;">已完成可實際操作項目（已實作雛型）</th>
            <th style="width:38%;">尚未完成／目前以模擬呈現（下階段規劃）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>前端行動介面與互動</strong></td>
            <td class="hi"><span class="badge-done">● 已實作</span><br/>10 條前後台路由、320–1440px 響應式、多寵切換、飲水／食慾／布里斯托／輸液打卡與 Web Audio 觸覺提示音。</td>
            <td><span class="badge-plan">◐ 規劃中</span><br/>LINE LIFF 正式上架與官方帳號排程推播待正式環境部署。</td>
          </tr>
          <tr>
            <td><strong>48 點幾何與 AI 視覺</strong></td>
            <td class="hi"><span class="badge-done">● 已實作</span><br/>無尺度幾何數學引擎（EAR／θ_ear／R_muzzle）、五色互動標註畫布、WebRTC 相機與 EXIF 轉正、CSV／YOLO-Pose 匯出。</td>
            <td><span class="badge-plan">◐ 規劃／模擬</span><br/><strong>正式量產 .onnx 權重尚未完成大樣本訓練與臨床準確率驗證</strong>；現以預設點位＋手動微調展示完整運算。</td>
          </tr>
          <tr>
            <td><strong>血檢 OCR 與看診摘要</strong></td>
            <td class="hi"><span class="badge-done">● 已實作</span><br/>原圖並排人工覆核表單、CREA×飲水雙軌圖，以及實際可開啟之 48 小時唯讀頁（<span class="mono">/packet/:shareToken</span>）。</td>
            <td><span class="badge-plan">◐ 規劃中</span><br/>外部商用 Vision LLM 自動辨識 API 金鑰與跨院單據準確率實測待串接。</td>
          </tr>
          <tr>
            <td><strong>雲端後端與 Phase 2</strong></td>
            <td class="hi"><span class="badge-done">● 框架完成</span><br/>已撰寫 PostgreSQL 遷移腳本（<span class="mono">0001_init.sql</span>）、Cloudflare Worker 閘道框架與保姆／醫院端互動介面原型。</td>
            <td><span class="badge-plan">◐ Phase 2</span><br/>正式雲端壓測、醫院 B2B 簽約、醫療保姆招募與責任險皆列為遠期規劃。</td>
          </tr>
        </tbody>
      </table>
      <div>${SVG_ARCH_STRIP}</div>
      ${videoMeta ? '' : footBar('原始碼與實機原型皆可現場展示操作 ‧ Edge-First 運算結合 R2 零輸出費打造精實雲端結構', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function slideDeckCompetitive(videoMeta = null, pageLabel = 'PETPULSE AI // SLIDE 08 / 10') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.studioBg}" alt="" />
    <div class="bg-tech-veil"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill"><span class="dot-mint"></span>04 // 創新差異與現有競品比較矩陣</span>')}
      <div>
        <h2 class="slide-title">從「單次測痛」走向「個體基線 × 跨院腎病三軌閉環」</h2>
        <p class="slide-sub">直擊現有海外工具與紙本紀錄在品種誤判、血檢分散與台灣診間協作上的結構斷口</p>
      </div>
      <table class="tech-table" style="font-size:16.5px;">
        <thead>
          <tr>
            <th style="width:17%;">比較構面</th>
            <th style="width:29%;">PetPulse AI（本提案）</th>
            <th style="width:18%;">Tably / Sylvester.ai</th>
            <th style="width:18%;">11pets / 一般紀錄 App</th>
            <th style="width:18%;">紙本 / LINE 相簿</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>疼痛判讀與可解釋性</strong></td>
            <td class="hi">48 點無尺度幾何比值（EAR / θ_ear）＋「自家貓 0 分健康基線」偏移量比對</td>
            <td>黑箱單次表情判讀，缺乏自家個體 0 分基準對照</td>
            <td>無貓臉疼痛初篩能力</td>
            <td>飼主憑記憶與主觀感受判斷</td>
          </tr>
          <tr>
            <td><strong>跨院血檢與趨勢關聯</strong></td>
            <td class="hi">「原圖並排人工覆核」防小數點誤讀；CREA 安全帶 × 每日飲水雙軌疊圖</td>
            <td>未提供血檢管理與飲水追蹤整合</td>
            <td>僅靜態手動登錄，缺乏紙本覆核與雙軌視覺關聯</td>
            <td>檢驗單據四散、難以比對 3 個月波動</td>
          </tr>
          <tr>
            <td><strong>獸醫診間協作效率</strong></td>
            <td class="hi">一鍵生成 48 小時免登入唯讀看診摘要包（含最新血檢、飲水與表情紀錄）</td>
            <td>僅能出示單張截圖，無連續照護脈絡</td>
            <td>輸出制式報表，獸醫仍需翻頁查找</td>
            <td>現場滑手機翻找相簿，耗時易漏講</td>
          </tr>
          <tr>
            <td><strong>台灣在地化與合規邊界</strong></td>
            <td class="hi">繁中 LINE 輕量架構規劃、嚴守《獸醫師法》非診斷分流與就醫前紅旗提醒</td>
            <td>英文介面為主，未針對台灣院所單據與法規設計</td>
            <td>通用多物種介面，缺乏高齡腎病貓專科流程</td>
            <td>零系統防呆與警訊提醒</td>
          </tr>
        </tbody>
      </table>
      <div style="display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 20px;">
        <div class="glass-card glass-card--spruce" style="padding:20px 24px;">
          <div class="mono" style="font-size:14px; color:#46DDA3; margin-bottom:4px;">MOAT 01 // EXPLAINABLE GEOMETRY</div>
          <div class="card-h" style="font-size:21px; margin-bottom:4px;">透明幾何＋個體 0 分基線</div>
          <p class="card-p" style="font-size:15.5px;">相較黑箱分類模型，飼主與獸醫皆可直觀看見 48 點座標偏移原因，大幅提升臨床信任。</p>
        </div>
        <div class="glass-card" style="padding:20px 24px;">
          <div class="mono" style="font-size:14px; color:#38BDF8; margin-bottom:4px;">MOAT 02 // CLINICAL STICKINESS</div>
          <div class="card-h" style="font-size:21px; margin-bottom:4px;">居家 × 血檢 × 診間三軌閉環</div>
          <p class="card-p" style="font-size:15.5px;">切入高頻高黏性的高齡腎病長期照護，把「工具」升級為跨院看診必備的健康護照。</p>
        </div>
        <div class="glass-card" style="padding:20px 24px;">
          <div class="mono" style="font-size:14px; color:#FDE68A; margin-bottom:4px;">MOAT 03 // LOW UNIT COST</div>
          <div class="card-h" style="font-size:21px; margin-bottom:4px;">Edge-First 零流量費架構</div>
          <p class="card-p" style="font-size:15.5px;">影像初篩留於用戶裝置運算並結合 R2 零輸出費儲存，兼顧隱私保護與極低變動成本。</p>
        </div>
      </div>
      ${videoMeta ? '' : footBar('競品分析基於公開產品功能盤點 ‧ 正式量產準確率與臨床滿意度將於下階段實測驗證', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function slideDeckBusiness(videoMeta = null, pageLabel = 'PETPULSE AI // SLIDE 09 / 10') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.studioBg}" alt="" />
    <div class="bg-tech-veil"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill pill--amber"><span class="dot-amber"></span>05 // 商業模式、定價策略與單位經濟【全項為規劃假設】</span>')}
      <div>
        <h2 class="slide-title">精實 B2C 訂閱商業模式與單位經濟試算【規劃假設】</h2>
        <p class="slide-sub">明確交代「誰願意付費、收費多少、主要成本與兩平門檻」，全項透明標示為待驗證財務假設模型</p>
      </div>
      <div style="display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px;">
        <div class="glass-card glass-card--spruce" style="padding:18px 20px;">
          <div class="mono" style="font-size:13.5px; color:#46DDA3;">付費目標客群</div>
          <div class="kpi-val mono" style="font-size:32px; margin-top:6px;">高齡／腎病貓</div>
          <div class="kpi-lbl" style="font-size:14.5px;">月醫療耗材常達 NT$ 3,000–8,000，訂閱佔比僅 2%–5%</div>
        </div>
        <div class="glass-card" style="padding:18px 20px;">
          <div class="mono" style="font-size:13.5px; color:#FDE68A;">PRO 訂閱定價【假設】</div>
          <div class="kpi-val mono" style="font-size:36px; color:#FDE68A; margin-top:6px;">NT$ 149<span style="font-size:17px;">/月</span></div>
          <div class="kpi-lbl" style="font-size:14.5px;">年繳 NT$ 1,490（約 NT$ 124/月）；基礎打卡維持免費</div>
        </div>
        <div class="glass-card" style="padding:18px 20px;">
          <div class="mono" style="font-size:13.5px; color:#38BDF8;">單戶變動成本【假設】</div>
          <div class="kpi-val mono" style="font-size:36px; color:#38BDF8; margin-top:6px;">~NT$ 22<span style="font-size:17px;">/月</span></div>
          <div class="kpi-lbl" style="font-size:14.5px;">Edge 推論免 GPU 月費＋R2 零流量費＋血檢 OCR 配額</div>
        </div>
        <div class="glass-card glass-card--amber" style="padding:18px 20px;">
          <div class="mono" style="font-size:13.5px; color:#FDE68A;">初期兩平推估【假設】</div>
          <div class="kpi-val mono" style="font-size:36px; color:#FFFFFF; margin-top:6px;">382 戶</div>
          <div class="kpi-lbl" style="font-size:14.5px;">以初期月開支 NT$ 45,000、單戶貢獻 NT$ 118 試算</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1.04fr 0.96fr; gap: 24px; align-items: stretch;">
        <div class="glass-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            ${SVG_UNIT_ECONOMICS}
          </div>
          <table class="tech-table" style="font-size:14.8px;">
            <thead>
              <tr>
                <th style="width:26%;">試營運規模假設</th>
                <th style="width:24%;">月訂閱總營收</th>
                <th style="width:25%;">月邊際貢獻總額</th>
                <th style="width:25%;">淨現金流【假設】</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="mono">200 付費戶</td>
                <td class="mono">NT$ 29,800</td>
                <td class="mono">NT$ 23,600</td>
                <td class="mono" style="color:#FDE68A;">-NT$ 21,400</td>
              </tr>
              <tr>
                <td class="hi mono">382 付費戶（兩平）</td>
                <td class="hi mono">NT$ 56,918</td>
                <td class="hi mono">NT$ 45,076</td>
                <td class="hi mono" style="color:#46DDA3;">~NT$ 0（兩平）</td>
              </tr>
              <tr>
                <td class="mono">600 付費戶</td>
                <td class="mono">NT$ 89,400</td>
                <td class="mono">NT$ 70,800</td>
                <td class="mono" style="color:#46DDA3;">+NT$ 25,800</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="glass-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
          <div>
            <div class="mono" style="font-size:13.5px; color:#46DDA3; margin-bottom:5px;">TIERING &amp; COST DISCIPLINE 【規劃假設】</div>
            <div class="card-h" style="font-size:21px;">分級方案設計與成本控管機制</div>
            <ul style="font-size:15.5px; line-height:1.64; color:#D4E0E3; padding-left:20px; margin-top:8px;">
              <li><strong>Free 基礎版（NT$ 0）</strong>：每日飲水／食慾／排泄打卡與單貓建檔，以高頻工具自然導流。</li>
              <li><strong>PetPulse Pro（NT$ 149/月）</strong>：解鎖不限次 48 點快篩、0 分健康基線、無限血檢 OCR 覆核雙軌圖與 48H 獸醫摘要包。</li>
              <li><strong>Phase 2 延伸營收（遠期規劃）</strong>：待 Phase 1 單位經濟驗證後，再評估醫院端預審 SaaS（NT$ 1,500–2,500/院/月）與認證保姆媒合。</li>
              <li><strong>初期固定支出假設（NT$ 45,000/月，不含全職薪資）</strong>：雲端基礎設施、網域資安、社群口碑推廣與基礎法務顧問。</li>
            </ul>
          </div>
          <div style="background:rgba(180,83,9,0.24); border:1px solid rgba(245,158,11,0.44); border-radius:12px; padding:11px 15px; font-size:14px; color:#FDE68A;">
            <strong>財務假設揭露：</strong>本頁所有定價、轉換率、成本與兩平戶數均為【規劃試算模型】，非已實現財務績效。
          </div>
        </div>
      </div>
      ${videoMeta ? '' : footBar('全頁定價、成本拆解與損益敏感度均為【規劃／假設模型】，將於 M1–M3 飼主問卷與封測後依實測校正', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function slideDeckRoadmapClosing(videoMeta = null, pageLabel = 'PETPULSE AI // SLIDE 10 / 10') {
  return `
  <section class="slide">
    <img class="bg-img" src="${media.catHero}" style="object-position: 62% center;" alt="" />
    <div class="bg-vignette"></div>
    <div class="tech-grid"></div>
    <div class="stage ${videoMeta ? 'stage--video' : ''}">
      ${topBar('<span class="pill"><span class="dot-mint"></span>落地路線圖 ‧ 法規合規 ‧ 風險控管</span>')}
      <div style="display:grid; grid-template-columns: 1.15fr 0.85fr; gap: 40px; align-items: center;">
        <div style="display:flex; flex-direction:column; gap: 18px;">
          <h2 class="slide-title" style="font-size:48px;">務實三階段落地藍圖【規劃】</h2>
          <div style="display:flex; flex-direction:column; gap: 14px;">
            <div class="glass-card glass-card--spruce" style="padding:18px 24px;">
              <div class="mono" style="font-size:14.5px; color:#46DDA3;">M1 – M3 // 需求實證與臨床對齊</div>
              <div class="card-p" style="color:#FFFFFF; font-size:16.5px; margin-top:4px;">完成 20–30 位高齡腎病貓飼主訪談與原型實測、驗證 NT$ 149/月願付意願，並由 2–3 位獸醫師審查看診摘要欄位。</div>
            </div>
            <div class="glass-card" style="padding:18px 24px;">
              <div class="mono" style="font-size:14.5px; color:#38BDF8;">M4 – M6 // 輕量 ONNX 模型與百人封測</div>
              <div class="card-p" style="color:#FFFFFF; font-size:16.5px; margin-top:4px;">以授權資料集與標註工作台訓練首版輕量 48 點權重，串接商用血檢 OCR 與雲端儲存，展開 100 名目標飼主封測。</div>
            </div>
            <div class="glass-card" style="padding:18px 24px;">
              <div class="mono" style="font-size:14.5px; color:#FDE68A;">M7 – M12 // LINE 上線與全齡犬貓微服務擴展</div>
              <div class="card-p" style="color:#FFFFFF; font-size:16.5px; margin-top:4px;">上架 LINE LIFF 驗證訂閱留存；達標後擴展至全齡犬貓疼痛視覺篩檢、合作動物醫院 CRM 與認證到府保姆健康生態微服務。</div>
            </div>
          </div>
          <div class="glass-card" style="padding:16px 22px; border-color:rgba(245,158,11,0.44);">
            <div style="font-size:15.5px; color:#E4ECEE; line-height:1.55;">
              <strong style="color:#FDE68A;">合規與安全底線：</strong>全站嚴守《獸醫師法》僅供健康數據紀錄與就醫分流參考（非醫療診斷）；血檢強制人工覆核杜絕小數點誤讀；低信心度自動提示重拍不延誤就醫。
            </div>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; justify-content:flex-end; height:100%; padding-bottom: 14px;">
          <div class="glass-card glass-card--spruce" style="width:100%; text-align:left; padding: 26px 28px;">
            <div class="mono" style="font-size:14px; color:#46DDA3; margin-bottom:8px;">PETPULSE AI // THANK YOU</div>
            <div style="font-size:31px; font-weight:700; color:#FFFFFF; line-height:1.3;">用溫潤精準科技<br/>守護全齡犬貓與高齡毛孩關鍵時刻</div>
            <p style="font-size:15.5px; color:#CBE0D9; margin-top:12px;">全齡犬貓疼痛視覺初篩與健康生態微服務 ‧ 歡迎現場實機體驗</p>
          </div>
        </div>
      </div>
      ${videoMeta ? '' : footBar('PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務 ‧ C★STAR 提案簡報（已移除校系班級與個人可識別資訊）', pageLabel)}
    </div>
    ${videoOverlay(videoMeta)}
  </section>`;
}

function wrapDoc(bodyHtml, isPrintDeck = false) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<title>PetPulse AI —— 全齡犬貓疼痛視覺初篩與健康生態微服務｜C★STAR 提案素材</title>
<style>
  ${isPrintDeck ? '@page { size: 1920px 1080px; margin: 0; }' : ''}
  ${SHARED_CSS}
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_EXE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    // 1. Render 5 Flagship 1920x1080 PNG Showcase Images for zanzan.io/cstar/submission
    const gallerySlides = [
      { file: '01_Cover_Hero_16x9.png', html: slide01Cover() },
      { file: '02_Core_Tech_FGS48_16x9.png', html: slide02CoreTech() },
      { file: '03_Kidney_Trends_OCR_16x9.png', html: slide03KidneyLoop() },
      { file: '04_Product_Ecosystem_16x9.png', html: slide04Ecosystem() },
      { file: '05_Business_Advantage_16x9.png', html: slide05BusinessDiff() },
    ];

    for (const item of gallerySlides) {
      await page.setContent(wrapDoc(item.html, false), { waitUntil: 'load' });
      const outPath = path.join(OUT_IMAGES, item.file);
      await page.screenshot({ path: outPath, type: 'png' });
      const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
      console.log(`Rendered gallery PNG: ${item.file} (${sizeKB} KB)`);
    }

    // 2. Render 8 Punchy Cinematic Video Frames (1920x1080) with Progress Bar + Chapter Tag + Clean Subtitles
    const videoScenes = [
      {
        file: 'v01.png',
        html: slide01Cover({
          chapter: '01 / 08',
          pct: 12.5,
          caption: 'PetPulse AI｜全齡犬貓疼痛視覺初篩與健康生態微服務 — 首站切入高齡腎病貓居家照護',
        }),
      },
      {
        file: 'v02.png',
        html: slideDeckProblem({
          chapter: '02 / 08',
          pct: 25.0,
          caption: '台灣家貓達 174.2 萬隻首超家犬｜直擊「夜間忍痛難辨」與「跨院血檢斷鏈」兩大核心痛點',
        }),
      },
      {
        file: 'v03.png',
        html: slide02CoreTech({
          chapter: '03 / 08',
          pct: 37.5,
          caption: '基於蒙特婁大學 FGS 量表｜48 點無尺度幾何公式＋自家貓 0 分基線＋標註微調後台皆已實作',
        }),
      },
      {
        file: 'v04.png',
        html: slide03KidneyLoop({
          chapter: '04 / 08',
          pct: 50.0,
          caption: '四步驟實機閉環：3 秒飲水打卡 → 血檢雙軌覆核 → AI 分流 → 48 小時免登入獸醫看診摘要包',
        }),
      },
      {
        file: 'v05.png',
        html: slideDeckHonesty({
          chapter: '05 / 08',
          pct: 62.5,
          caption: '全端 10 條路由可實機操作｜透明區隔已實作雛型與下階段規劃，Edge-First 壓低雲端成本',
        }),
      },
      {
        file: 'v06.png',
        html: slideDeckCompetitive({
          chapter: '06 / 08',
          pct: 75.0,
          caption: '超越單次黑箱測痛 App｜以個體基線、跨院血檢雙軌與在地合規打造鮮明產品護城河',
        }),
      },
      {
        file: 'v07.png',
        html: slideDeckBusiness({
          chapter: '07 / 08',
          pct: 87.5,
          caption: 'PetPulse Pro 訂閱假設（NT$ 149/月、邊際貢獻 79%）｜聚焦腎病剛需並推進全齡生態微服務',
        }),
      },
      {
        file: 'v08.png',
        html: slideDeckRoadmapClosing({
          chapter: '08 / 08',
          pct: 100.0,
          caption: '嚴守《獸醫師法》非醫療診斷分流定位｜PetPulse AI，用溫潤科技守護毛孩每一次關鍵時刻',
        }),
      },
    ];

    for (const scene of videoScenes) {
      await page.setContent(wrapDoc(scene.html, false), { waitUntil: 'load' });
      await page.screenshot({ path: path.join(OUT_VIDEO_FRAMES, scene.file), type: 'png' });
    }
    console.log('Rendered 8 keynote video storyboard frames at 1920x1080.');

    // 3. Build 10-Slide 16:9 Unified Tech-Product Presentation PDF (< 10 MB guaranteed for zanzan.io)
    const deckSlides = [
      slide01Cover(null, 'PETPULSE AI // SLIDE 01 / 10'),
      slideDeckProblem(null, 'PETPULSE AI // SLIDE 02 / 10'),
      slideDeckEvidence(null, 'PETPULSE AI // SLIDE 03 / 10'),
      slide02CoreTech(null, 'PETPULSE AI // SLIDE 04 / 10'),
      slide03KidneyLoop(null, 'PETPULSE AI // SLIDE 05 / 10'),
      slide04Ecosystem(null, 'PETPULSE AI // SLIDE 06 / 10'),
      slideDeckHonesty(null, 'PETPULSE AI // SLIDE 07 / 10'),
      slideDeckCompetitive(null, 'PETPULSE AI // SLIDE 08 / 10'),
      slideDeckBusiness(null, 'PETPULSE AI // SLIDE 09 / 10'),
      slideDeckRoadmapClosing(null, 'PETPULSE AI // SLIDE 10 / 10'),
    ];
    const fullDeckHtml = wrapDoc(deckSlides.join('\n'), true);

    fs.writeFileSync(DECK_HTML, fullDeckHtml, 'utf8');
    await page.setContent(fullDeckHtml, { waitUntil: 'load' });
    await page.pdf({
      path: DECK_PDF,
      width: '1920px',
      height: '1080px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    let pdfSize = fs.statSync(DECK_PDF).size;
    console.log(`Initial vector 16:9 PDF size: ${(pdfSize / (1024 * 1024)).toFixed(2)} MB`);

    // Guarantee strictly < 9.0 MB (zanzan.io cap is 10 MB)
    if (pdfSize > 9.0 * 1024 * 1024) {
      console.log('Vector PDF exceeded 9.0 MB; optimizing to crisp high-DPI JPEG-backed 16:9 PDF...');
      const jpgPages = [];
      for (const slideHtml of deckSlides) {
        await page.setContent(wrapDoc(slideHtml, false), { waitUntil: 'load' });
        const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
        jpgPages.push(`<section class="slide"><img src="data:image/jpeg;base64,${buf.toString('base64')}" style="width:1920px;height:1080px;display:block;" /></section>`);
      }
      await page.setContent(wrapDoc(jpgPages.join('\n'), true), { waitUntil: 'load' });
      await page.pdf({
        path: DECK_PDF,
        width: '1920px',
        height: '1080px',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      pdfSize = fs.statSync(DECK_PDF).size;
    }
    const pdfMB = (pdfSize / (1024 * 1024)).toFixed(2);
    console.log(`Final 10-Slide 16:9 Presentation PDF: ${DECK_PDF} (${pdfMB} MB)`);
  } finally {
    await browser.close();
  }

  // 4. Assemble 8-Scene 60.0s Keynote-Grade 1080p 30fps YouTube MP4 with alternating camera motion + evolving 4-chord ambient synth soundtrack
  // Math check: 8 scenes * 7.9375s (238 frames = 7.9333s) - 7 crossfades * 0.5s = 59.9667s (~60.0s exact!)
  // Let's use exact integer frame math: 240 frames (8.00s) * 8 = 64.00s, minus 7 * 0.5714s? Even cleaner:
  // 237 frames (7.90s) * 8 = 63.20s, minus 7 * 0.50s = 59.70s; or Scene 1..7 = 237 frames (7.90s), Scene 8 = 246 frames (8.20s) -> total = 7*7.9 + 8.2 - 7*0.5 = 60.00s EXACT!
  const f = (n) => path.join(OUT_VIDEO_FRAMES, `v0${n}.png`);

  // Varied subtle cinema motions (never clipping captions, max zoom 1.026):
  const motionZoomIn = (frames) =>
    `scale=2048:1152,zoompan=z='min(zoom+0.00010,1.024)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,setpts=PTS-STARTPTS,format=yuv420p`;
  const motionZoomOut = (frames) =>
    `scale=2048:1152,zoompan=z='max(1.024-on*0.00010,1.000)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,setpts=PTS-STARTPTS,format=yuv420p`;
  const motionPanRight = (frames) =>
    `scale=2048:1152,zoompan=z='1.022':x='(iw-iw/zoom)*0.32 + (iw-iw/zoom)*0.36*(on/${frames})':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,setpts=PTS-STARTPTS,format=yuv420p`;
  const motionPanLeft = (frames) =>
    `scale=2048:1152,zoompan=z='1.022':x='(iw-iw/zoom)*0.68 - (iw-iw/zoom)*0.36*(on/${frames})':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,setpts=PTS-STARTPTS,format=yuv420p`;

  // Evolving warm 4-chord ambient MedTech keynote progression (Cmaj7 -> G6 -> Am7 -> Fmaj7, 4s per chord = 16s loop):
  // Left & Right stereo channels with subtle warmth detune + gentle LFO breathing + soft bell shimmer
  const chordProg = (detune) => [
    // Chord 1 (0..4s): C3(130.81), G3(196.00), B3(246.94), E4(329.63)
    `between(mod(t,16),0,4)*(0.055*sin(2*PI*${(130.81 * detune).toFixed(2)}*t)+0.036*sin(2*PI*196.00*t)+0.024*sin(2*PI*246.94*t)+0.018*sin(2*PI*329.63*t))`,
    // Chord 2 (4..8s): G2(98.00), D3(146.83), B3(246.94), E4(329.63)
    `between(mod(t,16),4,8)*(0.055*sin(2*PI*${(98.00 * detune).toFixed(2)}*t)+0.036*sin(2*PI*146.83*t)+0.024*sin(2*PI*246.94*t)+0.018*sin(2*PI*329.63*t))`,
    // Chord 3 (8..12s): A2(110.00), E3(164.81), C4(261.63), G4(392.00)
    `between(mod(t,16),8,12)*(0.055*sin(2*PI*${(110.00 * detune).toFixed(2)}*t)+0.036*sin(2*PI*164.81*t)+0.024*sin(2*PI*261.63*t)+0.016*sin(2*PI*392.00*t))`,
    // Chord 4 (12..16s): F2(87.31), C3(130.81), A3(220.00), E4(329.63)
    `between(mod(t,16),12,16)*(0.055*sin(2*PI*${(87.31 * detune).toFixed(2)}*t)+0.036*sin(2*PI*130.81*t)+0.024*sin(2*PI*220.00*t)+0.018*sin(2*PI*329.63*t))`,
  ].join('+');

  // Smooth envelope at each 4-second chord boundary (sin(PI*mod(t,4)/4)^0.35 softens every chord attack/release smoothly with zero clicks!)
  const leftExpr = `(${chordProg(1.0)})*pow(sin(PI*mod(t,4)/4),0.32)*(0.82+0.18*sin(2*PI*0.22*t))`;
  const rightExpr = `(${chordProg(1.003)})*pow(sin(PI*mod(t,4)/4),0.32)*(0.82+0.18*cos(2*PI*0.22*t))`;

  // Exact xfade offsets: each of scenes 0..6 is 7.90s (237f), overlap 0.50s -> step = 7.40s
  // Offsets: 7.4, 14.8, 22.2, 29.6, 37.0, 44.4, 51.8; Scene 7 = 8.20s (246f) -> ends at 51.8 + 8.2 = 60.00s EXACT!
  const filterComplex = [
    `[0:v]${motionZoomIn(237)}[s0]`,
    `[1:v]${motionPanRight(237)}[s1]`,
    `[2:v]${motionZoomIn(237)}[s2]`,
    `[3:v]${motionPanLeft(237)}[s3]`,
    `[4:v]${motionZoomOut(237)}[s4]`,
    `[5:v]${motionPanRight(237)}[s5]`,
    `[6:v]${motionZoomOut(237)}[s6]`,
    `[7:v]${motionZoomIn(246)}[s7]`,
    `[s0][s1]xfade=transition=fade:duration=0.5:offset=7.4[x1]`,
    `[x1][s2]xfade=transition=fade:duration=0.5:offset=14.8[x2]`,
    `[x2][s3]xfade=transition=fade:duration=0.5:offset=22.2[x3]`,
    `[x3][s4]xfade=transition=fade:duration=0.5:offset=29.6[x4]`,
    `[x4][s5]xfade=transition=fade:duration=0.5:offset=37.0[x5]`,
    `[x5][s6]xfade=transition=fade:duration=0.5:offset=44.4[x6]`,
    `[x6][s7]xfade=transition=fade:duration=0.5:offset=51.8,fade=t=in:st=0:d=0.6,fade=t=out:st=58.6:d=1.4[vout]`,
    `aevalsrc='${leftExpr}|${rightExpr}':s=44100:d=60,lowpass=f=920,aecho=0.8:0.75:140:0.22,afade=t=in:st=0:d=2.2,afade=t=out:st=56.8:d=3.2[aout]`,
  ].join(';');

  execFileSync(
    FFMPEG_EXE,
    [
      '-y',
      '-i', f(1),
      '-i', f(2),
      '-i', f(3),
      '-i', f(4),
      '-i', f(5),
      '-i', f(6),
      '-i', f(7),
      '-i', f(8),
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '19',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      '-t', '60',
      OUT_VIDEO,
    ],
    { stdio: 'inherit' }
  );

  fs.rmSync(OUT_VIDEO_FRAMES, { recursive: true, force: true });
  const mp4MB = (fs.statSync(OUT_VIDEO).size / (1024 * 1024)).toFixed(2);
  console.log(`Rendered 8-Scene 60s YouTube 1080p MP4: ${OUT_VIDEO} (${mp4MB} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
