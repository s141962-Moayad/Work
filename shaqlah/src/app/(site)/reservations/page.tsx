import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContext } from "@/lib/site";
import { ReservationForm } from "@/components/reservation-form";
import { OrderLookup } from "@/components/order-lookup";
import { GuestReservations } from "@/components/guest-recent-res";

export const metadata: Metadata = { title: "احجز طاولتك" };

export default async function ReservationsPage() {
  const { user, settings } = await getSiteContext();
  return (
    <div className="container-x max-w-4xl py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black sm:text-4xl">احجز طاولتك</h1>
        <p className="mt-1 text-ink-muted">اختر عدد الأشخاص والتاريخ والوقت، وسنجهّز لك أفضل طاولة. راجع <Link href="/reservation-policy" className="font-bold text-brand underline">سياسة الحجوزات</Link>.</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ReservationForm defaults={{ name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "" }} />
        </div>
        <aside className="space-y-6">
          <div className="card p-5 text-sm leading-7">
            <h2 className="mb-2 font-extrabold">قبل الحجز</h2>
            <ul className="list-disc space-y-1 ps-5 text-ink-soft">
              <li>مدة الجلوس المحجوزة {settings.reservations.durationMinutes} دقيقة تقريبًا.</li>
              <li>{settings.reservations.autoConfirm ? "يتم تأكيد الحجز فورًا عند توفر الطاولة." : "سيتم تأكيد حجزك من المطعم وسنُعلمك بذلك."}</li>
              <li>يمكن تعديل أو إلغاء الحجز قبل الموعد بـ {settings.reservations.modifyCutoffHours} ساعات على الأقل.</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 font-extrabold">لديك حجز؟</h2>
            <GuestReservations loggedIn={!!user} />
            {!user && <OrderLookup kind="reservation" />}
            {user && <Link href="/account#reservations" className="btn-outline">عرض حجوزاتي</Link>}
          </div>
        </aside>
      </div>
    </div>
  );
}
