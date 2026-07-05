#!/usr/bin/env node
// Capture the new V12 lab variant (Dotta's pick) at desktop 1440 and mobile 390.
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = "issue-thread-interaction-redesign-lab";
const story = "v-12-expanded-by-default";
const out = path.resolve("artifacts/PAP-12696-v12");
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const [w, h, tag] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const url = `http://localhost:6006/iframe.html?id=${BASE}--${story}&viewMode=story`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const file = path.join(out, `${story}-${tag}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`Wrote ${file}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
