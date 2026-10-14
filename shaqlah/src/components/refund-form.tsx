"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/misc";
import { formatPrice } from "@/lib/utils";

export function RefundForm({ id, remaining, online }: { id: number; remaining: number; online: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(remaining));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="mt-3 space-y-3 rounded-2xl bg-paper p-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!confirm(`تأكيد استرداد ${formatPrice(Number(amount))}؟`)) return;
      setBusy(true);
      try {
        const r = await api<{ manual: boolean }>(`/api/admin/orders/${id}/refund`, { body: { amount: Number(amount), reason } });
        toast(r.manual ? "تم تسجيل الاسترداد. سلّم المبلغ للعميل يدويًا." : "تم الاسترداد عبر مزوّد الدفع.");
        router.refresh();
      } catch (err: any) { toast(err.message, "err"); } finally { setBusy(false); }
    }}>
      <p className="text-xs text-ink-muted">{online ? "يُنفَّذ الاسترداد الكامل عبر مزوّد الدفع الإلكتروني." : "طلب نقدي: يُسجَّل الاسترداد في النظام ويُسلَّم المبلغ يدويًا."} المتاح للاسترداد: {formatPrice(remaining)}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="label">المبلغ (ر.ع)</span><input className="input" type="number" step="0.001" min="0.001" max={remaining} dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} readOnly={online} /></label>
        <label><span className="label">السبب</span><input className="input" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} /></label>
      </div>
      <button className="btn-danger btn-sm" disabled={busy}>{busy ? <Spinner /> : null} تنفيذ الاسترداد</button>
    </form>
  );
}
