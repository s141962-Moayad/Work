import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/server-auth";
import { canAccessOrder, getOrderFull, publicOrder, expireStaleOnlineOrders } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { OrderView } from "@/components/order-view";
import { OrderLookup } from "@/components/order-lookup";

export const metadata: Metadata = { title: "تتبّع الطلب", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ k?: string; new?: string }> }) {
  const [{ number }, sp, user, settings] = await Promise.all([params, searchParams, getCurrentUser(), getSettings()]);
  await expireStaleOnlineOrders().catch(() => {});
  const order = await getOrderFull({ number: decodeURIComponent(number).toUpperCase() });
  if (!order || !(await canAccessOrder(order, user, sp.k))) {
    return (
      <div className="container-x max-w-xl py-16 text-center">
        <div className="text-6xl">🔎</div>
        <h1 className="mt-3 text-2xl font-black">لم نعثر على الطلب</h1>
        <p className="mb-6 mt-2 text-ink-muted">للوصول إلى طلبك أدخل رقم الطلب ورقم الهاتف المستخدم عند الطلب.</p>
        <OrderLookup kind="order" />
        <Link href="/" className="btn-ghost mt-6">العودة للرئيسية</Link>
      </div>
    );
  }
  return <OrderView initial={JSON.parse(JSON.stringify(publicOrder(order)))} token={sp.k ?? null} isNew={sp.new === "1"} vatIncluded={settings.finance.vatIncluded} />;
}
