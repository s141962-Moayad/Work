import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/server-auth";
import { canAccessReservation, getReservation, publicReservation } from "@/lib/reservations";
import { getSettings } from "@/lib/settings";
import { ReservationView } from "@/components/reservation-view";
import { OrderLookup } from "@/components/order-lookup";

export const metadata: Metadata = { title: "تفاصيل الحجز", robots: { index: false } };

export default async function ReservationPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ k?: string; new?: string }> }) {
  const [{ number }, sp, user, settings] = await Promise.all([params, searchParams, getCurrentUser(), getSettings()]);
  const r = await getReservation({ number: decodeURIComponent(number).toUpperCase() });
  if (!r || !(await canAccessReservation(r, user, sp.k))) {
    return (
      <div className="container-x max-w-xl py-16 text-center">
        <div className="text-6xl">🔎</div>
        <h1 className="mt-3 text-2xl font-black">لم نعثر على الحجز</h1>
        <p className="mb-6 mt-2 text-ink-muted">أدخل رقم الحجز ورقم الهاتف المستخدم عند الحجز.</p>
        <OrderLookup kind="reservation" />
        <Link href="/reservations" className="btn-ghost mt-6">حجز جديد</Link>
      </div>
    );
  }
  return (
    <ReservationView
      r={JSON.parse(JSON.stringify(publicReservation(r)))}
      token={sp.k ?? null}
      isNew={sp.new === "1"}
      cutoffHours={settings.reservations.modifyCutoffHours}
      canChange
    />
  );
}
