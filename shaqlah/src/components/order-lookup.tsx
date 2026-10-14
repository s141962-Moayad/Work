"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Field, Spinner } from "@/components/ui/misc";
import { normalizePhone } from "@/lib/utils";
import { rememberRef } from "@/lib/cart-store";

/** Secure guest lookup: order/reservation number + phone. */
export function OrderLookup({ kind }: { kind: "order" | "reservation" }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isOrder = kind === "order";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!number.trim()) return setErr(isOrder ? "أدخل رقم الطلب." : "أدخل رقم الحجز.");
    if (!normalizePhone(phone)) return setErr("رقم الهاتف غير صحيح.");
    setBusy(true);
    try {
      const r = await api<{ number: string; token: string }>(isOrder ? "/api/orders/lookup" : "/api/reservations/lookup", { body: { number, phone } });
      rememberRef({ kind, number: r.number, token: r.token });
      router.push(`${isOrder ? "/orders" : "/reservations"}/${r.number}?k=${r.token}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-6 text-start" noValidate>
      <Field label={isOrder ? "رقم الطلب" : "رقم الحجز"}>
        <input className="input" dir="ltr" placeholder={isOrder ? "SHQ-1001" : "RSV-1001"} value={number} onChange={(e) => setNumber(e.target.value)} />
      </Field>
      <Field label="رقم الهاتف المستخدم">
        <input className="input" type="tel" inputMode="tel" dir="ltr" placeholder="9XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : "🔎"} {isOrder ? "تتبّع الطلب" : "عرض الحجز"}</button>
    </form>
  );
}
