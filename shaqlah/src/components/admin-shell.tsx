"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { api } from "@/lib/client";
import { toast } from "@/components/ui/toast";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

const NAV: { href: string; label: string; icon: string; admin?: boolean }[] = [
  { href: "/admin", label: "لوحة التحكم", icon: "📊" },
  { href: "/admin/orders", label: "الطلبات", icon: "🧾" },
  { href: "/admin/menu", label: "قائمة الطعام", icon: "🍔", admin: true },
  { href: "/admin/reservations", label: "الحجوزات", icon: "📅" },
  { href: "/admin/tables", label: "الطاولات والإتاحة", icon: "🪑", admin: true },
  { href: "/admin/coupons", label: "الكوبونات والعروض", icon: "🏷️", admin: true },
  { href: "/admin/customers", label: "العملاء", icon: "👥", admin: true },
  { href: "/admin/messages", label: "الرسائل", icon: "✉️" },
  { href: "/admin/team", label: "الفريق والصلاحيات", icon: "🔐", admin: true },
  { href: "/admin/audit", label: "سجل التدقيق", icon: "📜", admin: true },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️", admin: true },
];

interface Notif { id: number; title: string; body: string; link: string | null; read: boolean; created_at: string }

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.08;
    o.start(); o.stop(ctx.currentTime + 0.18);
    setTimeout(() => ctx.close(), 400);
  } catch {}
}

export function AdminShell({ user, notifications, unread, children }: { user: { name: string; role: string }; notifications: Notif[]; unread: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [live, setLive] = useState(false);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  soundRef.current = sound;
  useEffect(() => setOpen(false), [pathname]);

  // Real-time feed: every change in orders/reservations refreshes the current page's data.
  useEffect(() => {
    const es = new EventSource("/api/admin/stream");
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (m) => {
      try {
        const d = JSON.parse(m.data) as { unread: number; fresh: { id: number; title: string; body: string }[] };
        for (const n of d.fresh) {
          toast(`${n.title} ${n.body}`, "info");
          if (soundRef.current) beep();
        }
      } catch {}
      router.refresh();
    };
    return () => es.close();
  }, [router]);

  const items = NAV.filter((n) => !n.admin || user.role === "admin");
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="التنقل في لوحة التحكم">
      {items.map((n) => (
        <Link key={n.href} href={n.href} className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition hover:bg-white/10", active(n.href) && "bg-brand text-white")}>
          <span aria-hidden>{n.icon}</span>{n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#f3f0eb] lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto bg-ink p-4 text-white/85 lg:flex no-print">
        <div className="flex items-center gap-3 px-2 pt-2"><BrandMark size={40} /><span className="font-black leading-tight text-white">لوحة تحكم<br />شقلح</span></div>
        {nav}
        <div className="mt-auto space-y-1 border-t border-white/10 pt-4 text-sm">
          <Link href="/" className="block rounded-xl px-3.5 py-2 font-bold hover:bg-white/10">↗ عرض الموقع</Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink/10 bg-white/90 px-4 backdrop-blur no-print">
          <button className="flex size-10 items-center justify-center rounded-full bg-ink/5 text-xl lg:hidden" onClick={() => setOpen(true)} aria-label="القائمة">☰</button>
          <h1 className="text-lg font-black lg:hidden">لوحة تحكم شقلح</h1>
          <span className={cn("chip ms-2 hidden sm:inline-flex", live ? "bg-emerald-100 text-emerald-800" : "bg-ink/10 text-ink-muted")}>
            <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-emerald-500" : "bg-ink/30")} />{live ? "تحديث مباشر" : "غير متصل"}
          </span>
          <div className="ms-auto flex items-center gap-2">
            <button className="btn-ghost btn-sm" onClick={() => setSound((s) => !s)} aria-pressed={sound} title="صوت التنبيه">{sound ? "🔔" : "🔕"}<span className="hidden sm:inline">{sound ? "الصوت مفعّل" : "الصوت متوقف"}</span></button>
            <div className="relative">
              <button className="btn-outline btn-sm relative" onClick={() => setBell((b) => !b)} aria-expanded={bell} aria-label="الإشعارات">
                📥 <span className="hidden sm:inline">الإشعارات</span>
                {unread > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] font-extrabold text-white">{formatNumber(unread)}</span>}
              </button>
              {bell && (
                <div className="absolute end-0 top-12 z-50 w-80 max-w-[85vw] rounded-3xl bg-white p-3 shadow-lift">
                  <div className="mb-2 flex items-center justify-between px-2"><b>إشعارات الإدارة</b>
                    {unread > 0 && <button className="text-xs font-bold text-brand" onClick={async () => { await api("/api/admin/notifications", { body: {} }).catch(() => {}); router.refresh(); }}>تحديد الكل كمقروء</button>}
                  </div>
                  <ul className="max-h-96 space-y-1 overflow-y-auto">
                    {notifications.length === 0 && <li className="p-4 text-center text-sm text-ink-muted">لا توجد إشعارات.</li>}
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <Link href={n.link ?? "/admin"} onClick={() => setBell(false)} className={cn("block rounded-2xl p-3 text-sm hover:bg-paper", !n.read && "bg-brand-light")}>
                          <b className="block">{n.title}</b><span className="text-xs text-ink-muted">{n.body}</span>
                          <span className="block text-[11px] text-ink-muted">{formatDateTime(n.created_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <span className="hidden text-sm font-bold md:inline">👤 {user.name}</span>
            <LogoutButton className="btn-ghost btn-sm" to="/admin/login" />
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden no-print">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 end-0 flex w-72 animate-slide-in flex-col gap-4 overflow-y-auto bg-ink p-4 text-white/85">
            <div className="flex items-center justify-between"><span className="font-black text-white">لوحة تحكم شقلح</span><button onClick={() => setOpen(false)} aria-label="إغلاق" className="size-9 rounded-full bg-white/10">✕</button></div>
            {nav}
            <Link href="/" className="mt-auto rounded-xl px-3.5 py-2 text-sm font-bold hover:bg-white/10">↗ عرض الموقع</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
