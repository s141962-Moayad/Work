import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { LocationSection } from "@/components/location";

export const metadata: Metadata = { title: "من نحن" };

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="container-x py-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-black sm:text-4xl">من نحن</h1>
        <p className="mt-2 text-xl font-extrabold text-brand">{s.general.slogan}</p>
        <p className="mt-4 whitespace-pre-line leading-9 text-ink-soft">{s.general.about}</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["🍽️", "تنوّع في المطبخ", "من البرجر والبيتزا إلى المشاوي والمأكولات البحرية والحلويات، لكل مزاج طبق."],
          ["⏱️", "استلامك في وقتك", "اختر الموعد الذي يناسبك ونجهّز طلبك ليكون ساخنًا عند وصولك."],
          ["🥗", "مكوّنات طازجة", "نحرص على جودة المكوّنات ونظافة التحضير في كل وجبة."],
          ["🤝", "ضيافة عُمانية", "نستقبلكم في مطعمنا بأجواء مريحة للأفراد والعائلات."],
        ].map(([i, t, d]) => (
          <div key={t} className="card p-6"><div className="text-4xl">{i}</div><h2 className="mt-3 font-extrabold">{t}</h2><p className="mt-1 text-sm leading-7 text-ink-muted">{d}</p></div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/menu" className="btn-primary btn-lg">اطلب الآن</Link>
        <Link href="/reservations" className="btn-outline btn-lg">احجز طاولتك</Link>
      </div>
      <LocationSection settings={s} className="mt-14" />
    </div>
  );
}
