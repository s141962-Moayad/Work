import type { Metadata } from "next";
import { getCategories, getMenuItems } from "@/lib/menu";
import { MenuBrowser } from "@/components/menu-browser";

export const metadata: Metadata = { title: "قائمة الطعام" };

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [categories, items] = await Promise.all([getCategories(), getMenuItems()]);
  const ids = new Set(categories.map((c) => c.id));
  const visible = items.filter((i) => ids.has(i.categoryId));
  const initial = categories.some((c) => c.slug === category) ? category! : "all";
  const hasSample = visible.some((i) => i.isSample);

  return (
    <div className="container-x py-8">
      <header className="mb-2">
        <h1 className="text-3xl font-black sm:text-4xl">قائمة الطعام</h1>
        <p className="mt-1 text-ink-muted">اختر وجبتك، خصّصها على مزاجك، وأضفها إلى السلة. الأسعار بالريال العُماني.</p>
      </header>
      {hasSample && (
        <div className="mt-4 rounded-2xl border border-gold bg-gold-light px-4 py-3 text-sm font-semibold text-ink-soft" role="note">
          ⚠️ القائمة المعروضة حاليًا تجريبية: الأصناف والأسعار مبدئية إلى حين اعتماد قائمة المطعم الرسمية.
        </div>
      )}
      {visible.length === 0 ? (
        <p className="mt-10 text-center text-ink-muted">لم تُضف أصناف إلى القائمة بعد.</p>
      ) : (
        <MenuBrowser categories={categories} items={visible} initialCategory={initial} />
      )}
    </div>
  );
}
