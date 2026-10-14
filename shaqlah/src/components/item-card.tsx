"use client";
import type { MenuItem } from "@/lib/menu";
import { FoodImage, Price } from "@/components/brand";
import { useSite } from "@/components/site-provider";
import { cart } from "@/lib/cart-store";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function ItemCard({ item, icon }: { item: MenuItem; icon: string }) {
  const { openItem, favorites, toggleFavorite } = useSite();
  const fav = favorites.has(item.id);
  const simple = item.variants.length === 0 && item.addons.length === 0;

  const quickAdd = () => {
    if (!simple) return openItem(item, icon);
    cart.add({ itemId: item.id, name: item.name, image: item.image, icon, variantId: null, variantName: null, addons: [], unitPrice: item.price, quantity: 1, notes: "" });
    toast(`تمت إضافة «${item.name}» إلى السلة`);
  };

  return (
    <article className={cn("card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift", !item.available && "opacity-80")}>
      <div className="relative h-40 cursor-pointer overflow-hidden sm:h-44" onClick={() => openItem(item, icon)}>
        <div className="size-full transition duration-500 group-hover:scale-105">
          <FoodImage src={item.image} icon={icon} alt={item.name} seed={item.id} />
        </div>
        <div className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {item.oldPrice && <span className="chip bg-red-600 text-white">عرض خاص</span>}
          {item.bestSeller && <span className="chip bg-gold text-ink">الأكثر طلبًا</span>}
          {item.featured && !item.bestSeller && <span className="chip bg-ink text-white">مميّز</span>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
          className="absolute end-2 top-2 flex size-9 items-center justify-center rounded-full bg-white/90 text-lg shadow transition hover:scale-110"
          aria-label={fav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          aria-pressed={fav}
        >
          {fav ? "❤️" : "🤍"}
        </button>
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/60">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-extrabold">غير متاح حاليًا</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-base font-extrabold leading-snug">{item.name}</h3>
        <p className="line-clamp-2 text-xs leading-6 text-ink-muted">{item.description}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="leading-tight">
            {item.variants.length > 0 && <span className="block text-[11px] text-ink-muted">ابتداءً من</span>}
            <Price value={item.price} className="text-lg font-extrabold text-brand" />
            {item.oldPrice && <Price value={item.oldPrice} old className="ms-2 text-xs" />}
          </div>
          <button className="btn-primary btn-sm" disabled={!item.available} onClick={quickAdd} aria-label={`أضف ${item.name} إلى السلة`}>
            {simple ? "أضف إلى السلة" : "اختر وأضف"}
          </button>
        </div>
      </div>
    </article>
  );
}
