import { z } from "zod";
import { handler, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema = z.object({ role: z.enum(["customer", "staff", "admin"]).optional(), active: z.boolean().optional() });
const ROLE_ID = { customer: 1, staff: 2, admin: 3 } as const;

export const PATCH = handler({ auth: "admin", schema }, async ({ params, body, user, ip }) => {
  if (params.id === user!.id) throw new ApiError(400, "لا يمكنك تعديل صلاحيات حسابك الحالي.");
  const t = await queryOne<any>("SELECT id FROM users WHERE id=$1", [params.id]);
  if (!t) throw new ApiError(404, "المستخدم غير موجود.");
  await query("UPDATE users SET role_id=COALESCE($2,role_id), active=COALESCE($3,active) WHERE id=$1", [params.id, body.role ? ROLE_ID[body.role] : null, body.active ?? null]);
  await audit(user, "user.update", "user", params.id, body, ip);
  return { saved: true };
});
