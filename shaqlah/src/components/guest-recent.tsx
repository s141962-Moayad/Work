"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { recentRefs, type RecentRef } from "@/lib/cart-store";
import { api } from "@/lib/client";
import { Price } from "@/components/brand";
import { ORDER_STATUS_AR, ORDER_STATUS_TONE, type OrderStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

/** Orders placed from this device (as a guest), remembered via their secure access token. */
export function GuestRecent() {
  const [rows, setRows] = useState<{ ref: RecentRef; o: any }[] | null>(null);
  useEffect(() => {
    const refs = recentRefs("order").slice(0, 6);
    Promise.all(refs.map((ref) => api(`/api/orders/${ref.number}?k=${ref.token}`).then((o) => ({ ref, o })).catch(() => null))).then((r) => setRows(r.filter(Boolean) as any));
  }, []);
  if (!rows || !rows.length) return null;
  return (
    <div className="mt-6 space-y-3">
      <h2 className="font-extrabold">طلباتك الأخيرة من هذا الجهاز</h2>
      {rows.map(({ ref, o }) => (
        <Link key={ref.number} href={`/orders/${ref.number}?k=${ref.token}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:shadow-lift">
          <div>
            <span className="text-lg font-black"><bdi className="ltr">{ref.number}</bdi></span>
            <p className="text-xs text-ink-muted">الاستلام: {formatDateTime(o.pickup_at)}</p>
          </div>
          <span className={`chip ${ORDER_STATUS_TONE[o.status as OrderStatus]}`}>{ORDER_STATUS_AR[o.status as OrderStatus]}</span>
          <Price value={o.total} className="font-extrabold" />
        </Link>
      ))}
    </div>
  );
}
