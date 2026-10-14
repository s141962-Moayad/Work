// Renders the SHAQLAH brand mark to PNG icons (uses the Chromium that Playwright ships).
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = readFileSync(join(root, "node_modules/@fontsource-variable/cairo/files/cairo-arabic-wght-normal.woff2")).toString("base64");
mkdirSync(join(root, "public/icons"), { recursive: true });

const html = (size, maskable) => `<!doctype html><style>
@font-face{font-family:C;src:url(data:font/woff2;base64,${font});font-weight:200 1000}
html,body{margin:0}
.b{width:${size}px;height:${size}px;background:#151515;position:relative;overflow:hidden;${maskable ? "" : `border-radius:${size * 0.22}px;`}}
.d{position:absolute;border-radius:99px;background:#D9A441;width:${size * 0.3}px;height:${size * 0.045}px;bottom:${size * (maskable ? 0.15 : 0.085)}px;left:50%;transform:translateX(-50%)}
.t{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 ${size * (maskable ? 0.52 : 0.66)}px/1 C;color:#FF6B00;padding-bottom:${size * 0.06}px}
</style><div class="b"><div class="d"></div><div class="t">ش</div></div>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const jobs = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, true],
];
for (const [file, size, maskable] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(html(size, maskable));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(root, "public/icons", file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
}
await browser.close();
console.log("icons written");
