import { handler, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";
import { tableSchema } from "@/lib/admin-schemas";

export const PUT = handler({ auth: "admin", schema: tableSchema }, async ({ params, body, user, ip }) => {
  const rows = await query("UPDATE restaurant_tables SET name=$2,capacity=$3,area=$4,active=$5 WHERE id=$1 RETURNING id", [params.id, body.name, body.capacity, body.area, body.active]);
  if (!rows.length) throw new ApiError(404, "الطاولة غير موجودة.");
  await audit(user, "table.update", "table", params.id, body, ip);
  return { saved: true };
});

export const DELETE = handler({ auth: "admin" }, async ({ params, user, ip }) => {
  const used = await queryOne<any>("SELECT count(*)::int AS n FROM reservations WHERE table_id=$1", [params.id]);
  if (used.n > 0) throw new ApiError(400, "هذه الطاولة مرتبطة بحجوزات سابقة؛ عطّلها بدلًا من حذفها.");
  await query("DELETE FROM restaurant_tables WHERE id=$1", [params.id]);
  await audit(user, "table.delete", "table", params.id, undefined, ip);
  return { deleted: true };
});
