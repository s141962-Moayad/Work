// Dev helper: screenshots pages (mobile + desktop) for visual review.  usage: node scripts/shots.mjs outDir /path1 /path2 …
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const [out, ...paths] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [label, vp] of [["m", { width: 390, height: 844 }], ["d", { width: 1280, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport: vp, locale: "ar-OM", deviceScaleFactor: label === "m" ? 2 : 1 });
  if (process.env.COOKIE) await ctx.addCookies([{ name: "shq_session", value: process.env.COOKIE, url: base }]);
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(400);
    const name = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";
    await page.screenshot({ path: `${out}/${label}-${name}.png`, fullPage: process.env.FULL === "1" });
  }
  await ctx.close();
}
await browser.close();
