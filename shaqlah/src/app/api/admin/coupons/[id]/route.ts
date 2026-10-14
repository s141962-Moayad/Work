import { handler, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";
import { couponSchema } from "@/lib/admin-schemas";

export const PUT = handler({ auth: "admin", schema: couponSchema }, async ({ params, body, user, ip }) => {
  const rows = await query(
    `UPDATE coupons SET code=$2,description_ar=$3,type=$4,value=$5,min_order=$6,max_discount=$7,starts_at=$8,expires_at=$9,usage_limit=$10,active=$11 WHERE id=$1 RETURNING id`,
    [params.id, body.code, body.description, body.type, body.value, body.minOrder, body.maxDiscount ?? null, body.startsAt || null, body.expiresAt || null, body.usageLimit ?? null, body.active],
  );
  if (!rows.length) throw new ApiError(404, "الكوبون غير موجود.");
  await audit(user, "coupon.update", "coupon", params.id, { code: body.code }, ip);
  return { saved: true };
});

export const DELETE = handler({ auth: "admin" }, async ({ params, user, ip }) => {
  await query("DELETE FROM coupons WHERE id=$1", [params.id]);
  await audit(user, "coupon.delete", "coupon", params.id, undefined, ip);
  return { deleted: true };
});
