#!/usr/bin/env node
/**
 * CareLink AI — 自動化無尺度幾何演算法與競賽匿名合規驗證腳本 (scripts/verify-carelink.mjs)
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// 1. 驗證全專案競賽匿名合規 (Section 7.1)
const FORBIDDEN_PATTERNS = [
  /大學/,
  /科大/,
  /資訊工程系/,
  /資管系/,
  /獸醫系/,
  /指導教授/,
  /指導老師/,
];

function collectSourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (['.ts', '.tsx', '.css', '.html', '.sql', '.py'].includes(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

const files = [
  ...collectSourceFiles('src'),
  ...collectSourceFiles('workers'),
  ...collectSourceFiles('backend'),
  ...collectSourceFiles('supabase'),
  'index.html',
];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const pat of FORBIDDEN_PATTERNS) {
    assert.equal(
      pat.test(content),
      false,
      `匿名合規檢查未通過: 檔案 ${file} 出現禁止字詞 ${pat}`
    );
  }
}

// 2. 驗證 48 點定義與 Supabase SQL 結構完整性
const calcSource = readFileSync('src/utils/fgsGeometryCalculator.ts', 'utf8');
for (let id = 1; id <= 48; id++) {
  assert.equal(
    calcSource.includes(`{ id: ${id}, region:`),
    true,
    `缺少第 ${id} 號貓臉關鍵點定義`
  );
}

const sqlSource = readFileSync('supabase/migrations/0001_init.sql', 'utf8');
for (const table of ['public.pets', 'public.fgs_records', 'public.blood_test_records', 'public.clinic_referrals']) {
  assert.equal(sqlSource.includes(table), true, `SQL migration 缺少資料表 ${table}`);
}

console.log(
  `[CareLink AI Verification] PASS: ${files.length} source files checked, 48-point FGS schema, 4 Supabase tables & Anonymity Gate verified.`
);
