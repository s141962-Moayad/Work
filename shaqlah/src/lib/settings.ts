import { query } from "./db";

export interface DayHours {
  closed: boolean;
  open: string; // "HH:MM" — if close <= open the window runs past midnight
  close: string;
}

export interface Settings {
  general: {
    name: string;
    slogan: string;
    logo: string | null;
    heroImage: string | null;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    mapLat: string;
    mapLng: string;
    mapEmbedUrl: string;
    about: string;
  };
  social: { instagram: string; x: string; tiktok: string; snapchat: string; facebook: string; whatsapp: string };
  hours: DayHours[]; // index 0 = Sunday
  ordering: {
    enabled: boolean;
    autoAccept: boolean;
    basePrepMinutes: number;
    extraPerItemMinutes: number;
    slotIntervalMinutes: number;
    capacityPerSlot: number;
    maxDaysAhead: number;
    lastPickupBeforeCloseMinutes: number;
    customerCancelCutoffMinutes: number;
    onlinePaymentExpiryMinutes: number;
    maxItemsPerOrder: number;
  };
  finance: { vatPercent: number; vatIncluded: boolean; serviceFee: number };
  payments: { cash: boolean; card: boolean; applePay: boolean };
  reservations: {
    enabled: boolean;
    autoConfirm: boolean;
    durationMinutes: number;
    slotIntervalMinutes: number;
    minLeadMinutes: number;
    maxDaysAhead: number;
    lastSeatingBeforeCloseMinutes: number;
    modifyCutoffHours: number;
  };
  notifications: { email: boolean; sms: boolean; whatsapp: boolean };
}

const day = (open = "10:00", close = "23:00"): DayHours => ({ closed: false, open, close });

export const DEFAULT_SETTINGS: Settings = {
  general: {
    name: "شقلح",
    slogan: "شقلحها على مزاجك!",
    logo: null,
    heroImage: null,
    phone: "",
    whatsapp: "",
    email: "",
    address: "سلطنة عُمان",
    mapLat: "",
    mapLng: "",
    mapEmbedUrl: "",
    about:
      "شقلح مطعم متعدد المطابخ في سلطنة عُمان، نقدّم لكم تشكيلة واسعة من البرجر والبيتزا والشاورما والمشاوي والمأكولات العربية والعالمية والمأكولات البحرية والحلويات، بجودة عالية ونكهة تناسب كل مزاج.",
  },
  social: { instagram: "", x: "", tiktok: "", snapchat: "", facebook: "", whatsapp: "" },
  hours: [day(), day(), day(), day(), day(), day("13:00", "23:30"), day()],
  ordering: {
    enabled: true,
    autoAccept: false,
    basePrepMinutes: 5,
    extraPerItemMinutes: 1,
    slotIntervalMinutes: 15,
    capacityPerSlot: 6,
    maxDaysAhead: 7,
    lastPickupBeforeCloseMinutes: 15,
    customerCancelCutoffMinutes: 30,
    onlinePaymentExpiryMinutes: 30,
    maxItemsPerOrder: 40,
  },
  finance: { vatPercent: 5, vatIncluded: true, serviceFee: 0 },
  payments: { cash: true, card: true, applePay: false },
  reservations: {
    enabled: true,
    autoConfirm: false,
    durationMinutes: 90,
    slotIntervalMinutes: 30,
    minLeadMinutes: 60,
    maxDaysAhead: 30,
    lastSeatingBeforeCloseMinutes: 60,
    modifyCutoffHours: 2,
  },
  notifications: { email: true, sms: false, whatsapp: false },
};

export type SettingsKey = keyof Settings;
export const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingsKey[];

function merge<T>(base: T, over: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(over) ? over.map((o, i) => merge((base as any)[i] ?? (base as any)[0], o)) : base) as T;
  }
  if (base && typeof base === "object") {
    const out: any = { ...(base as any) };
    if (over && typeof over === "object") {
      for (const k of Object.keys(base as any)) {
        if (k in (over as any)) out[k] = merge((base as any)[k], (over as any)[k]);
      }
    }
    return out;
  }
  return (over === undefined || over === null ? base : (over as any)) as T;
}

let cache: { at: number; value: Settings } | null = null;
const TTL_MS = 3000;

export function invalidateSettings() {
  cache = null;
}

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const rows = await query<{ key: string; value: unknown }>("SELECT key, value FROM business_settings");
  const stored: Record<string, unknown> = {};
  for (const r of rows) stored[r.key] = r.value;
  const value = {} as Settings;
  for (const k of SETTINGS_KEYS) (value as any)[k] = merge((DEFAULT_SETTINGS as any)[k], stored[k]);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettingsGroup<K extends SettingsKey>(key: K, value: Settings[K]) {
  await query(
    `INSERT INTO business_settings(key, value, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
  invalidateSettings();
}

/** Which integrations have credentials in the environment (never exposes secrets). */
export function integrationStatus() {
  return {
    thawani: Boolean(process.env.THAWANI_SECRET_KEY && process.env.THAWANI_PUBLISHABLE_KEY),
    smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
    sms: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM),
    whatsapp: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TEMPLATE_NAME),
  };
}
