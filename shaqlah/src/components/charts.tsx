import { cn } from "@/lib/utils";

export interface BarDatum { label: string; value: number; display: string; tip: string }

/** Single-series column chart: thin rounded-top bars, recessive grid, native tooltips, text alternative via <table>. */
export function BarChart({ data, ariaLabel, height = 180 }: { data: BarDatum[]; ariaLabel: string; height?: number }) {
  const max = Math.max(1e-9, ...data.map((d) => d.value));
  const W = 600, padB = 26, padT = 10;
  const slot = W / Math.max(1, data.length);
  const bw = Math.min(26, slot * 0.55);
  const H = height;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel} direction="ltr">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={W} y1={padT + (H - padT - padB) * (1 - t)} y2={padT + (H - padT - padB) * (1 - t)} stroke="currentColor" strokeOpacity={0.08} />
        ))}
        <line x1={0} x2={W} y1={H - padB} y2={H - padB} stroke="currentColor" strokeOpacity={0.2} />
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 3 : 0, ((H - padT - padB) * d.value) / max);
          const x = W - (i + 0.5) * slot - bw / 2; // oldest on the right: timeline reads right→left
          const up = Math.max(0, h - 4);
          return (
            <g key={d.label + i} className="group">
              <rect x={W - (i + 1) * slot} y={0} width={slot} height={H - padB} fill="transparent"><title>{d.tip}</title></rect>
              <path d={`M${x},${H - padB} v${-up} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${up} z`} fill="#FF6B00" className="transition group-hover:fill-[#d95a00]" />
              <text x={W - (i + 0.5) * slot} y={H - 8} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity={0.65}>{d.label}</text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only"><caption>{ariaLabel}</caption><tbody>{data.map((d) => <tr key={d.label}><th>{d.label}</th><td>{d.display}</td></tr>)}</tbody></table>
    </div>
  );
}

export function HBars({ data, ariaLabel }: { data: { label: string; value: number; display: string }[]; ariaLabel: string }) {
  const max = Math.max(1e-9, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3" aria-label={ariaLabel}>
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-bold">{d.label}</span><span className="tabular-nums text-ink-muted">{d.display}</span></div>
          <div className="h-2.5 rounded-full bg-ink/5"><div className={cn("h-full rounded-full bg-brand")} style={{ width: `${Math.max(3, (d.value / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
