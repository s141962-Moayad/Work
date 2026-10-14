import { z } from "zod";
import { handler, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { optEmail, password, text } from "@/lib/validation";
import { normalizePhone } from "@/lib/utils";

const schema = z.object({
  name: text("الاسم", 2, 80),
  phone: z.string().optional().transform((v) => (v ? normalizePhone(v) ?? "invalid" : null)),
  email: optEmail,
  password,
  role: z.enum(["staff", "admin"]),
});

export const POST = handler({ auth: "admin", schema }, async ({ body, user, ip }) => {
  if (body.phone === "invalid") throw new ApiError(400, "رقم الهاتف غير صحيح.", { field: "phone" });
  if (!body.phone && !body.email) throw new ApiError(400, "أدخل رقم الهاتف أو البريد الإلكتروني.");
  const r = await queryOne<any>(
    "INSERT INTO users(role_id,name,phone,email,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [body.role === "admin" ? 3 : 2, body.name, body.phone, body.email, await hashPassword(body.password)],
  );
  await audit(user, "user.create", "user", r.id, { role: body.role, name: body.name }, ip);
  return { id: r.id };
});
