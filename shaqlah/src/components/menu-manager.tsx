"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { ImageUpload } from "@/components/image-upload";
import { Modal } from "@/components/ui/modal";
import { Field, Spinner, Toggle } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { FoodImage, Price } from "@/components/brand";
import { ALLERGENS_AR } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";

export interface AdminCategory { id: number; name_ar: string; icon: string; image: string | null; sort: number; active: boolean; items: number }
export interface AdminItem {
  id: number; category_id: number; name_ar: string; description_ar: string; base_price: number; old_price: number | null; image: string | null;
  available: boolean; featured: boolean; best_seller: boolean; prep_minutes: number; allergens: string[]; is_sample: boolean;
  variants: { id: number; name_ar: string; price_delta: number; is_default: boolean }[];
  addons: { id: number; name_ar: string; price: number; available: boolean }[];
}

type Draft = {
  id: number | null; categoryId: number; name: string; description: string; price: string; oldPrice: string; image: string | null;
  available: boolean; featured: boolean; bestSeller: boolean; prepMinutes: string; allergens: string[];
  variants: { id?: number; name: string; priceDelta: string; isDefault: boolean }[];
  addons: { id?: number; name: string; price: string; available: boolean }[];
};

const toDraft = (i: AdminItem | null, cat: number): Draft => i ? ({
  id: i.id, categoryId: i.category_id, name: i.name_ar, description: i.description_ar, price: String(i.base_price), oldPrice: i.old_price == null ? "" : String(i.old_price), image: i.image,
  available: i.available, featured: i.featured, bestSeller: i.best_seller, prepMinutes: String(i.prep_minutes), allergens: i.allergens,
  variants: i.variants.map((v) => ({ id: v.id, name: v.name_ar, priceDelta: String(v.price_delta), isDefault: v.is_default })),
  addons: i.addons.map((a) => ({ id: a.id, name: a.name_ar, price: String(a.price), available: a.available })),
}) : ({ id: null, categoryId: cat, name: "", description: "", price: "", oldPrice: "", image: null, available: true, featured: false, bestSeller: false, prepMinutes: "10", allergens: [], variants: [], addons: [] });

const payload = (d: Draft) => ({
  categoryId: d.categoryId, name: d.name, description: d.description, price: d.price, oldPrice: d.oldPrice === "" ? null : d.oldPrice, image: d.image,
  available: d.available, featured: d.featured, bestSeller: d.bestSeller, prepMinutes: d.prepMinutes, allergens: d.allergens,
  variants: d.variants.map((v) => ({ id: v.id, name: v.name, priceDelta: v.priceDelta || 0, isDefault: v.isDefault })),
  addons: d.addons.map((a) => ({ id: a.id, name: a.name, price: a.price || 0, available: a.available })),
});

export function MenuManager({ categories, items, sampleCount }: { categories: AdminCategory[]; items: AdminItem[]; sampleCount: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<"items" | "categories">("items");
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [catDraft, setCatDraft] = useState<(Partial<AdminCategory> & { isNew?: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const icon = useMemo(() => new Map(categories.map((c) => [c.id, c.icon])), [categories]);

  const list = items.filter((i) => (!catFilter || i.category_id === catFilter) && (!q.trim() || i.name_ar.includes(q.trim())));

  const saveItem = async () => {
    if (!draft) return;
    setBusy(true); setErr(null);
    try {
      await api(draft.id ? `/api/admin/items/${draft.id}` : "/api/admin/items", { method: draft.id ? "PUT" : "POST", body: payload(draft) });
      toast("تم حفظ الصنف.");
      setDraft(null);
      router.refresh();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const deleteItem = async (i: AdminItem) => {
    if (!confirm(`حذف «${i.name_ar}» نهائيًا؟ ستبقى الطلبات السابقة محفوظة.`)) return;
    try { await api(`/api/admin/items/${i.id}`, { method: "DELETE" }); toast("تم الحذف."); setDraft(null); router.refresh(); } catch (e: any) { toast(e.message, "err"); }
  };
  const quickToggle = async (i: AdminItem, patch: Partial<Draft>) => {
    try { await api(`/api/admin/items/${i.id}`, { method: "PUT", body: payload({ ...toDraft(i, i.category_id), ...patch }) }); router.refresh(); } catch (e: any) { toast(e.message, "err"); }
  };
  const saveCat = async () => {
    if (!catDraft) return;
    setBusy(true); setErr(null);
    const body = { name: catDraft.name_ar ?? "", icon: catDraft.icon || "🍽️", image: catDraft.image ?? null, sort: catDraft.sort ?? 0, active: catDraft.active ?? true };
    try {
      await api(catDraft.isNew ? "/api/admin/categories" : `/api/admin/categories/${catDraft.id}`, { method: catDraft.isNew ? "POST" : "PATCH", body });
      toast("تم حفظ القسم."); setCatDraft(null); router.refresh();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const clearSample = async () => {
    if (!confirm(`سيتم حذف ${sampleCount} صنفًا تجريبيًا لم تعدّلها. هل تريد المتابعة؟`)) return;
    try { const r = await api<{ deleted: number }>("/api/admin/items/clear-sample", { body: {} }); toast(`تم حذف ${r.deleted} صنفًا تجريبيًا.`); router.refresh(); } catch (e: any) { toast(e.message, "err"); }
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => d && { ...d, [k]: v });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">قائمة الطعام</h1>
        <div className="flex gap-2">
          <button className={cn("btn-sm", tab === "items" ? "btn-dark" : "btn-outline")} onClick={() => setTab("items")}>الأصناف ({formatNumber(items.length)})</button>
          <button className={cn("btn-sm", tab === "categories" ? "btn-dark" : "btn-outline")} onClick={() => setTab("categories")}>الأقسام ({formatNumber(categories.length)})</button>
        </div>
      </div>

      {sampleCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold bg-gold-light p-4 text-sm font-semibold">
          <span>⚠️ يوجد {formatNumber(sampleCount)} صنفًا تجريبيًا (بيانات عينة). عدّل الأصناف أو احذفها عند اعتماد القائمة الحقيقية — يظهر تنبيه «قائمة تجريبية» للعملاء حتى ذلك الحين.</span>
          <button className="btn-outline btn-sm !text-red-600" onClick={clearSample}>حذف كل الأصناف التجريبية</button>
        </div>
      )}

      {tab === "items" ? (
        <>
          <div className="card flex flex-wrap items-end gap-3 p-4">
            <label className="min-w-40 flex-1"><span className="label">بحث</span><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم الصنف" /></label>
            <label><span className="label">القسم</span><select className="input" value={catFilter} onChange={(e) => setCatFilter(Number(e.target.value))}><option value={0}>كل الأقسام</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>)}</select></label>
            <button className="btn-primary" onClick={() => { setErr(null); setDraft(toDraft(null, catFilter || categories[0]?.id)); }} disabled={!categories.length}>+ إضافة صنف</button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-ink/10 bg-paper"><tr><th className="th">الصنف</th><th className="th">القسم</th><th className="th">السعر</th><th className="th">مميّز</th><th className="th">متاح</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-ink/5">
                {list.map((i) => (
                  <tr key={i.id}>
                    <td className="td"><div className="flex items-center gap-3"><div className="size-12 shrink-0 overflow-hidden rounded-xl"><FoodImage src={i.image} icon={icon.get(i.category_id) ?? "🍽️"} alt="" seed={i.id} className="!text-2xl" /></div>
                      <div><b>{i.name_ar}</b>{i.is_sample && <span className="chip ms-2 bg-gold-light text-ink-soft">عينة</span>}<div className="text-[11px] text-ink-muted">{i.variants.length ? `${formatNumber(i.variants.length)} أحجام · ` : ""}{i.addons.length ? `${formatNumber(i.addons.length)} إضافات` : ""}</div></div></div></td>
                    <td className="td text-sm">{categories.find((c) => c.id === i.category_id)?.name_ar}</td>
                    <td className="td"><Price value={i.base_price} className="font-bold" />{i.old_price && <div><Price value={i.old_price} old className="text-xs" /></div>}</td>
                    <td className="td"><input type="checkbox" className="size-5 accent-brand" checked={i.featured} onChange={(e) => quickToggle(i, { featured: e.target.checked })} aria-label={`${i.name_ar} مميّز`} /></td>
                    <td className="td"><button role="switch" aria-checked={i.available} onClick={() => quickToggle(i, { available: !i.available })} className={cn("chip !px-3 !py-1.5", i.available ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}>{i.available ? "متاح" : "غير متاح"}</button></td>
                    <td className="td"><button className="btn-outline btn-sm" onClick={() => { setErr(null); setDraft(toDraft(i, i.category_id)); }}>تعديل</button></td>
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-ink-muted">لا توجد أصناف.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end"><button className="btn-primary" onClick={() => { setErr(null); setCatDraft({ isNew: true, name_ar: "", icon: "🍽️", sort: categories.length, active: true, image: null }); }}>+ إضافة قسم</button></div>
          <div className="card divide-y divide-ink/5">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3"><span className="text-3xl">{c.icon}</span><div><b>{c.name_ar}</b><div className="text-xs text-ink-muted">{formatNumber(c.items)} أصناف · الترتيب {formatNumber(c.sort)} {!c.active && "· مخفي"}</div></div></div>
                <div className="flex gap-2">
                  <button className="btn-outline btn-sm" onClick={() => { setErr(null); setCatDraft({ ...c }); }}>تعديل</button>
                  <button className="btn-ghost btn-sm !text-red-600" onClick={async () => { if (!confirm(`حذف قسم «${c.name_ar}»؟`)) return; try { await api(`/api/admin/categories/${c.id}`, { method: "DELETE" }); router.refresh(); } catch (e: any) { toast(e.message, "err"); } }}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* item editor */}
      <Modal open={!!draft} onClose={() => setDraft(null)} wide title={draft?.id ? "تعديل صنف" : "إضافة صنف جديد"}
        footer={<div className="flex items-center justify-between gap-3">
          {draft?.id ? <button className="btn-ghost !text-red-600" onClick={() => deleteItem(items.find((x) => x.id === draft.id)!)}>حذف الصنف</button> : <span />}
          <div className="flex gap-2"><button className="btn-ghost" onClick={() => setDraft(null)}>إلغاء</button><button className="btn-primary" disabled={busy} onClick={saveItem}>{busy ? <Spinner /> : null} حفظ</button></div></div>}>
        {draft && (
          <div className="space-y-5">
            {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{err}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم الصنف"><input className="input" value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={100} /></Field>
              <Field label="القسم"><select className="input" value={draft.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>{categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>)}</select></Field>
              <div className="sm:col-span-2"><Field label="الوصف"><textarea className="input min-h-20" value={draft.description} onChange={(e) => set("description", e.target.value)} maxLength={600} /></Field></div>
              <Field label="السعر الأساسي (ر.ع)"><input className="input" type="number" step="0.001" min="0" dir="ltr" value={draft.price} onChange={(e) => set("price", e.target.value)} /></Field>
              <Field label="السعر قبل الخصم (للعروض)" hint="اتركه فارغًا إن لم يكن عرضًا"><input className="input" type="number" step="0.001" min="0" dir="ltr" value={draft.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} /></Field>
              <Field label="وقت التحضير (دقائق)"><input className="input" type="number" min="0" max="240" dir="ltr" value={draft.prepMinutes} onChange={(e) => set("prepMinutes", e.target.value)} /></Field>
              <ImageUpload value={draft.image} onChange={(u) => set("image", u)} label="صورة الطبق" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle label="متاح للطلب" checked={draft.available} onChange={(v) => set("available", v)} />
              <Toggle label="صنف مميّز" checked={draft.featured} onChange={(v) => set("featured", v)} />
              <Toggle label="الأكثر طلبًا" checked={draft.bestSeller} onChange={(v) => set("bestSeller", v)} />
            </div>

            <fieldset>
              <legend className="label">مسببات الحساسية</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ALLERGENS_AR).map(([k, l]) => {
                  const on = draft.allergens.includes(k);
                  return <button type="button" key={k} aria-pressed={on} onClick={() => set("allergens", on ? draft.allergens.filter((a) => a !== k) : [...draft.allergens, k])} className={cn("chip !px-3 !py-1.5", on ? "bg-ink text-white" : "bg-paper text-ink-soft ring-1 ring-ink/10")}>{l}</button>;
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="label">الأحجام (الفرق عن السعر الأساسي)</legend>
              {draft.variants.map((v, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input className="input !w-40 flex-1" placeholder="الاسم (مثال: كبير)" value={v.name} onChange={(e) => set("variants", draft.variants.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input className="input !w-28" type="number" step="0.001" dir="ltr" placeholder="+0.000" value={v.priceDelta} onChange={(e) => set("variants", draft.variants.map((x, j) => j === i ? { ...x, priceDelta: e.target.value } : x))} aria-label="فرق السعر" />
                  <label className="flex items-center gap-1.5 text-xs font-bold"><input type="radio" name="defv" className="accent-brand" checked={v.isDefault} onChange={() => set("variants", draft.variants.map((x, j) => ({ ...x, isDefault: j === i })))} /> افتراضي</label>
                  <button type="button" className="btn-ghost btn-sm !text-red-600" onClick={() => set("variants", draft.variants.filter((_, j) => j !== i))}>حذف</button>
                </div>
              ))}
              <button type="button" className="btn-outline btn-sm" onClick={() => set("variants", [...draft.variants, { name: "", priceDelta: "0", isDefault: draft.variants.length === 0 }])}>+ إضافة حجم</button>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="label">الإضافات الاختيارية</legend>
              {draft.addons.map((a, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input className="input !w-40 flex-1" placeholder="الاسم (مثال: جبنة إضافية)" value={a.name} onChange={(e) => set("addons", draft.addons.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input className="input !w-28" type="number" step="0.001" min="0" dir="ltr" placeholder="0.000" value={a.price} onChange={(e) => set("addons", draft.addons.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} aria-label="سعر الإضافة" />
                  <label className="flex items-center gap-1.5 text-xs font-bold"><input type="checkbox" className="accent-brand" checked={a.available} onChange={(e) => set("addons", draft.addons.map((x, j) => j === i ? { ...x, available: e.target.checked } : x))} /> متاحة</label>
                  <button type="button" className="btn-ghost btn-sm !text-red-600" onClick={() => set("addons", draft.addons.filter((_, j) => j !== i))}>حذف</button>
                </div>
              ))}
              <button type="button" className="btn-outline btn-sm" onClick={() => set("addons", [...draft.addons, { name: "", price: "0", available: true }])}>+ إضافة خيار</button>
            </fieldset>
          </div>
        )}
      </Modal>

      <Modal open={!!catDraft} onClose={() => setCatDraft(null)} title={catDraft?.isNew ? "إضافة قسم" : "تعديل قسم"}
        footer={<div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setCatDraft(null)}>إلغاء</button><button className="btn-primary" disabled={busy} onClick={saveCat}>{busy ? <Spinner /> : null} حفظ</button></div>}>
        {catDraft && (
          <div className="space-y-4">
            {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{err}</p>}
            <Field label="اسم القسم"><input className="input" value={catDraft.name_ar ?? ""} onChange={(e) => setCatDraft({ ...catDraft, name_ar: e.target.value })} maxLength={60} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الأيقونة (إيموجي)"><input className="input" value={catDraft.icon ?? ""} onChange={(e) => setCatDraft({ ...catDraft, icon: e.target.value })} maxLength={8} /></Field>
              <Field label="ترتيب الظهور"><input className="input" type="number" dir="ltr" value={catDraft.sort ?? 0} onChange={(e) => setCatDraft({ ...catDraft, sort: Number(e.target.value) })} /></Field>
            </div>
            <Toggle label="ظاهر للعملاء" checked={catDraft.active ?? true} onChange={(v) => setCatDraft({ ...catDraft, active: v })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
