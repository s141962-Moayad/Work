import type { Db } from "./db";
import type { Settings } from "./settings";
import { ApiError } from "./api";
import { fromBaisa, toBaisa, formatPrice } from "./utils";

export interface CartLineInput {
  itemId: number;
  variantId?: number | null;
  addonIds?: number[];
  quantity: number;
  notes?: string | null;
}

export interface PricedLine {
  itemId: number;
  variantId: number | null;
  addonIds: number[];
  name: string;
  variantName: string | null;
  addons: { id: number; name: string; price: number }[];
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  notes: string | null;
  prepMinutes: number;
}

export interface CouponInfo {
  id: number;
  code: string;
  description: string;
}

export interface Pricing {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  fee: number;
  tax: number;
  total: number;
  vatIncluded: boolean;
  prepMinutes: number;
  coupon: CouponInfo | null;
}

/** Pure total calculation in integer baisa. Exported for unit tests. */
export function computeTotals(
  subtotalB: number,
  discountB: number,
  finance: Settings["finance"],
): { fee: number; tax: number; total: number } {
  const net = Math.max(0, subtotalB - discountB);
  const feeB = net > 0 ? toBaisa(finance.serviceFee) : 0;
  const base = net + feeB;
  const rate = finance.vatPercent / 100;
  let taxB: number;
  let totalB: number;
  if (finance.vatIncluded) {
    taxB = Math.round(base - base / (1 + rate));
    totalB = base;
  } else {
    taxB = Math.round(base * rate);
    totalB = base + taxB;
  }
  return { fee: feeB, tax: taxB, total: totalB };
}

export function couponDiscountBaisa(
  c: { type: "percent" | "fixed"; value: number; max_discount: number | null },
  subtotalB: number,
): number {
  let d = c.type === "percent" ? Math.round((subtotalB * c.value) / 100) : toBaisa(c.value);
  if (c.max_discount != null) d = Math.min(d, toBaisa(c.max_discount));
  return Math.max(0, Math.min(d, subtotalB));
}

export async function validateCoupon(db: Db, rawCode: string, subtotalB: number, lock: boolean) {
  const code = rawCode.trim().toUpperCase();
  const { rows } = await db.query(`SELECT * FROM coupons WHERE upper(code) = $1 ${lock ? "FOR UPDATE" : ""}`, [code]);
  const c = rows[0];
  const now = new Date();
  if (!c || !c.active) throw new ApiError(400, "كود الخصم غير صحيح.", { field: "coupon" });
  if (c.starts_at && c.starts_at > now) throw new ApiError(400, "كود الخصم غير فعّال بعد.", { field: "coupon" });
  if (c.expires_at && c.expires_at < now) throw new ApiError(400, "انتهت صلاحية كود الخصم.", { field: "coupon" });
  if (c.usage_limit != null && c.used_count >= c.usage_limit) {
    throw new ApiError(400, "تم استنفاد الحد الأقصى لاستخدام كود الخصم.", { field: "coupon" });
  }
  if (subtotalB < toBaisa(c.min_order)) {
    throw new ApiError(400, `الحد الأدنى للطلب لاستخدام هذا الكود هو ${formatPrice(c.min_order)}.`, { field: "coupon" });
  }
  return c as {
    id: number; code: string; description_ar: string; type: "percent" | "fixed"; value: number; max_discount: number | null;
  };
}

/**
 * Prices a cart entirely from database values. Client-supplied prices are never trusted;
 * the client only sends ids, quantities and notes.
 */
export async function priceCart(
  db: Db,
  lines: CartLineInput[],
  couponCode: string | null | undefined,
  settings: Settings,
  opts: { lockCoupon?: boolean } = {},
): Promise<Pricing> {
  if (!lines.length) throw new ApiError(400, "السلة فارغة.");
  const totalQty = lines.reduce((a, l) => a + l.quantity, 0);
  if (totalQty > settings.ordering.maxItemsPerOrder) {
    throw new ApiError(400, `الحد الأقصى لعدد الأصناف في الطلب الواحد هو ${settings.ordering.maxItemsPerOrder}.`);
  }
  const itemIds = [...new Set(lines.map((l) => l.itemId))];
  // Sequential on purpose: `db` may be a single transaction client.
  const items = await db.query(
    `SELECT i.*, c.active AS cat_active FROM menu_items i JOIN categories c ON c.id=i.category_id WHERE i.id = ANY($1)`,
    [itemIds],
  );
  const variants = await db.query(`SELECT * FROM item_variants WHERE item_id = ANY($1) ORDER BY sort, id`, [itemIds]);
  const addons = await db.query(`SELECT * FROM add_ons WHERE item_id = ANY($1)`, [itemIds]);

  const priced: PricedLine[] = [];
  lines.forEach((l, index) => {
    const item = items.rows.find((r: any) => r.id === l.itemId);
    if (!item) throw new ApiError(400, "أحد الأصناف لم يعد موجودًا في القائمة.", { lineIndex: index });
    if (!item.available || !item.cat_active) {
      throw new ApiError(400, `الصنف «${item.name_ar}» غير متاح حاليًا.`, { lineIndex: index });
    }
    const itemVariants = variants.rows.filter((v: any) => v.item_id === item.id);
    let variant: any = null;
    if (itemVariants.length) {
      variant = l.variantId ? itemVariants.find((v: any) => v.id === l.variantId) : itemVariants.find((v: any) => v.is_default) ?? itemVariants[0];
      if (!variant) throw new ApiError(400, `الحجم المختار للصنف «${item.name_ar}» غير متاح.`, { lineIndex: index });
    } else if (l.variantId) {
      throw new ApiError(400, `الحجم المختار للصنف «${item.name_ar}» غير متاح.`, { lineIndex: index });
    }
    const wanted = [...new Set(l.addonIds ?? [])];
    const chosen = wanted.map((aid) => {
      const a = addons.rows.find((r: any) => r.id === aid && r.item_id === item.id);
      if (!a || !a.available) throw new ApiError(400, `إحدى الإضافات المختارة للصنف «${item.name_ar}» غير متاحة.`, { lineIndex: index });
      return { id: a.id as number, name: a.name_ar as string, price: a.price as number };
    });
    const unitB = toBaisa(item.base_price) + (variant ? toBaisa(variant.price_delta) : 0) + chosen.reduce((s, a) => s + toBaisa(a.price), 0);
    priced.push({
      itemId: item.id,
      variantId: variant?.id ?? null,
      addonIds: chosen.map((a) => a.id),
      name: item.name_ar,
      variantName: variant?.name_ar ?? null,
      addons: chosen,
      unitPrice: fromBaisa(unitB),
      quantity: l.quantity,
      lineTotal: fromBaisa(unitB * l.quantity),
      notes: l.notes ?? null,
      prepMinutes: item.prep_minutes,
    });
  });

  const subtotalB = priced.reduce((s, l) => s + toBaisa(l.unitPrice) * l.quantity, 0);
  let discountB = 0;
  let coupon: CouponInfo | null = null;
  if (couponCode && couponCode.trim()) {
    const c = await validateCoupon(db, couponCode, subtotalB, !!opts.lockCoupon);
    discountB = couponDiscountBaisa(c, subtotalB);
    coupon = { id: c.id, code: c.code, description: c.description_ar };
  }
  const t = computeTotals(subtotalB, discountB, settings.finance);

  const o = settings.ordering;
  const prepMinutes =
    o.basePrepMinutes + Math.max(...priced.map((l) => l.prepMinutes)) + Math.min(30, Math.max(0, totalQty - 1) * o.extraPerItemMinutes);

  return {
    lines: priced,
    subtotal: fromBaisa(subtotalB),
    discount: fromBaisa(discountB),
    fee: fromBaisa(t.fee),
    tax: fromBaisa(t.tax),
    total: fromBaisa(t.total),
    vatIncluded: settings.finance.vatIncluded,
    prepMinutes,
    coupon,
  };
}
