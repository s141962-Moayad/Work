import { query } from "./db";
import { getSettings, type Settings } from "./settings";
import { getCurrentUser } from "./server-auth";
import type { SessionUser } from "./auth";

export interface SiteContext {
  settings: Settings;
  user: SessionUser | null;
  favorites: number[];
}

export async function getSiteContext(): Promise<SiteContext> {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const favorites = user ? (await query("SELECT item_id FROM favorites WHERE user_id=$1", [user.id])).map((r) => r.item_id as number) : [];
  return { settings, user, favorites };
}
