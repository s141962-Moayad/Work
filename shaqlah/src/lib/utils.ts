import { TZ_NAME, TZ_OFFSET_MIN, CURRENCY_AR } from "./constants";

/* ───────── money (baisa-exact: 1 OMR = 1000 baisa) ───────── */
export const toBaisa = (omr: number) => Math.round(omr * 1000);
export const fromBaisa = (b: number) => b / 1000;

/** Arabic-Indic digits by default (٠١٢…). Set NEXT_PUBLIC_DIGITS=latn to show 0123… instead. */
export const LOCALE = `ar-OM-u-nu-${process.env.NEXT_PUBLIC_DIGITS === "latn" ? "latn" : "arab"}`;
const ARAB = LOCALE;
const numFmt = new Intl.NumberFormat(ARAB, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const intFmt = new Intl.NumberFormat(ARAB);

/** "٥٫٥٠٠ ر.ع" */
export function formatPrice(omr: number): string {
  return `${numFmt.format(omr)} ${CURRENCY_AR}`;
}
export function formatNumber(n: number): string {
  return intFmt.format(n);
}

/* ───────── digits ───────── */
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXT_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";
export function toLatinDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EXT_ARABIC_INDIC.indexOf(d)));
}

/* ───────── phone (Oman) ───────── */
/** Returns the 8-digit national number, or null when invalid. Accepts +968 / 00968 / Arabic digits. */
export function normalizePhone(input: string): string | null {
  let d = toLatinDigits(input).replace(/[\s\-().]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("968") && d.length === 11) d = d.slice(3);
  return /^[279]\d{7}$/.test(d) ? d : null;
}
/** "9123 4567" with LTR formatting handled by the caller. */
export function formatPhone(p: string | null | undefined): string {
  if (!p) return "";
  return p.length === 8 ? `+968 ${p.slice(0, 4)} ${p.slice(4)}` : p;
}

/* ───────── dates (always Asia/Muscat) ───────── */
const OFFSET_MS = TZ_OFFSET_MIN * 60_000;

/** Shift a Date so UTC getters return Muscat wall-clock fields. */
function shifted(d: Date) {
  return new Date(d.getTime() + OFFSET_MS);
}
const p2 = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of the Muscat calendar day. */
export function muscatDate(d: Date): string {
  const s = shifted(d);
  return `${s.getUTCFullYear()}-${p2(s.getUTCMonth() + 1)}-${p2(s.getUTCDate())}`;
}
/** "HH:MM" Muscat wall-clock. */
export function muscatTime(d: Date): string {
  const s = shifted(d);
  return `${p2(s.getUTCHours())}:${p2(s.getUTCMinutes())}`;
}
/** Muscat midnight of a "YYYY-MM-DD" as an absolute Date. */
export function muscatDayStart(date: string): Date {
  return new Date(`${date}T00:00:00+04:00`);
}
export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** 0 = Sunday … 6 = Saturday for a "YYYY-MM-DD". */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
export function hhmmToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const dateTimeFmt = new Intl.DateTimeFormat(ARAB, {
  timeZone: TZ_NAME, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
});
const dateFmt = new Intl.DateTimeFormat(ARAB, { timeZone: TZ_NAME, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat(ARAB, { timeZone: TZ_NAME, day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat(ARAB, { timeZone: TZ_NAME, hour: "numeric", minute: "2-digit", hour12: true });

const toDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));
export const formatDateTime = (v: Date | string) => dateTimeFmt.format(toDate(v));
export const formatDate = (v: Date | string) => dateFmt.format(toDate(v));
export const formatShortDate = (v: Date | string) => shortDateFmt.format(toDate(v));
/** "٧:٣٠ م" */
export const formatTime = (v: Date | string) => timeFmt.format(toDate(v));
/** Label a "HH:MM" string (used for opening hours inputs). */
export function formatHHMM(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return timeFmt.format(new Date(Date.UTC(2000, 0, 1, h - TZ_OFFSET_MIN / 60, m)));
}

/** Relative day word for the pickup summary. */
export function relativeDayLabel(d: Date, now = new Date()): string {
  const diff = Math.round((muscatDayStart(muscatDate(d)).getTime() - muscatDayStart(muscatDate(now)).getTime()) / 86_400_000);
  if (diff === 0) return "اليوم";
  if (diff === 1) return "غدًا";
  return formatDate(d);
}

/* ───────── misc ───────── */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Strips control characters and collapses whitespace – used on free-text input. */
export function cleanText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‎‏‪-‮]/g, "").trim();
}

export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
