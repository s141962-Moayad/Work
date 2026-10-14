import { z } from "zod";
import type { PoolClient } from "pg";
import { ALLERGENS_AR } from "./constants";
import { id, money, optText, text } from "./validation";

export const itemSchema = z.object({
  categoryId: id,
  name: text("اسم الصنف", 2, 100),
  description: optText("الوصف", 600),
  price: money,
  oldPrice: money.nullish(),
  image: z.string().regex(/^\/uploads\/[a-f0-9]{32}\.(png|jpg|webp)$/, "مسار الصورة غير صحيح.").nullish(),
  available: z.boolean(),
  featured: z.boolean(),
  bestSeller: z.boolean(),
  prepMinutes: z.coerce.number().int().min(0).max(240),
  allergens: z.array(z.enum(Object.keys(ALLERGENS_AR) as [string, ...string[]])).max(12),
  variants: z
    .array(z.object({ id: id.optional(), name: text("اسم الحجم", 1, 40), priceDelta: z.coerce.number().min(-1000).max(1000), isDefault: z.boolean().optional() }))
    .max(10),
  addons: z.array(z.object({ id: id.optional(), name: text("اسم الإضافة", 1, 60), price: money, available: z.boolean().default(true) })).max(30),
});
export type ItemInput = z.infer<typeof itemSchema>;

/** Inserts/updates an item together with its sizes and add-ons (ids are kept so old orders can still be re-ordered). */
export async function saveItem(c: PoolClient, input: ItemInput, itemId: number | null): Promise<number> {
  const vals = [
    input.categoryId, input.name, input.description ?? "", input.price, input.oldPrice ?? null, input.image ?? null,
    input.available, input.featured, input.bestSeller, input.prepMinutes, input.allergens,
  ];
  let idOut = itemId;
  if (itemId) {
    await c.query(
      `UPDATE menu_items SET category_id=$2,name_ar=$3,description_ar=$4,base_price=$5,old_price=$6,image=$7,available=$8,featured=$9,
         best_seller=$10,prep_minutes=$11,allergens=$12,is_sample=FALSE,updated_at=now() WHERE id=$1`,
      [itemId, ...vals],
    );
  } else {
    const r = await c.query(
      `INSERT INTO menu_items(category_id,name_ar,description_ar,base_price,old_price,image,available,featured,best_seller,prep_minutes,allergens)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      vals,
    );
    idOut = r.rows[0].id;
  }
  const keepV: number[] = [];
  const hasDefault = input.variants.some((v) => v.isDefault);
  for (const [i, v] of input.variants.entries()) {
    const isDefault = hasDefault ? !!v.isDefault : i === 0;
    if (v.id) {
      const r = await c.query(`UPDATE item_variants SET name_ar=$3,price_delta=$4,is_default=$5,sort=$6 WHERE id=$1 AND item_id=$2 RETURNING id`, [v.id, idOut, v.name, v.priceDelta, isDefault, i]);
      if (r.rowCount) { keepV.push(v.id); continue; }
    }
    const r = await c.query(`INSERT INTO item_variants(item_id,name_ar,price_delta,is_default,sort) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [idOut, v.name, v.priceDelta, isDefault, i]);
    keepV.push(r.rows[0].id);
  }
  await c.query(`DELETE FROM item_variants WHERE item_id=$1 AND NOT (id = ANY($2))`, [idOut, keepV]);

  const keepA: number[] = [];
  for (const [i, a] of input.addons.entries()) {
    if (a.id) {
      const r = await c.query(`UPDATE add_ons SET name_ar=$3,price=$4,available=$5,sort=$6 WHERE id=$1 AND item_id=$2 RETURNING id`, [a.id, idOut, a.name, a.price, a.available, i]);
      if (r.rowCount) { keepA.push(a.id); continue; }
    }
    const r = await c.query(`INSERT INTO add_ons(item_id,name_ar,price,available,sort) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [idOut, a.name, a.price, a.available, i]);
    keepA.push(r.rows[0].id);
  }
  await c.query(`DELETE FROM add_ons WHERE item_id=$1 AND NOT (id = ANY($2))`, [idOut, keepA]);
  return idOut!;
}
