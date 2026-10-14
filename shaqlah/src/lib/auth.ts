import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { queryOne } from "./db";
import { SESSION_COOKIE } from "./constants";

export type Role = "customer" | "staff" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: Role;
  notifyPrefs: { inApp: boolean; email: boolean; sms: boolean; whatsapp: boolean };
}

const MAX_AGE_S = 60 * 60 * 24 * 14;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set (32+ characters) in production");
    }
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-0123456789");
  }
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 11);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function signSession(uid: string, role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(uid)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined | null): Promise<{ uid: string; role: Role } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { uid: payload.sub, role: payload.role as Role };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_S}${secure}`;
}
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

/** Always re-reads the user from the DB so deactivated users / role changes apply immediately. */
export async function loadUser(uid: string): Promise<SessionUser | null> {
  const row = await queryOne<any>(
    `SELECT u.id, u.name, u.phone, u.email, u.notify_prefs, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1 AND u.active`,
    [uid],
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    notifyPrefs: { inApp: true, email: false, sms: false, whatsapp: false, ...row.notify_prefs },
  };
}

export async function userFromCookieHeader(header: string | null | undefined): Promise<SessionUser | null> {
  const s = await verifySession(readCookie(header, SESSION_COOKIE));
  return s ? loadUser(s.uid) : null;
}

export const isStaff = (u: SessionUser | null) => !!u && (u.role === "staff" || u.role === "admin");
export const isAdmin = (u: SessionUser | null) => !!u && u.role === "admin";
