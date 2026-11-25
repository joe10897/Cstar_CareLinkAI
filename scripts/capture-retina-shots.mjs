import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve('d:/Github/Cstar_CareLinkAI');
const OUT_DIR = path.join(ROOT, '.hallmark', 'retina_shots');
const EDGE_EXE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 4177;
const BASE_URL = `http://127.0.0.1:${PORT}`;

fs.mkdirSync(OUT_DIR, { recursive: true });

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const usePreview = fs.existsSync(path.join(ROOT, 'dist', 'index.html'));
  const args = usePreview
    ? [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort']
    : [viteBin, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'];

  const server = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: 'pipe',
  });

  try {
    await waitForServer(BASE_URL);
    console.log(`Server ready at ${BASE_URL} (${usePreview ? 'preview' : 'dev'})`);

    const browser = await puppeteer.launch({
      executablePath: EDGE_EXE,
      headless: 'new',
      args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
    });

    try {
      // 1. Mobile Retina @2x Viewport-Exact Shots (390x844 — clean iPhone aspect, bottom nav flush!)
      const mPage = await browser.newPage();
      await mPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

      const mobileRoutes = [
        { route: '/app/home', file: 'mobile-home-2x.png' },
        { route: '/app/fgs-scan', file: 'mobile-fgs-2x.png' },
        { route: '/app/trends', file: 'mobile-trends-2x.png' },
        { route: '/app/chat', file: 'mobile-chat-2x.png' },
        { route: '/sitter/portal', file: 'mobile-sitter-2x.png' },
        { route: '/packet/demo', file: 'mobile-packet-2x.png' },
      ];

      for (const item of mobileRoutes) {
        await mPage.goto(`${BASE_URL}${item.route}`, { waitUntil: 'networkidle0' });
        await new Promise((r) => setTimeout(r, 450));
        // Hide noisy top dev switcher strip if present only on consumer mobile shots? No — check actual layout first, preserve real app fidelity!
        await mPage.screenshot({
          path: path.join(OUT_DIR, item.file),
          fullPage: false,
        });
        console.log(`Captured ${item.file}`);
      }
      await mPage.close();

      // 2. Desktop Retina @2x Viewport-Exact Shots (1440x860 — crisp MacBook aspect)
      const dPage = await browser.newPage();
      await dPage.setViewport({ width: 1440, height: 860, deviceScaleFactor: 2 });

      // Admin FGS Dataset — scroll smoothly so the 48-point cat annotation canvas + real-time geometry panel are centered!
      await dPage.goto(`${BASE_URL}/admin/fgs-dataset`, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 500));
      await dPage.evaluate(() => {
        const heading = Array.from(document.querySelectorAll('h2, h3, .section-header')).find((el) =>
          el.textContent?.includes('48 點互動式標註畫布')
        );
        if (heading) {
          const rect = heading.getBoundingClientRect();
          window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - 96), behavior: 'instant' });
        } else {
          window.scrollTo(0, 180);
        }
      });
      await new Promise((r) => setTimeout(r, 250));
      await dPage.screenshot({
        path: path.join(OUT_DIR, 'desktop-admin-fgs-2x.png'),
        fullPage: false,
      });
      console.log('Captured desktop-admin-fgs-2x.png');

      // Admin Clinic CRM — capture clean top clinical dashboard
      await dPage.goto(`${BASE_URL}/admin/clinic-crm`, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 500));
      await dPage.evaluate(() => window.scrollTo(0, 56));
      await new Promise((r) => setTimeout(r, 200));
      await dPage.screenshot({
        path: path.join(OUT_DIR, 'desktop-admin-crm-2x.png'),
        fullPage: false,
      });
      console.log('Captured desktop-admin-crm-2x.png');

      // Vet 48H Read-Only Packet — desktop view
      await dPage.goto(`${BASE_URL}/packet/demo`, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 500));
      await dPage.evaluate(() => window.scrollTo(0, 48));
      await new Promise((r) => setTimeout(r, 200));
      await dPage.screenshot({
        path: path.join(OUT_DIR, 'desktop-packet-2x.png'),
        fullPage: false,
      });
      console.log('Captured desktop-packet-2x.png');

      await dPage.close();
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
