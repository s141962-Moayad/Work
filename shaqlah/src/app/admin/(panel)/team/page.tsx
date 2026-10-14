import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/server-auth";
import { query } from "@/lib/db";
import { TeamManager } from "@/components/team-manager";

export const metadata: Metadata = { title: "الفريق والصلاحيات" };

export default async function AdminTeam() {
  const me = await requireAdminPage();
  const users = await query(`SELECT u.id, u.name, u.phone, u.email, r.name AS role, u.active, u.created_at FROM users u JOIN roles r ON r.id=u.role_id WHERE u.role_id > 1 ORDER BY u.role_id DESC, u.created_at`);
  return <div className="space-y-5"><h1 className="text-2xl font-black">الفريق والصلاحيات</h1><TeamManager users={JSON.parse(JSON.stringify(users))} me={me.id} /></div>;
}
