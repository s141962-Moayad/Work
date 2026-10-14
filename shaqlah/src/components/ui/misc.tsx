import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} aria-hidden />;
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="mt-1.5 text-sm font-semibold text-red-600">{children}</p>;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="hint block">{hint}</span>}
      <ErrorText>{error}</ErrorText>
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-ink/10 bg-white px-4 py-3 text-start">
      <span>
        <span className="block text-sm font-bold">{label}</span>
        {hint && <span className="hint block">{hint}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand" : "bg-ink/20")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "start-[22px]" : "start-0.5")} />
      </span>
    </button>
  );
}

export function EmptyState({ icon = "🍽️", title, children }: { icon?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="text-5xl">{icon}</div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      {children && <div className="text-sm text-ink-muted">{children}</div>}
    </div>
  );
}

export function StatusChip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cn("chip", tone)}>{children}</span>;
}
