#!/usr/bin/env node
// Capture all 10 redesign-lab variants at desktop 1440 and mobile 390 in one browser.
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = "issue-thread-interaction-redesign-lab";
const variants = [
  "v-01-compact-card",
  "v-02-borderless-inline",
  "v-03-collapsed-by-default",
  "v-04-chat-native",
  "v-05-trimmed-footer-bar",
  "v-06-dense-two-column",
  "v-07-chip-answers",
  "v-08-banner-disclosure",
  "v-09-split-surface",
  "v-10-minimal-monochrome",
];
const out = path.resolve("artifacts/PAP-12696-review");
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const [w, h, tag] of [[1440, 900, "1440"], [390, 844, "390"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    for (const v of variants) {
      const url = `http://localhost:6006/iframe.html?id=${BASE}--${v}&viewMode=story`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      const file = path.join(out, `${v}-${tag}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`Wrote ${file}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
