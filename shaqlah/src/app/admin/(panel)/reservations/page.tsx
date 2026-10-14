import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { ReservationActions } from "@/components/reservation-actions";
import { RESERVATION_STATUS_AR, RESERVATION_STATUS_TONE, WEEKDAYS_AR, AREA_AR, type ReservationStatus } from "@/lib/constants";
import { addDays, formatDate, formatNumber, formatPhone, formatTime, muscatDate, weekdayOf, LOCALE } from "@/lib/utils";

export const metadata: Metadata = { title: "الحجوزات" };

export default async function AdminReservations({ searchParams }: { searchParams: Promise<{ month?: string; day?: string; open?: string }> }) {
  const sp = await searchParams;
  const today = muscatDate(new Date());
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") ? sp.day! : month === today.slice(0, 7) ? today : `${month}-01`;
  const first = `${month}-01`;
  const next = addDays(`${month}-28`, 4).slice(0, 7);
  const prev = addDays(first, -1).slice(0, 7);
  const lead = weekdayOf(first);
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();

  const counts = await query(
    `SELECT to_char(start_at AT TIME ZONE 'Asia/Muscat','YYYY-MM-DD') AS d, count(*) FILTER (WHERE status='pending')::int AS pending, count(*) FILTER (WHERE status IN ('pending','confirmed','completed'))::int AS total
       FROM reservations WHERE to_char(start_at AT TIME ZONE 'Asia/Muscat','YYYY-MM') = $1 GROUP BY 1`, [month]);
  const byDay = new Map(counts.map((c) => [c.d as string, c]));
  const list = await query(
    `SELECT r.*, t.name AS table_name FROM reservations r JOIN restaurant_tables t ON t.id=r.table_id
      WHERE to_char(r.start_at AT TIME ZONE 'Asia/Muscat','YYYY-MM-DD') = $1 ORDER BY r.start_at`, [day]);
  const pending = await query(`SELECT r.id, r.number, r.customer_name, r.start_at, r.party_size FROM reservations r WHERE status='pending' AND start_at >= now() ORDER BY start_at LIMIT 10`);
  const tables = await query(`SELECT id, name, capacity FROM restaurant_tables WHERE active ORDER BY capacity, id`);
  const monthLabel = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T00:00:00Z`));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">الحجوزات</h1>
      {pending.length > 0 && (
        <section className="card border-s-4 border-brand p-4">
          <h2 className="mb-2 font-extrabold">بانتظار التأكيد ({formatNumber(pending.length)})</h2>
          <ul className="flex flex-wrap gap-2">{pending.map((p) => (
            <li key={p.id}><Link className="chip !px-3 !py-2 bg-amber-100 text-amber-900" href={`/admin/reservations?month=${muscatDate(p.start_at).slice(0, 7)}&day=${muscatDate(p.start_at)}&open=${p.id}`}>{p.customer_name} · {formatDate(p.start_at).split("،")[1] ?? ""} {formatTime(p.start_at)} · {formatNumber(p.party_size)} أشخاص</Link></li>))}</ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="card p-4 lg:col-span-2" aria-label="تقويم الحجوزات">
          <div className="mb-3 flex items-center justify-between">
            <Link href={`/admin/reservations?month=${prev}`} className="btn-ghost btn-sm" aria-label="الشهر السابق">→</Link>
            <h2 className="font-extrabold">{monthLabel}</h2>
            <Link href={`/admin/reservations?month=${next}`} className="btn-ghost btn-sm" aria-label="الشهر التالي">←</Link>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-ink-muted">{WEEKDAYS_AR.map((w) => <div key={w}>{w.slice(0, 3)}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = `${month}-${String(i + 1).padStart(2, "0")}`;
              const c = byDay.get(d);
              return (
                <Link key={d} href={`/admin/reservations?month=${month}&day=${d}`} aria-current={d === day ? "date" : undefined}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold transition hover:bg-brand-light ${d === day ? "bg-brand text-white hover:bg-brand" : d === today ? "ring-2 ring-brand" : "bg-paper"}`}>
                  {formatNumber(i + 1)}
                  {c && <span className={`mt-0.5 rounded-full px-1.5 text-[10px] ${d === day ? "bg-white/25" : c.pending ? "bg-amber-200 text-amber-900" : "bg-ink/10"}`}>{formatNumber(c.total)}</span>}
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ink-muted">الأرقام = عدد الحجوزات. الخلفية الصفراء = توجد حجوزات بانتظار التأكيد.</p>
        </section>

        <section className="space-y-3 lg:col-span-3">
          <h2 className="font-extrabold">حجوزات {formatDate(`${day}T12:00:00+04:00`)}</h2>
          {list.length === 0 && <p className="card p-8 text-center text-ink-muted">لا توجد حجوزات في هذا اليوم.</p>}
          {list.map((r) => (
            <article key={r.id} className={`card space-y-3 p-4 ${String(r.id) === sp.open ? "ring-2 ring-brand" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><b className="text-lg">{formatTime(r.start_at)} – {formatTime(r.end_at)}</b> <span className="ms-2 text-xs text-ink-muted"><bdi className="ltr">{r.number}</bdi></span></div>
                <span className={`chip ${RESERVATION_STATUS_TONE[r.status as ReservationStatus]}`}>{RESERVATION_STATUS_AR[r.status as ReservationStatus]}</span>
              </div>
              <div className="grid gap-1 text-sm sm:grid-cols-2">
                <p>👤 <b>{r.customer_name}</b> — <a href={`tel:+968${r.phone}`} className="text-brand"><bdi className="ltr">{formatPhone(r.phone)}</bdi></a></p>
                <p>👥 {formatNumber(r.party_size)} أشخاص — {r.table_name} ({AREA_AR[r.area_pref]})</p>
                {r.notes && <p className="sm:col-span-2 rounded-lg bg-amber-50 px-2 py-1">📝 {r.notes}</p>}
              </div>
              <ReservationActions id={r.id} status={r.status} tableId={r.table_id} party={r.party_size} tables={tables} />
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
