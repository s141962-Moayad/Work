import type { Metadata } from "next";
import { requireStaffPage } from "@/lib/server-auth";
import { query, queryOne } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = { title: { default: "لوحة تحكم شقلح", template: "%s | لوحة تحكم شقلح" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  const [notifications, unread] = await Promise.all([
    query(`SELECT id, title, body, link, read, created_at FROM notifications WHERE audience='admin' ORDER BY id DESC LIMIT 15`),
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM notifications WHERE audience='admin' AND NOT read`),
  ]);
  return (
    <AdminShell user={{ name: user.name, role: user.role }} notifications={JSON.parse(JSON.stringify(notifications))} unread={unread?.n ?? 0}>
      {children}
    </AdminShell>
  );
}
