import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/server-auth";
import { query } from "@/lib/db";
import { getMenuItems, getCategories } from "@/lib/menu";
import { ProfileForm, MarkReadButton } from "@/components/account-forms";
import { LogoutButton } from "@/components/logout-button";
import { Price } from "@/components/brand";
import { ItemCard } from "@/components/item-card";
import { ReorderButton } from "@/components/reorder-button";
import { ORDER_STATUS_AR, ORDER_STATUS_TONE, RESERVATION_STATUS_AR, RESERVATION_STATUS_TONE, ROLE_AR, type OrderStatus, type ReservationStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "حسابي" };

export default async function AccountPage() {
  const user = await requireUserPage("/account");
  const [orders, reservations, notifications, favIds, categories] = await Promise.all([
    query(`SELECT number, status, total, pickup_at FROM orders WHERE user_id=$1 ORDER BY id DESC LIMIT 5`, [user.id]),
    query(`SELECT number, status, start_at, party_size FROM reservations WHERE user_id=$1 ORDER BY start_at DESC LIMIT 8`, [user.id]),
    query(`SELECT id, title, body, link, read, created_at FROM notifications WHERE audience='customer' AND user_id=$1 ORDER BY id DESC LIMIT 15`, [user.id]),
    query(`SELECT item_id FROM favorites WHERE user_id=$1`, [user.id]),
    getCategories(),
  ]);
  const favs = favIds.length ? await getMenuItems({ ids: favIds.map((f) => f.item_id) }) : [];
  const icon = new Map(categories.map((c) => [c.id, c.icon]));
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="container-x max-w-5xl space-y-8 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">أهلاً {user.name} 👋</h1>
          <p className="text-sm text-ink-muted">{ROLE_AR[user.role]}{user.phone ? <> — <bdi className="ltr">{user.phone}</bdi></> : null}</p>
        </div>
        <div className="flex gap-2">
          {(user.role === "admin" || user.role === "staff") && <Link href="/admin" className="btn-dark btn-sm">لوحة التحكم</Link>}
          <LogoutButton />
        </div>
      </header>

      <ProfileForm user={{ name: user.name, phone: user.phone, email: user.email, notifyPrefs: user.notifyPrefs }} />

      <section aria-labelledby="orders">
        <div className="mb-3 flex items-center justify-between"><h2 id="orders" className="text-xl font-extrabold">آخر الطلبات</h2><Link href="/orders" className="text-sm font-bold text-brand">كل الطلبات ←</Link></div>
        {orders.length === 0 ? <p className="card p-6 text-center text-ink-muted">لا توجد طلبات بعد.</p> : (
          <div className="space-y-2">{orders.map((o) => (
            <div key={o.number} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <Link href={`/orders/${o.number}`} className="font-black hover:text-brand"><bdi className="ltr">{o.number}</bdi></Link>
              <span className="text-xs text-ink-muted">{formatDateTime(o.pickup_at)}</span>
              <span className={`chip ${ORDER_STATUS_TONE[o.status as OrderStatus]}`}>{ORDER_STATUS_AR[o.status as OrderStatus]}</span>
              <Price value={o.total} className="font-bold" />
              <ReorderButton number={o.number} />
            </div>))}</div>
        )}
      </section>

      <section id="reservations" aria-labelledby="res">
        <div className="mb-3 flex items-center justify-between"><h2 id="res" className="text-xl font-extrabold">حجوزاتي</h2><Link href="/reservations" className="text-sm font-bold text-brand">حجز جديد +</Link></div>
        {reservations.length === 0 ? <p className="card p-6 text-center text-ink-muted">لا توجد حجوزات.</p> : (
          <div className="space-y-2">{reservations.map((r) => (
            <Link key={r.number} href={`/reservations/${r.number}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:shadow-lift">
              <span className="font-black"><bdi className="ltr">{r.number}</bdi></span>
              <span className="text-sm">{formatDateTime(r.start_at)}</span>
              <span className={`chip ${RESERVATION_STATUS_TONE[r.status as ReservationStatus]}`}>{RESERVATION_STATUS_AR[r.status as ReservationStatus]}</span>
            </Link>))}</div>
        )}
      </section>

      <section aria-labelledby="fav">
        <h2 id="fav" className="mb-3 text-xl font-extrabold">❤️ أطباقي المفضلة</h2>
        {favs.length === 0 ? <p className="card p-6 text-center text-ink-muted">اضغط على القلب في أي طبق لحفظه هنا.</p> : (
          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3">{favs.map((i) => <ItemCard key={i.id} item={i} icon={icon.get(i.categoryId) ?? "🍽️"} />)}</div>
        )}
      </section>

      <section aria-labelledby="notif">
        <div className="mb-3 flex items-center justify-between"><h2 id="notif" className="text-xl font-extrabold">🔔 الإشعارات {unread > 0 && <span className="chip bg-brand text-white">{unread}</span>}</h2>{unread > 0 && <MarkReadButton />}</div>
        {notifications.length === 0 ? <p className="card p-6 text-center text-ink-muted">لا توجد إشعارات.</p> : (
          <ul className="space-y-2">{notifications.map((n) => (
            <li key={n.id} className={`card p-4 ${n.read ? "" : "ring-2 ring-brand/40"}`}>
              <Link href={n.link ?? "#"} className="block"><p className="font-bold">{n.title}</p><p className="text-xs text-ink-muted">{n.body} · {formatDateTime(n.created_at)}</p></Link>
            </li>))}</ul>
        )}
      </section>
    </div>
  );
}
