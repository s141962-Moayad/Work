import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/server-auth";
import { query } from "@/lib/db";
import { OrderLookup } from "@/components/order-lookup";
import { Price } from "@/components/brand";
import { ReorderButton } from "@/components/reorder-button";
import { GuestRecent } from "@/components/guest-recent";
import { EmptyState } from "@/components/ui/misc";
import { ORDER_STATUS_AR, ORDER_STATUS_TONE, type OrderStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "طلباتي" };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  const orders = user
    ? await query(`SELECT number, status, total, pickup_at, created_at FROM orders WHERE user_id=$1 ORDER BY id DESC LIMIT 50`, [user.id])
    : [];
  return (
    <div className="container-x max-w-4xl py-8">
      <h1 className="text-3xl font-black">طلباتي</h1>
      {user ? (
        <div className="mt-6 space-y-3">
          {orders.length === 0 ? (
            <EmptyState icon="🧾" title="لا توجد طلبات بعد"><Link href="/menu" className="btn-primary mt-3">اطلب الآن</Link></EmptyState>
          ) : (
            orders.map((o) => (
              <div key={o.number} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/orders/${o.number}`} className="text-lg font-black hover:text-brand"><bdi className="ltr">{o.number}</bdi></Link>
                  <p className="text-xs text-ink-muted">الاستلام: {formatDateTime(o.pickup_at)}</p>
                </div>
                <span className={`chip ${ORDER_STATUS_TONE[o.status as OrderStatus]}`}>{ORDER_STATUS_AR[o.status as OrderStatus]}</span>
                <Price value={o.total} className="font-extrabold" />
                <div className="flex gap-2">
                  <Link href={`/orders/${o.number}`} className="btn-dark btn-sm">تتبّع</Link>
                  <ReorderButton number={o.number} />
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <p className="mt-2 text-ink-muted">تابع حالة طلبك برقم الطلب ورقم الهاتف، أو <Link href="/login?next=/orders" className="font-bold text-brand underline">سجّل الدخول</Link> لعرض كل طلباتك.</p>
          <GuestRecent />
          <div className="mt-8"><OrderLookup kind="order" /></div>
        </>
      )}
    </div>
  );
}
