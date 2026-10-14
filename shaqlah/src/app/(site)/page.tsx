import Link from "next/link";
import { getSiteContext } from "@/lib/site";
import { getCategories, getMenuItems, type MenuItem } from "@/lib/menu";
import { getOpenStatus } from "@/lib/hours";
import { ItemCard } from "@/components/item-card";
import { LocationSection } from "@/components/location";

export default async function HomePage() {
  const [{ settings }, categories, items] = await Promise.all([getSiteContext(), getCategories(), getMenuItems()]);
  const icon = new Map(categories.map((c) => [c.id, c.icon]));
  const visible = items.filter((i) => icon.has(i.categoryId));
  const featured = visible.filter((i) => i.featured && i.available).slice(0, 8);
  const best = visible.filter((i) => i.bestSeller && i.available).slice(0, 8);
  const offers = visible.filter((i) => i.oldPrice && i.available).slice(0, 6);
  const status = getOpenStatus(settings);
  const g = settings.general;

  return (
    <>
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden bg-ink text-white">
        {g.heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.heroImage} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
        )}
        <div className="pattern-dots absolute inset-0 opacity-60" aria-hidden />
        <div className="absolute -start-24 -top-24 size-80 rounded-full bg-brand/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 end-0 size-96 rounded-full bg-gold/20 blur-3xl" aria-hidden />
        <div className="container-x relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
          <div className="animate-fade-up">
            <span className={`chip ${status.open ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
              <span className={`size-2 rounded-full ${status.open ? "bg-emerald-400" : "bg-red-400"}`} /> {status.text}
            </span>
            <h1 className="mt-5 text-5xl font-black leading-tight sm:text-7xl">
              <span className="text-brand">{g.name}</span>
            </h1>
            <p className="mt-3 text-2xl font-extrabold text-gold sm:text-3xl">{g.slogan}</p>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/75">
              برجر وبيتزا وشاورما ومشاوي وأطباق عربية وعالمية ومأكولات بحرية وحلويات. اختر وجبتك، وحدّد وقت استلامها بالدقيقة، أو احجز طاولتك وتعال عيش التجربة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/menu" className="btn-primary btn-lg">اطلب الآن</Link>
              <Link href="/reservations" className="btn-lg btn border border-white/30 text-white hover:bg-white/10">احجز طاولتك</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/70">
              <li>✔ استلام في الموعد الذي تختاره</li>
              <li>✔ دفع عند الاستلام أو إلكترونيًا</li>
              <li>✔ تتبّع طلبك لحظة بلحظة</li>
            </ul>
          </div>
          <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block" aria-hidden>
            <div className="absolute inset-6 rotate-6 rounded-[3rem] bg-gradient-to-br from-brand to-gold opacity-90" />
            <div className="absolute inset-6 -rotate-3 rounded-[3rem] border border-white/15 bg-ink-soft/80 backdrop-blur" />
            <div className="absolute inset-0 grid grid-cols-3 place-items-center gap-2 p-10 text-6xl">
              {["🍔", "🍕", "🌯", "🍖", "🍛", "🍝", "🦐", "🥗", "🍰"].map((e, i) => (
                <span key={e} className="animate-pop drop-shadow-xl" style={{ animationDelay: `${i * 60}ms` }}>{e}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── Categories ───── */}
      <section className="container-x mt-12">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="section-title">أقسام القائمة</h2>
          <Link href="/menu" className="text-sm font-bold text-brand hover:underline">عرض الكل ←</Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((c) => (
            <Link key={c.id} href={`/menu?category=${c.slug}`} className="card group flex flex-col items-center gap-2 p-4 text-center transition hover:-translate-y-1 hover:shadow-lift">
              <span className="text-4xl transition group-hover:scale-110">{c.icon}</span>
              <span className="text-xs font-extrabold leading-5 sm:text-sm">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {offers.length > 0 && (
        <section className="container-x mt-14">
          <div className="rounded-4xl bg-gradient-to-l from-brand to-brand-dark p-5 sm:p-8">
            <div className="mb-5 flex items-end justify-between text-white">
              <div>
                <h2 className="section-title">🔥 عروض خاصة</h2>
                <p className="mt-1 text-sm text-white/80">وفّر أكثر مع عروض اليوم</p>
              </div>
              <Link href="/menu?category=offers" className="text-sm font-bold underline-offset-4 hover:underline">كل العروض ←</Link>
            </div>
            <Grid items={offers} icon={icon} />
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="container-x mt-14">
          <h2 className="section-title mb-5">أطباق مميّزة</h2>
          <Grid items={featured} icon={icon} />
        </section>
      )}

      {best.length > 0 && (
        <section className="container-x mt-14">
          <h2 className="section-title mb-5">الأكثر طلبًا</h2>
          <Grid items={best} icon={icon} />
        </section>
      )}

      {/* ───── Reservation CTA ───── */}
      <section className="container-x mt-14">
        <div className="pattern-dots relative overflow-hidden rounded-4xl bg-ink p-8 text-white sm:p-12">
          <div className="absolute -end-10 -top-10 size-56 rounded-full bg-gold/25 blur-3xl" aria-hidden />
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-black">احجز طاولتك الآن</h2>
              <p className="mt-2 max-w-xl text-white/75">جلسات داخلية وخارجية للأفراد والعائلات. اختر التاريخ والوقت وسنؤكد لك الحجز.</p>
            </div>
            <Link href="/reservations" className="btn-primary btn-lg shrink-0">احجز طاولتك</Link>
          </div>
        </div>
      </section>

      <LocationSection settings={settings} className="container-x mt-14" />
    </>
  );
}

function Grid({ items, icon }: { items: MenuItem[]; icon: Map<number, string> }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <ItemCard key={it.id} item={it} icon={icon.get(it.categoryId) ?? "🍽️"} />
      ))}
    </div>
  );
}
