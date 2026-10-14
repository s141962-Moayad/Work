"use client";
import { useEffect, useState } from "react";

type Toast = { id: number; text: string; tone: "ok" | "err" | "info" };
let items: Toast[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function toast(text: string, tone: Toast["tone"] = "ok") {
  const t = { id: ++seq, text, tone };
  items = [...items, t].slice(-4);
  emit();
  setTimeout(() => {
    items = items.filter((x) => x.id !== t.id);
    emit();
  }, tone === "err" ? 6000 : 3500);
}

export function Toaster() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => {
    const s = () => setList(items);
    subs.add(s);
    return () => void subs.delete(s);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
      {list.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto max-w-md animate-pop rounded-2xl px-4 py-3 text-sm font-semibold shadow-lift ${
            t.tone === "err" ? "bg-red-600 text-white" : t.tone === "info" ? "bg-ink text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
