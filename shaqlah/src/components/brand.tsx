import { cn, formatPrice } from "@/lib/utils";

export function BrandMark({ size = 40, logo }: { size?: number; logo?: string | null }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" width={size} height={size} className="rounded-xl object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden role="img">
      <rect width="64" height="64" rx="18" fill="#151515" />
      <rect x="20" y="55" width="24" height="3.5" rx="1.75" fill="#D9A441" />
      <text x="30" y="45" textAnchor="middle" fontSize="40" fontWeight="900" fill="#FF6B00" fontFamily="Cairo Variable, Cairo, sans-serif">
        ش
      </text>
    </svg>
  );
}

export function Price({ value, className, old }: { value: number; className?: string; old?: boolean }) {
  return (
    <bdi className={cn("whitespace-nowrap tabular-nums", old && "text-ink-muted line-through decoration-red-400/70", className)}>{formatPrice(value)}</bdi>
  );
}

const GRADIENTS = [
  "from-brand to-gold",
  "from-ink to-ink-soft",
  "from-gold to-brand",
  "from-brand-dark to-brand",
  "from-ink-soft to-brand-dark",
];

/** Dish photo, or a branded placeholder tile when no photo has been uploaded yet. */
export function FoodImage({ src, icon, alt, seed = 0, className }: { src?: string | null; icon: string; alt: string; seed?: number; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" decoding="async" className={cn("size-full object-cover", className)} />;
  }
  return (
    <div className={cn("relative flex size-full items-center justify-center bg-gradient-to-br", GRADIENTS[seed % GRADIENTS.length], className)} role="img" aria-label={alt}>
      <span className="pattern-dots absolute inset-0" aria-hidden />
      <span className="relative text-5xl drop-shadow-lg sm:text-6xl">{icon}</span>
    </div>
  );
}
