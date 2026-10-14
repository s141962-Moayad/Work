import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./constants";
import { loadUser, verifySession, type SessionUser, isStaff, isAdmin } from "./auth";

/** For Server Components / layouts. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const s = await verifySession(jar.get(SESSION_COOKIE)?.value);
  return s ? loadUser(s.uid) : null;
}

export async function requireUserPage(next = "/account"): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireStaffPage(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!isStaff(u)) redirect("/admin/login");
  return u!;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const u = await requireStaffPage();
  if (!isAdmin(u)) redirect("/admin");
  return u;
}
