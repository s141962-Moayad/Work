import { z } from "zod";
import { handler, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { saveSettingsGroup, SETTINGS_KEYS, type SettingsKey } from "@/lib/settings";
import { settingsSchemas } from "@/lib/settings-schemas";

const schema = z.object({ group: z.enum(SETTINGS_KEYS as [SettingsKey, ...SettingsKey[]]), value: z.unknown() });

export const PUT = handler({ auth: "admin", schema }, async ({ body, user, ip }) => {
  const parsed = settingsSchemas[body.group].safeParse(body.value);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "";
    throw new ApiError(400, /[؀-ۿ]/.test(msg) ? msg : "قيم الإعدادات غير صحيحة.", { field: parsed.error.issues[0]?.path.join(".") });
  }
  await saveSettingsGroup(body.group, parsed.data as any);
  await audit(user, "settings.update", "settings", body.group, { group: body.group }, ip);
  return { saved: true };
});
