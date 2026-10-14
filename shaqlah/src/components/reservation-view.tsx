"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { rememberRef } from "@/lib/cart-store";
import { AREA_AR, RESERVATION_STATUS_AR, RESERVATION_STATUS_TONE, type ReservationStatus } from "@/lib/constants";
import { cn, formatDateTime, formatNumber, formatTime } from "@/lib/utils";
import { ReservationForm, type ExistingReservation } from "@/components/reservation-form";
import { Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";

export function ReservationView({ r, token, isNew, cutoffHours, canChange }: { r: any; token: string | null; isNew: boolean; cutoffHours: number; canChange: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = r.status as ReservationStatus;

  useEffect(() => {
    if (token) rememberRef({ kind: "reservation", number: r.number, token });
  }, [token, r.number]);

  // pick up confirmation from the restaurant without a manual reload
  useEffect(() => {
    if (status !== "pending" && status !== "confirmed") return;
    const t = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(t);
  }, [status, router]);

  const cancel = async () => {
    if (!confirm("هل أنت متأكد من إلغاء الحجز؟")) return;
    setBusy(true);
    try {
      await api(`/api/reservations/${r.number}${token ? `?k=${token}` : ""}`, { method: "DELETE" });
      toast("تم إلغاء الحجز.");
      router.refresh();
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const existing: ExistingReservation = { number: r.number, token, customer_name: r.customer_name, phone: r.phone, party_size: r.party_size, area_pref: r.area_pref, notes: r.notes, start_at: r.start_at, id: r.id };

  return (
    <div className="container-x max-w-3xl py-8">
      {isNew && (
        <div className="mb-6 animate-pop rounded-4xl bg-gradient-to-l from-emerald-600 to-emerald-500 p-6 text-center text-white">
          <div className="text-5xl">📅</div>
          <h1 className="mt-2 text-2xl font-black">{status === "confirmed" ? "تم تأكيد حجز طاولتك." : "تم استلام طلب حجزك!"}</h1>
          <p className="mt-1 text-white/90">{status === "confirmed" ? "بانتظارك في الموعد المحدد." : "سنقوم بتأكيد الحجز وإشعارك قريبًا."}</p>
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-ink p-5 text-white">
          <div>
            <p className="text-xs text-white/60">رقم الحجز</p>
            <p className="text-2xl font-black"><bdi className="ltr">{r.number}</bdi></p>
          </div>
          <span className={cn("chip !text-sm", RESERVATION_STATUS_TONE[status])}>{RESERVATION_STATUS_AR[status]}</span>
        </div>
        <dl className="grid gap-3 p-5 sm:grid-cols-2">
          {[
            ["الاسم", r.customer_name],
            ["الموعد", formatDateTime(r.start_at)],
            ["حتى", formatTime(r.end_at)],
            ["عدد الأشخاص", formatNumber(r.party_size)],
            ["نوع الجلسة", r.table_area ? AREA_AR[r.table_area] : AREA_AR[r.area_pref]],
            ["ملاحظات", r.notes || "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-paper p-4">
              <dt className="text-xs text-ink-muted">{k}</dt>
              <dd className="mt-1 font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {canChange && (status === "pending" || status === "confirmed") && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button className="btn-outline" onClick={() => setEditing((v) => !v)}>✏️ {editing ? "إغلاق التعديل" : "تعديل الحجز"}</button>
            <button className="btn-outline !text-red-600" onClick={cancel} disabled={busy}>{busy ? <Spinner /> : "✖"} إلغاء الحجز</button>
          </div>
          <p className="text-xs text-ink-muted">يمكن التعديل أو الإلغاء قبل الموعد بـ {formatNumber(cutoffHours)} ساعات على الأقل. راجع <Link href="/reservation-policy" className="underline">سياسة الحجوزات</Link>.</p>
          {editing && <ReservationForm existing={existing} onDone={() => setEditing(false)} />}
        </div>
      )}
      <div className="mt-8"><Link href="/reservations" className="btn-ghost">حجز جديد</Link></div>
    </div>
  );
}
