"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { toast } from "@/components/ui/toast";
import { formatDateTime, formatPhone } from "@/lib/utils";

export function MessagesList({ messages }: { messages: { id: number; name: string; phone: string | null; email: string | null; message: string; handled: boolean; created_at: string }[] }) {
  const router = useRouter();
  if (!messages.length) return <p className="card p-10 text-center text-ink-muted">لا توجد رسائل.</p>;
  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <article key={m.id} className={`card space-y-2 p-5 ${m.handled ? "opacity-70" : "border-s-4 border-brand"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <b>{m.name}</b>
            <span className="text-xs text-ink-muted">{formatDateTime(m.created_at)}</span>
          </div>
          <p className="whitespace-pre-line leading-7">{m.message}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {m.phone && <a className="font-bold text-brand" href={`tel:+968${m.phone}`}><bdi className="ltr">{formatPhone(m.phone)}</bdi></a>}
            {m.email && <a className="font-bold text-brand" href={`mailto:${m.email}`}><bdi className="ltr">{m.email}</bdi></a>}
            <button className="btn-outline btn-sm ms-auto" onClick={async () => { await api(`/api/admin/messages/${m.id}`, { method: "PATCH", body: { handled: !m.handled } }).catch((e) => toast(e.message, "err")); router.refresh(); }}>{m.handled ? "إعادة فتح" : "✔ تمت المعالجة"}</button>
          </div>
        </article>
      ))}
    </div>
  );
}
