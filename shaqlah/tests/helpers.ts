import { pool, query } from "@/lib/db";
import { DEFAULT_SETTINGS, saveSettingsGroup, invalidateSettings } from "@/lib/settings";
import { hashPassword, signSession } from "@/lib/auth";
import { resetRateLimits } from "@/lib/rate-limit";

/** Wed 2026-10-14 15:00 in Muscat (UTC+4) */
export const NOW = new Date("2026-10-14T11:00:00Z");

export async function resetDb() {
  await pool().query(`TRUNCATE notifications, payments, order_items, orders, pickup_slots, coupons, reservations, blocked_periods,
    restaurant_tables, favorites, add_ons, item_variants, menu_items, categories, audit_logs, contact_messages, business_settings, users RESTART IDENTITY CASCADE`);
  await pool().query(`ALTER SEQUENCE order_number_seq RESTART WITH 1001; ALTER SEQUENCE reservation_number_seq RESTART WITH 1001`);
  invalidateSettings();
  resetRateLimits();
}

export async function seedMenu() {
  const cat = (await query("INSERT INTO categories(slug,name_ar) VALUES ('burgers','البرجر') RETURNING id"))[0].id;
  const item = (
    await query(`INSERT INTO menu_items(category_id,name_ar,base_price,prep_minutes) VALUES ($1,'برجر لحم',2.500,10) RETURNING id`, [cat])
  )[0].id;
  const other = (await query(`INSERT INTO menu_items(category_id,name_ar,base_price,prep_minutes) VALUES ($1,'بطاطس',0.900,5) RETURNING id`, [cat]))[0].id;
  const off = (await query(`INSERT INTO menu_items(category_id,name_ar,base_price,available) VALUES ($1,'صنف غير متاح',1.000,false) RETURNING id`, [cat]))[0].id;
  const dbl = (await query(`INSERT INTO item_variants(item_id,name_ar,price_delta,is_default) VALUES ($1,'دبل',1.200,false) RETURNING id`, [item]))[0].id;
  await query(`INSERT INTO item_variants(item_id,name_ar,price_delta,is_default) VALUES ($1,'عادي',0,true)`, [item]);
  const cheese = (await query(`INSERT INTO add_ons(item_id,name_ar,price) VALUES ($1,'جبنة',0.300) RETURNING id`, [item]))[0].id;
  const otherAddon = (await query(`INSERT INTO add_ons(item_id,name_ar,price) VALUES ($1,'كاتشب',0.100) RETURNING id`, [other]))[0].id;
  return { cat, item, other, off, dbl, cheese, otherAddon };
}

export async function seedTables(rows: [string, number, "indoor" | "outdoor"][] = [["طاولة ١", 4, "indoor"]]) {
  for (const [n, c, a] of rows) await query("INSERT INTO restaurant_tables(name,capacity,area) VALUES ($1,$2,$3)", [n, c, a]);
}

export async function setSettings(patch: Partial<{ [K in keyof typeof DEFAULT_SETTINGS]: Partial<(typeof DEFAULT_SETTINGS)[K]> }>) {
  for (const [k, v] of Object.entries(patch)) {
    const base = (DEFAULT_SETTINGS as any)[k];
    await saveSettingsGroup(k as any, Array.isArray(base) ? (v as any) : { ...base, ...(v as any) });
  }
}

export async function makeUser(role: 1 | 2 | 3, email: string, name = "مستخدم") {
  const u = (
    await query(`INSERT INTO users(role_id,name,email,password_hash) VALUES ($1,$2,$3,$4) RETURNING id`, [role, name, email, await hashPassword("password123")])
  )[0];
  const token = await signSession(u.id, role === 3 ? "admin" : role === 2 ? "staff" : "customer");
  return { id: u.id as string, cookie: `shq_session=${token}` };
}

export const IDEM = () => `idem-${Math.random().toString(36).slice(2)}-${Date.now()}`;
