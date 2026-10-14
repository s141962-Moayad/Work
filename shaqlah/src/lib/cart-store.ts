"use client";
import { useSyncExternalStore } from "react";

export interface CartLine {
  key: string; // unique per item+variant+addons+notes
  itemId: number;
  name: string;
  image: string | null;
  icon: string;
  variantId: number | null;
  variantName: string | null;
  addons: { id: number; name: string; price: number }[];
  unitPrice: number; // display estimate only – the server recalculates
  quantity: number;
  notes: string;
}

const KEY = "shq_cart_v1";
const EMPTY: CartLine[] = [];
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as CartLine[]) : EMPTY;
    if (!Array.isArray(cache)) cache = EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}
function write(lines: CartLine[]) {
  cache = lines.length ? lines : EMPTY;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {}
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export const lineKey = (l: Pick<CartLine, "itemId" | "variantId" | "addons" | "notes">) =>
  [l.itemId, l.variantId ?? 0, l.addons.map((a) => a.id).sort().join("."), l.notes.trim()].join("|");

export const cart = {
  add(line: Omit<CartLine, "key">) {
    const key = lineKey(line);
    const cur = read();
    const found = cur.find((l) => l.key === key);
    write(found ? cur.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l)) : [...cur, { ...line, key }]);
  },
  setQty(key: string, qty: number) {
    write(qty <= 0 ? read().filter((l) => l.key !== key) : read().map((l) => (l.key === key ? { ...l, quantity: Math.min(50, qty) } : l)));
  },
  update(key: string, patch: Partial<CartLine>) {
    write(read().map((l) => (l.key === key ? { ...l, ...patch } : l)));
  },
  remove(key: string) {
    write(read().filter((l) => l.key !== key));
  },
  clear() {
    write([]);
  },
  replaceAll(lines: Omit<CartLine, "key">[]) {
    write(lines.map((l) => ({ ...l, key: lineKey(l) })));
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
export const cartCount = (lines: CartLine[]) => lines.reduce((a, l) => a + l.quantity, 0);
export const cartEstimate = (lines: CartLine[]) => lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);

/* Guest order/reservation tokens remembered on this device so "طلباتي" can show them. */
const RECENT_KEY = "shq_recent_v1";
export interface RecentRef { kind: "order" | "reservation"; number: string; token: string; at: number }
export function rememberRef(ref: Omit<RecentRef, "at">) {
  try {
    const cur: RecentRef[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    const next = [{ ...ref, at: Date.now() }, ...cur.filter((r) => !(r.kind === ref.kind && r.number === ref.number))].slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}
export function recentRefs(kind: RecentRef["kind"]): RecentRef[] {
  try {
    return (JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as RecentRef[]).filter((r) => r.kind === kind);
  } catch {
    return [];
  }
}
