"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { toast } from "@/components/ui/toast";
import type { ReservationStatus } from "@/lib/constants";

export function ReservationActions({ id, status, tableId, party, tables }: { id: number; status: ReservationStatus; tableId: number; party: number; tables: { id: number; name: string; capacity: number }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const patch = async (body: object) => {
    setBusy(true);
    try { await api(`/api/admin/reservations/${id}`, { method: "PATCH", body }); router.refresh(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  const live = status === "pending" || status === "confirmed";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "pending" && <button className="btn-primary btn-sm" disabled={busy} onClick={() => patch({ status: "confirmed" })}>✅ تأكيد</button>}
      {status === "pending" && <button className="btn-outline btn-sm !text-red-600" disabled={busy} onClick={() => confirm("رفض الحجز؟") && patch({ status: "cancelled" })}>✖ رفض</button>}
      {status === "confirmed" && <button className="btn-dark btn-sm" disabled={busy} onClick={() => patch({ status: "completed" })}>اكتمل</button>}
      {status === "confirmed" && <button className="btn-outline btn-sm" disabled={busy} onClick={() => confirm("تسجيل عدم الحضور؟") && patch({ status: "no_show" })}>لم يحضر</button>}
      {status === "confirmed" && <button className="btn-ghost btn-sm !text-red-600" disabled={busy} onClick={() => confirm("إلغاء الحجز؟") && patch({ status: "cancelled" })}>إلغاء</button>}
      {live && (
        <select className="input !min-h-9 !w-auto !py-1 text-xs" value={tableId} disabled={busy} onChange={(e) => patch({ tableId: Number(e.target.value) })} aria-label="الطاولة">
          {tables.filter((t) => t.capacity >= party || t.id === tableId).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.capacity})</option>)}
        </select>
      )}
    </div>
  );
}
