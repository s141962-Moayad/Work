"use client";
import { useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/misc";

export function ImageUpload({ value, onChange, label = "الصورة" }: { value: string | null; onChange: (url: string | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "فشل رفع الصورة.");
      onChange(json.data.url);
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-paper text-3xl ring-1 ring-ink/10">
          {value ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt="" className="size-full object-cover" /> : "🖼️"}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-outline btn-sm" onClick={() => ref.current?.click()} disabled={busy}>{busy ? <Spinner /> : "⬆️"} رفع صورة</button>
          {value && <button type="button" className="btn-ghost btn-sm !text-red-600" onClick={() => onChange(null)}>إزالة</button>}
        </div>
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <p className="hint">PNG أو JPG أو WebP — حتى ٤ ميغابايت.</p>
    </div>
  );
}
