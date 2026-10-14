/**
 * Seeds business settings defaults, restaurant tables, the first admin account and
 * (optionally) a SAMPLE menu. Sample items are flagged `is_sample` and shown to customers
 * with a notice until the owner replaces them from the admin dashboard.
 */
import { randomBytes } from "node:crypto";
import { pool } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { normalizePhone } from "../src/lib/utils";
import { DEFAULT_SETTINGS, SETTINGS_KEYS } from "../src/lib/settings";
import { SAMPLE_CATEGORIES, SAMPLE_ITEMS } from "./sample-menu";

const isProd = process.env.NODE_ENV === "production";

async function main() {
  const db = pool();

  for (const k of SETTINGS_KEYS) {
    await db.query("INSERT INTO business_settings(key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO NOTHING", [k, JSON.stringify((DEFAULT_SETTINGS as any)[k])]);
  }

  // Tables
  const tables: [string, number, "indoor" | "outdoor"][] = [
    ["طاولة ١", 2, "indoor"], ["طاولة ٢", 2, "indoor"], ["طاولة ٣", 4, "indoor"], ["طاولة ٤", 4, "indoor"],
    ["طاولة ٥", 6, "indoor"], ["طاولة ٦", 8, "indoor"], ["جلسة خارجية ١", 4, "outdoor"], ["جلسة خارجية ٢", 4, "outdoor"],
    ["جلسة خارجية ٣", 6, "outdoor"], ["جلسة خارجية عائلية", 10, "outdoor"],
  ];
  if ((await db.query("SELECT 1 FROM restaurant_tables LIMIT 1")).rowCount === 0) {
    for (const [name, cap, area] of tables) await db.query("INSERT INTO restaurant_tables(name,capacity,area) VALUES ($1,$2,$3)", [name, cap, area]);
    console.log(`✓ ${tables.length} sample tables created (edit them in the dashboard)`);
  }

  // Admin
  const hasAdmin = (await db.query("SELECT 1 FROM users WHERE role_id=3 LIMIT 1")).rowCount! > 0;
  if (!hasAdmin) {
    const phone = process.env.ADMIN_PHONE ? normalizePhone(process.env.ADMIN_PHONE) : null;
    const email = process.env.ADMIN_EMAIL?.toLowerCase() || null;
    if (!phone && !email) {
      console.warn("! No admin created: set ADMIN_PHONE or ADMIN_EMAIL (and ADMIN_PASSWORD) and re-run `npm run db:seed`");
    } else {
      let pw = process.env.ADMIN_PASSWORD;
      let generated = false;
      if (!pw) {
        if (isProd) throw new Error("ADMIN_PASSWORD is required in production");
        pw = randomBytes(9).toString("base64url");
        generated = true;
      }
      if (pw.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");
      await db.query("INSERT INTO users(role_id,name,phone,email,password_hash) VALUES (3,$1,$2,$3,$4)", [process.env.ADMIN_NAME ?? "مدير شقلح", phone, email, await hashPassword(pw)]);
      console.log(`✓ admin created (${email ?? phone})${generated ? ` — generated password: ${pw}` : ""}`);
    }
  }

  // Sample menu
  const wantSample = (process.env.SEED_SAMPLE_MENU ?? (isProd ? "false" : "true")) === "true";
  const hasMenu = (await db.query("SELECT 1 FROM menu_items LIMIT 1")).rowCount! > 0;
  if (wantSample && !hasMenu) {
    const catIds = new Map<string, number>();
    for (const [i, c] of SAMPLE_CATEGORIES.entries()) {
      const r = await db.query("INSERT INTO categories(slug,name_ar,icon,sort) VALUES ($1,$2,$3,$4) ON CONFLICT (slug) DO UPDATE SET name_ar=EXCLUDED.name_ar RETURNING id", [c.slug, c.name, c.icon, i]);
      catIds.set(c.slug, r.rows[0].id);
    }
    let n = 0;
    for (const it of SAMPLE_ITEMS) {
      const r = await db.query(
        `INSERT INTO menu_items(category_id,name_ar,description_ar,base_price,old_price,featured,best_seller,prep_minutes,allergens,is_sample,sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10) RETURNING id`,
        [catIds.get(it.cat), it.name, it.desc, it.price, it.old ?? null, !!it.featured, !!it.best, it.prep ?? 12, it.allergens ?? [], n++],
      );
      for (const [i, v] of (it.sizes ?? []).entries()) {
        await db.query("INSERT INTO item_variants(item_id,name_ar,price_delta,is_default,sort) VALUES ($1,$2,$3,$4,$5)", [r.rows[0].id, v[0], v[1], i === 0, i]);
      }
      for (const [i, a] of (it.extras ?? []).entries()) {
        await db.query("INSERT INTO add_ons(item_id,name_ar,price,sort) VALUES ($1,$2,$3,$4)", [r.rows[0].id, a[0], a[1], i]);
      }
    }
    console.log(`✓ sample menu created: ${SAMPLE_CATEGORIES.length} categories, ${SAMPLE_ITEMS.length} items (flagged as sample)`);
  }
  await db.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
