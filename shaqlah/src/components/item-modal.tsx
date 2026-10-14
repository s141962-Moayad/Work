"use client";
import { useEffect, useMemo, useState } from "react";
import type { MenuItem } from "@/lib/menu";
import { Modal } from "@/components/ui/modal";
import { FoodImage, Price } from "@/components/brand";
import { cart } from "@/lib/cart-store";
import { toast } from "@/components/ui/toast";
import { ALLERGENS_AR } from "@/lib/constants";
import { cn, toBaisa, fromBaisa, LOCALE } from "@/lib/utils";

export function ItemModal({ data, onClose }: { data: { item: MenuItem; icon: string } | null; onClose: () => void }) {
  const item = data?.item;
  const [variantId, setVariantId] = useState<number | null>(null);
  const [addonIds, setAddonIds] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!item) return;
    setVariantId(item.variants.find((v) => v.isDefault)?.id ?? item.variants[0]?.id ?? null);
    setAddonIds([]);
    setQty(1);
    setNotes("");
  }, [item]);

  const unit = useMemo(() => {
    if (!item) return 0;
    let b = toBaisa(item.price);
    const v = item.variants.find((x) => x.id === variantId);
    if (v) b += toBaisa(v.priceDelta);
    for (const a of item.addons) if (addonIds.includes(a.id)) b += toBaisa(a.price);
    return fromBaisa(b);
  }, [item, variantId, addonIds]);

  if (!data || !item) return null;

  const add = () => {
    const v = item.variants.find((x) => x.id === variantId) ?? null;
    cart.add({
      itemId: item.id,
      name: item.name,
      image: item.image,
      icon: data.icon,
      variantId: v?.id ?? null,
      variantName: v?.name ?? null,
      addons: item.addons.filter((a) => addonIds.includes(a.id)),
      unitPrice: unit,
      quantity: qty,
      notes: notes.trim(),
    });
    toast(`تمت إضافة «${item.name}» إلى السلة`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={item.name}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-ink/15 bg-white">
            <button className="size-10 text-xl font-bold" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="إنقاص الكمية">−</button>
            <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">{new Intl.NumberFormat(LOCALE).format(qty)}</span>
            <button className="size-10 text-xl font-bold" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="زيادة الكمية">+</button>
          </div>
          <button className="btn-primary btn-lg flex-1" disabled={!item.available} onClick={add}>
            {item.available ? (
              <>
                أضف إلى السلة <span aria-hidden>•</span> <Price value={fromBaisa(toBaisa(unit) * qty)} />
              </>
            ) : (
              "غير متاح حاليًا"
            )}
          </button>
        </div>
      }
    >
      <div className="-mx-5 -mt-4 mb-4 h-48 overflow-hidden sm:h-56">
        <FoodImage src={item.image} icon={data.icon} alt={item.name} seed={item.id} />
      </div>
      <p className="text-sm leading-7 text-ink-soft">{item.description}</p>
      {item.allergens.length > 0 && (
        <p className="mt-3 rounded-xl bg-gold-light px-3 py-2 text-xs font-semibold text-ink-soft">
          ⚠️ يحتوي على: {item.allergens.map((a) => ALLERGENS_AR[a] ?? a).join("، ")}
        </p>
      )}

      {item.variants.length > 0 && (
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-extrabold">اختر الحجم</legend>
          <div className="grid gap-2">
            {item.variants.map((v) => (
              <label key={v.id} className={cn("flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition", variantId === v.id ? "border-brand bg-brand-light" : "border-ink/10 bg-white hover:border-brand/50")}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="variant" className="accent-brand" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                  {v.name}
                </span>
                <span className="text-ink-muted">{v.priceDelta ? <>{v.priceDelta > 0 ? "+" : ""}<Price value={v.priceDelta} /></> : "السعر الأساسي"}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {item.addons.length > 0 && (
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-extrabold">إضافات اختيارية</legend>
          <div className="grid gap-2">
            {item.addons.map((a) => {
              const on = addonIds.includes(a.id);
              return (
                <label key={a.id} className={cn("flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition", on ? "border-brand bg-brand-light" : "border-ink/10 bg-white hover:border-brand/50")}>
                  <span className="flex items-center gap-3">
                    <input type="checkbox" className="size-4 accent-brand" checked={on} onChange={() => setAddonIds((s) => (on ? s.filter((x) => x !== a.id) : [...s, a.id]))} />
                    {a.name}
                  </span>
                  <span className="text-ink-muted">+<Price value={a.price} /></span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <label className="mt-5 block">
        <span className="mb-2 block text-sm font-extrabold">تعليمات خاصة للتحضير</span>
        <textarea className="input min-h-20" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: بدون بصل، الصلصة على الجنب…" />
      </label>
    </Modal>
  );
}
