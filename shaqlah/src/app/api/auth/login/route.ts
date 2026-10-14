import { z } from "zod";
import { NextResponse } from "next/server";
import { handler, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { signSession, sessionCookie, verifyPassword, hashPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  identifier: z.string({ error: "أدخل رقم الهاتف أو البريد الإلكتروني." }).trim().min(3, "أدخل رقم الهاتف أو البريد الإلكتروني.").max(160),
  password: z.string({ error: "كلمة المرور مطلوبة." }).min(1, "كلمة المرور مطلوبة.").max(100),
  admin: z.boolean().optional(),
});

// Hash compared against for unknown accounts so response time does not reveal which accounts exist.
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword("not-a-real-password"));

export const POST = handler({ schema, rate: ["login", 20, 15 * 60_000] }, async ({ body }) => {
  const id = body.identifier.includes("@") ? body.identifier.toLowerCase() : normalizePhone(body.identifier);
  // per-account throttle so a distributed attack on one account is also slowed down
  if (id && !rateLimit(`login-acct:${id}`, 8, 15 * 60_000)) throw new ApiError(429, "محاولات كثيرة، يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.");
  const row = id
    ? await queryOne<any>(
        `SELECT u.id, u.password_hash, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id
          WHERE u.active AND (${body.identifier.includes("@") ? "u.email" : "u.phone"} = $1)`,
        [id],
      )
    : null;
  const valid = await verifyPassword(body.password, row?.password_hash ?? (await dummyHash()));
  if (!row || !valid) throw new ApiError(401, "بيانات الدخول غير صحيحة.");
  if (body.admin && row.role === "customer") throw new ApiError(403, "هذا الحساب لا يملك صلاحية الدخول إلى لوحة التحكم.");
  const res = NextResponse.json({ ok: true, data: { role: row.role } });
  res.headers.append("Set-Cookie", sessionCookie(await signSession(row.id, row.role)));
  return res;
});
