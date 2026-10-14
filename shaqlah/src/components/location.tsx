import type { Settings } from "@/lib/settings";
import { WEEKDAYS_AR } from "@/lib/constants";
import { cn, formatHHMM, formatPhone } from "@/lib/utils";

export function mapSrc(g: Settings["general"]): string | null {
  if (g.mapEmbedUrl) return g.mapEmbedUrl;
  if (g.mapLat && g.mapLng) return `https://www.google.com/maps?q=${encodeURIComponent(g.mapLat)},${encodeURIComponent(g.mapLng)}&hl=ar&z=16&output=embed`;
  return null;
}

export function LocationSection({ settings, className }: { settings: Settings; className?: string }) {
  const g = settings.general;
  const src = mapSrc(g);
  const dirLink = g.mapLat && g.mapLng ? `https://www.google.com/maps/dir/?api=1&destination=${g.mapLat},${g.mapLng}` : null;
  const today = new Date(Date.now() + 4 * 3600_000).getUTCDay();
  return (
    <section className={className} aria-labelledby="loc">
      <h2 id="loc" className="section-title mb-5">زورونا</h2>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card space-y-5 p-6 lg:col-span-2">
          <div>
            <h3 className="mb-1 font-extrabold">📍 العنوان</h3>
            <p className="text-sm leading-7 text-ink-soft">{g.address}</p>
            {dirLink && <a className="btn-outline btn-sm mt-3" href={dirLink} target="_blank" rel="noopener noreferrer">احصل على الاتجاهات</a>}
          </div>
          <div>
            <h3 className="mb-2 font-extrabold">🕒 ساعات العمل</h3>
            <ul className="space-y-1 text-sm">
              {settings.hours.map((h, i) => (
                <li key={i} className={cn("flex justify-between rounded-lg px-2 py-1", i === today && "bg-brand-light font-bold")}>
                  <span>{WEEKDAYS_AR[i]}</span>
                  <span>{h.closed ? "مغلق" : `${formatHHMM(h.open)} – ${formatHHMM(h.close)}`}</span>
                </li>
              ))}
            </ul>
          </div>
          {(g.phone || g.email || g.whatsapp) && (
            <div>
              <h3 className="mb-1 font-extrabold">📞 تواصل معنا</h3>
              <ul className="space-y-1 text-sm">
                {g.phone && <li>الهاتف: <bdi className="ltr font-bold">{g.phone.startsWith("+") ? g.phone : formatPhone(g.phone)}</bdi></li>}
                {g.whatsapp && <li>واتساب: <bdi className="ltr font-bold">{g.whatsapp}</bdi></li>}
                {g.email && <li>البريد: <bdi className="ltr font-bold">{g.email}</bdi></li>}
              </ul>
            </div>
          )}
        </div>
        <div className="card min-h-72 overflow-hidden lg:col-span-3">
          {src ? (
            <iframe title={`موقع ${g.name} على خرائط جوجل`} src={src} className="size-full min-h-72 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          ) : (
            <div className="flex size-full min-h-72 flex-col items-center justify-center gap-2 bg-paper p-6 text-center">
              <span className="text-5xl">🗺️</span>
              <p className="text-sm text-ink-muted">سيظهر موقع المطعم على الخريطة هنا فور إضافته من لوحة التحكم.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
