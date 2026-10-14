"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand";
import { cartCount, useCart } from "@/lib/cart-store";
import { api } from "@/lib/client";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/menu", label: "قائمة الطعام" },
  { href: "/menu", label: "اطلب الآن", highlight: true },
  { href: "/reservations", label: "حجز طاولة" },
  { href: "/orders", label: "طلباتي" },
  { href: "/contact", label: "تواصل معنا" },
];

export function SiteHeader({ name, logo, user }: { name: string; logo: string | null; user: { name: string; role: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const lines = useCart();
  const count = cartCount(lines);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST", body: {} });
      router.push("/");
      router.refresh();
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white no-print">
        <div className="container-x flex h-16 items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${name} — الصفحة الرئيسية`}>
            <BrandMark size={40} logo={logo} />
            <span className="text-xl font-black tracking-tight">{name}</span>
          </Link>

          <nav className="ms-6 hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
            {NAV.map((n) =>
              n.highlight ? (
                <Link key={n.label} href={n.href} className="btn-primary btn-sm mx-1">{n.label}</Link>
              ) : (
                <Link key={n.label} href={n.href} className={cn("rounded-full px-3.5 py-2 text-sm font-bold transition hover:bg-white/10", active(n.href) && "bg-white/10 text-brand")}>
                  {n.label}
                </Link>
              ),
            )}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <Link href="/cart" className="btn-sm relative flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-bold hover:bg-white/20" aria-label={`السلة${mounted && count ? ` (${count})` : ""}`}>
              <span aria-hidden>🛒</span>
              <span className="hidden sm:inline">السلة</span>
              {mounted && count > 0 && (
                <span className="flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-extrabold tabular-nums">{formatNumber(count)}</span>
              )}
            </Link>
            {user ? (
              <div className="hidden items-center gap-1 lg:flex">
                {(user.role === "admin" || user.role === "staff") && <Link href="/admin" className="btn-sm rounded-full px-3 py-2 text-xs font-bold text-gold hover:bg-white/10">لوحة التحكم</Link>}
                <Link href="/account" className="btn-sm rounded-full px-3 py-2 text-xs font-bold hover:bg-white/10">👤 {user.name.split(" ")[0]}</Link>
                <button onClick={logout} className="btn-sm rounded-full px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10">خروج</button>
              </div>
            ) : (
              <Link href="/login" className="btn-sm hidden rounded-full border border-white/25 px-4 py-2 text-xs font-bold hover:bg-white/10 lg:inline-flex">تسجيل الدخول</Link>
            )}
            <button className="flex size-10 items-center justify-center rounded-full bg-white/10 text-xl lg:hidden" onClick={() => setOpen(true)} aria-label="القائمة" aria-expanded={open}>☰</button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden no-print">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 end-0 flex w-72 animate-slide-in flex-col bg-ink p-5 text-white shadow-lift">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-black">{name}</span>
              <button className="flex size-9 items-center justify-center rounded-full bg-white/10" onClick={() => setOpen(false)} aria-label="إغلاق">✕</button>
            </div>
            <nav className="flex flex-col gap-1" aria-label="القائمة الجانبية">
              {NAV.map((n) => (
                <Link key={n.label} href={n.href} className={cn("rounded-2xl px-4 py-3 text-base font-bold hover:bg-white/10", n.highlight && "bg-brand text-center", active(n.href) && !n.highlight && "text-brand")}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
              {user ? (
                <>
                  <Link href="/account" className="rounded-2xl px-4 py-3 font-bold hover:bg-white/10">👤 حسابي — {user.name}</Link>
                  {(user.role === "admin" || user.role === "staff") && <Link href="/admin" className="rounded-2xl px-4 py-3 font-bold text-gold hover:bg-white/10">لوحة التحكم</Link>}
                  <button onClick={logout} className="rounded-2xl px-4 py-3 text-start font-bold text-white/70 hover:bg-white/10">تسجيل الخروج</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn border border-white/25">تسجيل الدخول</Link>
                  <Link href="/register" className="btn-outline">إنشاء حساب</Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden no-print" aria-label="التنقل السريع">
        {[
          { href: "/", icon: "🏠", label: "الرئيسية" },
          { href: "/menu", icon: "🍽️", label: "القائمة" },
          { href: "/cart", icon: "🛒", label: "السلة", badge: mounted ? count : 0 },
          { href: "/reservations", icon: "📅", label: "احجز" },
          { href: "/orders", icon: "🧾", label: "طلباتي" },
        ].map((t) => (
          <Link key={t.href} href={t.href} className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold", active(t.href) ? "text-brand" : "text-ink-muted")}>
            <span className="text-xl leading-none" aria-hidden>{t.icon}</span>
            {t.label}
            {t.badge ? <span className="absolute end-[28%] top-1 rounded-full bg-brand px-1.5 text-[10px] font-extrabold text-white tabular-nums">{formatNumber(t.badge)}</span> : null}
          </Link>
        ))}
      </nav>
    </>
  );
}
