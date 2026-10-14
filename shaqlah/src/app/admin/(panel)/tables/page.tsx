import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/server-auth";
import { query } from "@/lib/db";
import { TablesManager } from "@/components/tables-manager";

export const metadata: Metadata = { title: "الطاولات والإتاحة" };

export default async function AdminTables() {
  await requireAdminPage();
  const tables = await query(`SELECT id, name, capacity, area, active FROM restaurant_tables ORDER BY area, capacity, id`);
  const blocked = await query(`SELECT id, starts_at, ends_at, applies_to, reason FROM blocked_periods WHERE ends_at > now() - interval '1 day' ORDER BY starts_at`);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">الطاولات والإتاحة</h1>
      <TablesManager tables={tables} blocked={JSON.parse(JSON.stringify(blocked))} />
    </div>
  );
}
