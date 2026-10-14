import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { userFromCookieHeader, isStaff, isAdmin, type SessionUser } from "./auth";
import { rateLimit } from "./rate-limit";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export type AuthLevel = "public" | "user" | "staff" | "admin";

export interface Ctx<B = undefined> {
  req: NextRequest;
  user: SessionUser | null;
  body: B;
  params: Record<string, string>;
  ip: string;
  query: URLSearchParams;
}

const HAS_ARABIC = /[؀-ۿ]/;

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return (xf?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

/** CSRF defence for cookie auth: mutating requests must come from our own origin. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients / same-origin GET navigations
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return o.host === host;
  } catch {
    return false;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}
export function fail(status: number, error: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...(details ?? {}) }, { status });
}

interface Opts<S extends z.ZodType> {
  auth?: AuthLevel;
  schema?: S;
  /** [bucket, max, windowMs] – keyed by IP */
  rate?: [string, number, number];
}

type RouteCtx = { params: Promise<any> };

export function handler<S extends z.ZodType = z.ZodUndefined>(
  opts: Opts<S>,
  fn: (c: Ctx<z.infer<S>>) => Promise<unknown>,
) {
  return async (req: NextRequest, rc: RouteCtx): Promise<Response> => {
    try {
      const method = req.method.toUpperCase();
      const ip = clientIp(req);
      if (method !== "GET" && method !== "HEAD" && !sameOrigin(req)) {
        throw new ApiError(403, "تم رفض الطلب لأسباب أمنية.");
      }
      if (opts.rate && !rateLimit(`${opts.rate[0]}:${ip}`, opts.rate[1], opts.rate[2])) {
        throw new ApiError(429, "محاولات كثيرة، يرجى الانتظار قليلًا ثم المحاولة مرة أخرى.");
      }
      const level = opts.auth ?? "public";
      const user = await userFromCookieHeader(req.headers.get("cookie"));
      if (level !== "public") {
        if (!user) throw new ApiError(401, "يجب تسجيل الدخول للمتابعة.");
        if (level === "staff" && !isStaff(user)) throw new ApiError(403, "ليست لديك صلاحية للوصول.");
        if (level === "admin" && !isAdmin(user)) throw new ApiError(403, "ليست لديك صلاحية للوصول.");
      }
      let body: any = undefined;
      if (opts.schema) {
        let raw: unknown = {};
        if (method === "GET") {
          raw = Object.fromEntries(req.nextUrl.searchParams);
        } else {
          try {
            raw = await req.json();
          } catch {
            throw new ApiError(400, "تعذّر قراءة البيانات المرسلة.");
          }
        }
        const parsed = opts.schema.safeParse(raw);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          const msg = issue && HAS_ARABIC.test(issue.message) ? issue.message : "البيانات المدخلة غير صالحة، يرجى مراجعة الحقول.";
          throw new ApiError(400, msg, { field: issue?.path.join(".") });
        }
        body = parsed.data;
      }
      const params = rc?.params ? await rc.params : {};
      const out = await fn({ req, user, body, params, ip, query: req.nextUrl.searchParams });
      if (out instanceof Response) return out;
      return ok(out ?? null);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.message, e.details);
      const code = (e as any)?.code;
      if (code === "23505") return fail(409, "هذه البيانات مسجّلة مسبقًا.");
      console.error("[api]", e);
      return fail(500, "حدث خطأ غير متوقع، يرجى المحاولة لاحقًا.");
    }
  };
}
