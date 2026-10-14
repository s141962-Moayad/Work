"use client";
import { useMemo, useState } from "react";
import type { MenuCategory, MenuItem } from "@/lib/menu";
import { ItemCard } from "@/components/item-card";
import { useSite } from "@/components/site-provider";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const norm = (s: string) =>
  s.toLowerCase().replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");

export function MenuBrowser({ categories, items, initialCategory }: { categories: MenuCategory[]; items: MenuItem[]; initialCategory: string }) {
  const { favorites, user } = useSite();
  const [cat, setCat] = useState(initialCategory);
  const [q, setQ] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [sort, setSort] = useState<"default" | "asc" | "desc">("default");

  const icon = useMemo(() => new Map(categories.map((c) => [c.id, c.icon])), [categories]);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    let list = items.filter((i) => {
      if (onlyAvailable && !i.available) return false;
      if (onlyFav && !favorites.has(i.id)) return false;
      if (nq && !norm(`${i.name} ${i.description}`).includes(nq)) return false;
      if (!nq && cat !== "all") {
        const c = categories.find((x) => x.slug === cat);
        if (c && i.categoryId !== c.id) return false;
      }
      return true;
    });
    if (sort !== "default") list = [...list].sort((a, b) => (sort === "asc" ? a.price - b.price : b.price - a.price));
    return list;
  }, [items, categories, cat, q, onlyAvailable, onlyFav, sort, favorites]);

  const grouped = cat === "all" && !q.trim() && sort === "default";

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-4 border-b border-ink/10 bg-paper/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden>🔍</span>
            <input type="search" className="input !ps-10" placeholder="ابحث عن وجبتك…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث في القائمة" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select className="input !w-auto !py-1.5" value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="ترتيب">
              <option value="default">الترتيب الافتراضي</option>
              <option value="asc">السعر: من الأقل</option>
              <option value="desc">السعر: من الأعلى</option>
            </select>
            <button className={cn("chip !px-3 !py-2 !text-xs", onlyAvailable ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-ink/10")} onClick={() => setOnlyAvailable((v) => !v)} aria-pressed={onlyAvailable}>المتاح فقط</button>
            {user && <button className={cn("chip !px-3 !py-2 !text-xs", onlyFav ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-ink/10")} onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav}>❤️ المفضلة</button>}
          </div>
        </div>
        <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="أقسام القائمة">
          {[{ slug: "all", name: "الكل", icon: "✨" }, ...categories].map((c) => (
            <button key={c.slug} role="tab" aria-selected={cat === c.slug} onClick={() => setCat(c.slug)}
              className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold transition", cat === c.slug ? "bg-brand text-white shadow-card" : "bg-white text-ink-soft ring-1 ring-ink/10 hover:ring-brand")}>
              <span aria-hidden>{c.icon}</span> {c.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon="🔎" title="لا توجد نتائج مطابقة">جرّب كلمة بحث أخرى أو اختر قسمًا مختلفًا.</EmptyState>
        </div>
      ) : grouped ? (
        categories.map((c) => {
          const list = filtered.filter((i) => i.categoryId === c.id);
          if (!list.length) return null;
          return (
            <section key={c.id} className="mt-8" aria-labelledby={`cat-${c.slug}`}>
              <h2 id={`cat-${c.slug}`} className="mb-4 text-xl font-extrabold">{c.icon} {c.name}</h2>
              <Grid list={list} icon={icon} />
            </section>
          );
        })
      ) : (
        <div className="mt-6"><Grid list={filtered} icon={icon} /></div>
      )}
    </div>
  );
}

function Grid({ list, icon }: { list: MenuItem[]; icon: Map<number, string> }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((i) => (
        <ItemCard key={i.id} item={i} icon={icon.get(i.categoryId) ?? "🍽️"} />
      ))}
    </div>
  );
}
