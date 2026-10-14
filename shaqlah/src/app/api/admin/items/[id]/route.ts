import { handler, ApiError } from "@/lib/api";
import { query, queryOne, tx } from "@/lib/db";
import { audit } from "@/lib/audit";
import { itemSchema, saveItem } from "@/lib/item-save";

export const PUT = handler({ auth: "admin", schema: itemSchema }, async ({ params, body, user, ip }) => {
  const id = Number(params.id);
  const before = await queryOne<any>("SELECT base_price, available FROM menu_items WHERE id=$1", [id]);
  if (!before) throw new ApiError(404, "الصنف غير موجود.");
  await tx((c) => saveItem(c, body, id));
  await audit(user, "item.update", "menu_item", id, { name: body.name, price: { from: before.base_price, to: body.price }, available: body.available }, ip);
  return { saved: true };
});

export const DELETE = handler({ auth: "admin" }, async ({ params, user, ip }) => {
  // Past orders keep their own snapshot of the dish name and price, so deleting is safe.
  const rows = await query("DELETE FROM menu_items WHERE id=$1 RETURNING name_ar", [params.id]);
  if (!rows.length) throw new ApiError(404, "الصنف غير موجود.");
  await audit(user, "item.delete", "menu_item", params.id, { name: rows[0].name_ar }, ip);
  return { deleted: true };
});
