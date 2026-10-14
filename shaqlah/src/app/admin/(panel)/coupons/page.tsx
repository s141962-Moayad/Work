import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/server-auth";
import { query } from "@/lib/db";
import { CouponsManager } from "@/components/coupons-manager";

export const metadata: Metadata = { title: "الكوبونات والعروض" };

export default async function AdminCoupons() {
  await requireAdminPage();
  const coupons = await query(`SELECT * FROM coupons ORDER BY id DESC`);
  return <CouponsManager coupons={JSON.parse(JSON.stringify(coupons))} />;
}
