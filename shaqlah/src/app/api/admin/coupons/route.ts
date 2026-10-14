import { handler } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";
import { couponSchema } from "@/lib/admin-schemas";

export const POST = handler({ auth: "admin", schema: couponSchema }, async ({ body, user, ip }) => {
  const r = await queryOne<any>(
    `INSERT INTO coupons(code,description_ar,type,value,min_order,max_discount,starts_at,expires_at,usage_limit,active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [body.code, body.description, body.type, body.value, body.minOrder, body.maxDiscount ?? null, body.startsAt || null, body.expiresAt || null, body.usageLimit ?? null, body.active],
  );
  await audit(user, "coupon.create", "coupon", r.id, { code: body.code }, ip);
  return { id: r.id };
});
