import type { DayHours, Settings } from "./settings";
import { addDays, formatHHMM, hhmmToMin, muscatDate, muscatDayStart, weekdayOf } from "./utils";

/** Opening window for a business day, in minutes since that day's midnight (end may exceed 1440). */
export function openingWindow(date: string, settings: Pick<Settings, "hours">): { start: number; end: number } | null {
  const h: DayHours | undefined = settings.hours[weekdayOf(date)];
  if (!h || h.closed) return null;
  const start = hhmmToMin(h.open);
  let end = hhmmToMin(h.close);
  if (end <= start) end += 1440;
  return { start, end };
}

export interface OpenStatus {
  open: boolean;
  text: string;
}

export function getOpenStatus(settings: Pick<Settings, "hours">, now = new Date()): OpenStatus {
  const today = muscatDate(now);
  // today's window, or yesterday's if it runs past midnight
  for (const d of [addDays(today, -1), today]) {
    const w = openingWindow(d, settings);
    if (!w) continue;
    const day0 = muscatDayStart(d).getTime();
    const s = day0 + w.start * 60_000;
    const e = day0 + w.end * 60_000;
    if (now.getTime() >= s && now.getTime() < e) {
      const h = settings.hours[weekdayOf(d)];
      return { open: true, text: `مفتوح الآن حتى ${formatHHMM(h.close)}` };
    }
  }
  for (let i = 0; i < 8; i++) {
    const d = addDays(today, i);
    const w = openingWindow(d, settings);
    if (!w) continue;
    const start = muscatDayStart(d).getTime() + w.start * 60_000;
    if (start > now.getTime()) {
      const h = settings.hours[weekdayOf(d)];
      return { open: false, text: `مغلق الآن — نفتح ${i === 0 ? "اليوم" : i === 1 ? "غدًا" : "قريبًا"} الساعة ${formatHHMM(h.open)}` };
    }
  }
  return { open: false, text: "مغلق حاليًا" };
}
