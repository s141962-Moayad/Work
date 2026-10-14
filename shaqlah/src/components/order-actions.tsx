"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/misc";
import type { OrderStatus } from "@/lib/constants";

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: "accepted", label: "✅ قبول الطلب" },
  accepted: { to: "preparing", label: "👨‍🍳 بدء التحضير" },
  preparing: { to: "ready", label: "🛍️ جاهز للاستلام" },
  ready: { to: "delivered", label: "🎉 تم التسليم" },
};

export function OrderActions({ id, status, awaitingPayment, compact = false }: { id: number; status: OrderStatus; awaitingPayment: boolean; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const next = NEXT[status];

  const set = async (to: OrderStatus, reason?: string | null) => {
    setBusy(to);
    try {
      await api(`/api/admin/orders/${id}`, { method: "PATCH", body: { status: to, reason } });
      router.refresh();
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(null);
    }
  };
  const cls = compact ? "btn-sm" : "";
  if (status === "delivered" || status === "cancelled") return null;
  return (
    <div className="flex flex-wrap gap-2">
      {next && (
        <button className={`btn-primary ${cls}`} disabled={!!busy || (status === "pending" && awaitingPayment)} onClick={() => set(next.to)} title={awaitingPayment && status === "pending" ? "بانتظار الدفع الإلكتروني" : undefined}>
          {busy === next.to ? <Spinner /> : null} {awaitingPayment && status === "pending" ? "بانتظار الدفع" : next.label}
        </button>
      )}
      {status === "pending" && !awaitingPayment && (
        <button className={`btn-outline !text-red-600 ${cls}`} disabled={!!busy} onClick={() => { const r = prompt("سبب الرفض (يظهر للعميل):", "نعتذر، لا يمكننا تنفيذ الطلب حاليًا"); if (r !== null) set("cancelled", r); }}>✖ رفض</button>
      )}
      {status !== "pending" && (
        <button className={`btn-ghost !text-red-600 ${cls}`} disabled={!!busy} onClick={() => { const r = prompt("سبب الإلغاء:", ""); if (r !== null) set("cancelled", r); }}>إلغاء الطلب</button>
      )}
    </div>
  );
}
