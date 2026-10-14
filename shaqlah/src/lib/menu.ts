import { query } from "./db";

export interface MenuVariant { id: number; name: string; priceDelta: number; isDefault: boolean }
export interface MenuAddon { id: number; name: string; price: number }
export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  image: string | null;
  available: boolean;
  featured: boolean;
  bestSeller: boolean;
  prepMinutes: number;
  allergens: string[];
  isSample: boolean;
  variants: MenuVariant[];
  addons: MenuAddon[];
}
export interface MenuCategory { id: number; slug: string; name: string; icon: string; image: string | null }

export async function getCategories(): Promise<MenuCategory[]> {
  const rows = await query(`SELECT id, slug, name_ar, icon, image FROM categories WHERE active ORDER BY sort, id`);
  return rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name_ar, icon: c.icon, image: c.image }));
}

export async function getMenuItems(opts: { ids?: number[] } = {}): Promise<MenuItem[]> {
  const items = await query(
    `SELECT i.* FROM menu_items i JOIN categories c ON c.id = i.category_id
      WHERE c.active ${opts.ids ? "AND i.id = ANY($1)" : ""} ORDER BY c.sort, i.sort, i.id`,
    opts.ids ? [opts.ids] : [],
  );
  if (!items.length) return [];
  const ids = items.map((i) => i.id);
  const variants = await query(`SELECT * FROM item_variants WHERE item_id = ANY($1) ORDER BY sort, id`, [ids]);
  const addons = await query(`SELECT * FROM add_ons WHERE item_id = ANY($1) AND available ORDER BY sort, id`, [ids]);
  return items.map((i) => ({
    id: i.id,
    categoryId: i.category_id,
    name: i.name_ar,
    description: i.description_ar,
    price: i.base_price,
    oldPrice: i.old_price,
    image: i.image,
    available: i.available,
    featured: i.featured,
    bestSeller: i.best_seller,
    prepMinutes: i.prep_minutes,
    allergens: i.allergens,
    isSample: i.is_sample,
    variants: variants.filter((v) => v.item_id === i.id).map((v) => ({ id: v.id, name: v.name_ar, priceDelta: v.price_delta, isDefault: v.is_default })),
    addons: addons.filter((a) => a.item_id === i.id).map((a) => ({ id: a.id, name: a.name_ar, price: a.price })),
  }));
}
