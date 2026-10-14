import { handler, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";
import { categorySchema } from "@/lib/admin-schemas";

export const PATCH = handler({ auth: "admin", schema: categorySchema }, async ({ params, body, user, ip }) => {
  const rows = await query(
    "UPDATE categories SET name_ar=$2, icon=$3, image=$4, sort=$5, active=$6 WHERE id=$1 RETURNING id",
    [params.id, body.name, body.icon, body.image ?? null, body.sort, body.active],
  );
  if (!rows.length) throw new ApiError(404, "القسم غير موجود.");
  await audit(user, "category.update", "category", params.id, body, ip);
  return { saved: true };
});

export const DELETE = handler({ auth: "admin" }, async ({ params, user, ip }) => {
  const used = await queryOne<any>("SELECT count(*)::int AS n FROM menu_items WHERE category_id=$1", [params.id]);
  if (used.n > 0) throw new ApiError(400, "لا يمكن حذف قسم يحتوي على أصناف. انقل الأصناف أو عطّل القسم بدلًا من ذلك.");
  await query("DELETE FROM categories WHERE id=$1", [params.id]);
  await audit(user, "category.delete", "category", params.id, undefined, ip);
  return { deleted: true };
});
