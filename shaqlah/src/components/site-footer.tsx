import Link from "next/link";
import type { Settings } from "@/lib/settings";
import { BrandMark } from "@/components/brand";
import { InstallButton } from "@/components/pwa";
import { WEEKDAYS_AR } from "@/lib/constants";
import { formatHHMM, formatPhone } from "@/lib/utils";

const SOCIAL: { key: keyof Settings["social"]; label: string; icon: string }[] = [
  { key: "instagram", label: "إنستغرام", icon: "📸" },
  { key: "x", label: "إكس", icon: "𝕏" },
  { key: "tiktok", label: "تيك توك", icon: "🎵" },
  { key: "snapchat", label: "سناب شات", icon: "👻" },
  { key: "facebook", label: "فيسبوك", icon: "📘" },
  { key: "whatsapp", label: "واتساب", icon: "💬" },
];

export function SiteFooter({ settings }: { settings: Settings }) {
  const g = settings.general;
  const socials = SOCIAL.filter((s) => settings.social[s.key]);
  return (
    <footer className="mt-20 bg-ink pb-24 pt-14 text-white/80 lg:pb-10 no-print">
      <div className="container-x grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3">
            <BrandMark size={44} logo={g.logo} />
            <span className="text-2xl font-black text-white">{g.name}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-gold">{g.slogan}</p>
          <p className="mt-2 text-sm leading-7">{g.address}</p>
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a key={s.key} href={settings.social[s.key]} target="_blank" rel="noopener noreferrer" className="flex size-10 items-center justify-center rounded-full bg-white/10 text-lg transition hover:bg-brand" aria-label={s.label} title={s.label}>
                  {s.icon}
                </a>
              ))}
            </div>
          )}
          <div className="mt-4"><InstallButton /></div>
        </div>

        <div>
          <h3 className="mb-3 font-extrabold text-white">روابط سريعة</h3>
          <ul className="space-y-2 text-sm">
            {[["/menu", "قائمة الطعام"], ["/reservations", "حجز طاولة"], ["/orders", "تتبع طلبي"], ["/about", "من نحن"], ["/contact", "تواصل معنا"], ["/faq", "الأسئلة الشائعة"]].map(([h, l]) => (
              <li key={h}><Link href={h} className="hover:text-brand">{l}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-extrabold text-white">السياسات</h3>
          <ul className="space-y-2 text-sm">
            {[["/privacy", "سياسة الخصوصية"], ["/terms", "الشروط والأحكام"], ["/cancellation-policy", "سياسة إلغاء الطلبات"], ["/reservation-policy", "سياسة الحجوزات"]].map(([h, l]) => (
              <li key={h}><Link href={h} className="hover:text-brand">{l}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-extrabold text-white">ساعات العمل</h3>
          <ul className="space-y-1.5 text-sm">
            {settings.hours.map((h, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{WEEKDAYS_AR[i]}</span>
                <span className="text-white/60">{h.closed ? "مغلق" : `${formatHHMM(h.open)} – ${formatHHMM(h.close)}`}</span>
              </li>
            ))}
          </ul>
          {g.phone && <p className="mt-3 text-sm">📞 <bdi className="ltr font-bold text-white">{g.phone.startsWith("+") ? g.phone : formatPhone(g.phone)}</bdi></p>}
        </div>
      </div>
      <div className="container-x mt-10 border-t border-white/10 pt-5 text-center text-xs text-white/50">
        جميع الأسعار بالريال العُماني (ر.ع) — © {g.name}
      </div>
    </footer>
  );
}
