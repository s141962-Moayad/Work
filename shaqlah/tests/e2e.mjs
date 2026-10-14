// End-to-end smoke test (real browser, real server, real database).
//   npm run build && npm start   (in another terminal, with a seeded DB)
//   CHROMIUM_PATH=... node tests/e2e.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS ?? "e2e-shots";
const ADMIN = { id: process.env.ADMIN_EMAIL ?? "admin@shaqlah.local", pw: process.env.ADMIN_PASSWORD ?? "Shaqlah-Admin-2025" };
mkdirSync(SHOTS, { recursive: true });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function noOverflow(page, label) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(o <= 1, `${label}: no horizontal scroll on mobile (${o}px)`);
}

try {
  const phone = "9" + String(Math.floor(1000000 + Math.random() * 8999999));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-OM", deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  /* ── customer: order ── */
  await page.goto(BASE + "/");
  ok((await page.getAttribute("html", "dir")) === "rtl" && (await page.getAttribute("html", "lang")) === "ar", "html is lang=ar dir=rtl");
  await noOverflow(page, "home");
  await page.goto(BASE + "/menu");
  await page.getByRole("tab", { name: /الشاورما/ }).click();
  const card = page.locator("article", { hasText: "شاورما دجاج" }).first();
  await card.getByRole("button", { name: /^أضف .*إلى السلة$/ }).click();
  // size modal
  await page.getByRole("dialog").getByRole("button", { name: /أضف إلى السلة/ }).click();
  await noOverflow(page, "menu");
  await page.screenshot({ path: `${SHOTS}/1-menu.png` });
  await page.goto(BASE + "/cart");
  await page.getByRole("heading", { name: "شاورما دجاج" }).waitFor();
  ok(true, "cart shows the dish");
  await page.waitForSelector("text=الإجمالي");
  await noOverflow(page, "cart");
  await page.screenshot({ path: `${SHOTS}/2-cart.png` });
  await page.getByRole("link", { name: "متابعة إتمام الطلب" }).click();
  await page.waitForURL("**/checkout");
  await page.getByLabel("الاسم", { exact: true }).fill("أحمد");
  await page.getByLabel("رقم الهاتف").fill(phone);
  await page.waitForSelector("text=أقرب موعد");
  await noOverflow(page, "checkout");
  await page.screenshot({ path: `${SHOTS}/3-checkout.png`, fullPage: true });
  // scheduled mode shows only available slots
  await page.getByRole("radio", { name: /تحديد موعد الاستلام/ }).click();
  await page.locator('[aria-label="وقت الاستلام"] button').or(page.getByText("لا توجد مواعيد")).first().waitFor();
  const slotCount = await page.locator('[aria-label="وقت الاستلام"] button').count();
  ok(slotCount > 0, `scheduled pickup lists available slots (${slotCount})`);
  await page.getByRole("radio", { name: /في أقرب وقت ممكن/ }).click();
  await page.getByRole("button", { name: "تأكيد الطلب", exact: true }).click();
  await page.waitForURL(/\/orders\/SHQ-\d+/, { timeout: 15000 });
  await page.getByText("تم استلام طلبك بنجاح!").first().waitFor();
  ok(true, "order confirmation shown");
  const url = page.url();
  const number = /SHQ-\d+/.exec(url)[0];
  await page.getByText("بانتظار التأكيد").first().waitFor();
  ok(true, `order ${number} is pending`);
  await noOverflow(page, "order page");
  await page.screenshot({ path: `${SHOTS}/4-order.png`, fullPage: true });

  /* ── admin: accept the order, customer page updates live ── */
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "ar-OM" });
  const admin = await adminCtx.newPage();
  await admin.goto(BASE + "/admin");
  ok(admin.url().includes("/admin/login"), "unauthenticated /admin redirects to login");
  await admin.getByLabel(/رقم الهاتف أو البريد/).fill(ADMIN.id);
  await admin.getByLabel("كلمة المرور").fill(ADMIN.pw);
  await admin.getByRole("button", { name: "دخول" }).click();
  await admin.waitForURL(/\/admin$/);
  await admin.getByRole("link", { name: /الطلبات/ }).first().waitFor();
  ok(true, "admin dashboard loads");
  await admin.screenshot({ path: `${SHOTS}/5-admin-dashboard.png`, fullPage: true });
  await admin.goto(BASE + "/admin/orders?q=" + number);
  await admin.getByRole("button", { name: /قبول الطلب/ }).first().click();
  await page.getByText("تم قبول الطلب").first().waitFor({ timeout: 10000 });
  ok(true, "customer tracking page reflected the status change live (no reload)");
  await admin.getByRole("button", { name: /بدء التحضير/ }).first().click();
  await page.getByText("طلبك الآن قيد التحضير").or(page.locator("li[aria-current=step]", { hasText: "قيد التحضير" })).first().waitFor({ timeout: 10000 });
  await admin.screenshot({ path: `${SHOTS}/6-admin-orders.png`, fullPage: true });

  /* ── customer: table reservation ── */
  await page.goto(BASE + "/reservations");
  await page.getByLabel("الاسم الكامل").fill("أحمد");
  await page.getByLabel("رقم الهاتف", { exact: true }).fill(phone);
  await page.waitForSelector('[aria-label="وقت الحجز"] button');
  await page.locator('[aria-label="وقت الحجز"] button').last().click();
  await noOverflow(page, "reservation");
  await page.screenshot({ path: `${SHOTS}/7-reservation.png`, fullPage: true });
  await page.getByRole("button", { name: "تأكيد الحجز" }).click();
  await page.waitForURL(/\/reservations\/RSV-\d+/, { timeout: 15000 });
  await page.getByText("تم استلام طلب حجزك!").waitFor();
  ok(true, "reservation created");
  await page.screenshot({ path: `${SHOTS}/8-reservation-done.png`, fullPage: true });

  /* ── admin confirms reservation ── */
  await admin.goto(BASE + "/admin/reservations");
  await admin.getByRole("button", { name: /تأكيد/ }).first().click();
  await admin.waitForTimeout(800);
  await admin.screenshot({ path: `${SHOTS}/9-admin-reservations.png`, fullPage: true });

  /* ── 404 + unauthorized API ── */
  const r404 = await page.goto(BASE + "/no-such-page");
  ok(r404.status() === 404 && (await page.getByText("الصفحة غير موجودة").first().isVisible()), "Arabic 404 page");
  const res = await ctx.request.get(BASE + "/api/admin/stream");
  ok(res.status() === 401, "admin API rejects anonymous callers (401)");
  const manifest = await (await ctx.request.get(BASE + "/manifest.webmanifest")).json();
  ok(manifest.dir === "rtl" && manifest.lang === "ar" && manifest.display === "standalone", "PWA manifest is Arabic/RTL/standalone");
} catch (e) {
  console.error(e);
  failed++;
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall e2e checks passed");
process.exit(failed ? 1 : 0);
