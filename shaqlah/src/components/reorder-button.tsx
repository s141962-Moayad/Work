"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { reorder } from "@/lib/reorder";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/misc";

export function ReorderButton({ number, token, className = "btn-outline btn-sm" }: { number: string; token?: string | null; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await reorder(number, token);
          if (!r.added) toast("الأصناف في هذا الطلب لم تعد متاحة حاليًا.", "err");
          else {
            if (r.skipped) toast(`تمت إضافة الأصناف المتاحة وتخطّي ${r.skipped} غير متاحة.`, "info");
            router.push("/cart");
          }
        } catch (e: any) {
          toast(e.message, "err");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Spinner /> : "🔁"} أعد الطلب
    </button>
  );
}
