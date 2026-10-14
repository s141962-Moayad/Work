import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/server-auth";
import { query } from "@/lib/db";
import { MenuManager } from "@/components/menu-manager";

export const metadata: Metadata = { title: "قائمة الطعام" };

export default async function AdminMenu() {
  await requireAdminPage();
  const categories = await query(`SELECT c.id, c.name_ar, c.icon, c.image, c.sort, c.active, (SELECT count(*)::int FROM menu_items i WHERE i.category_id=c.id) AS items FROM categories c ORDER BY c.sort, c.id`);
  const items = await query(`SELECT i.* FROM menu_items i JOIN categories c ON c.id=i.category_id ORDER BY c.sort, i.sort, i.id`);
  const variants = await query(`SELECT id, item_id, name_ar, price_delta, is_default FROM item_variants ORDER BY sort, id`);
  const addons = await query(`SELECT id, item_id, name_ar, price, available FROM add_ons ORDER BY sort, id`);
  const full = items.map((i) => ({ ...i, variants: variants.filter((v) => v.item_id === i.id), addons: addons.filter((a) => a.item_id === i.id) }));
  return <MenuManager categories={categories} items={JSON.parse(JSON.stringify(full))} sampleCount={items.filter((i) => i.is_sample).length} />;
}
