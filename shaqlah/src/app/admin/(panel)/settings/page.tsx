import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/server-auth";
import { getSettings, integrationStatus } from "@/lib/settings";
import { SettingsForm } from "@/components/settings-form";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function AdminSettings() {
  await requireAdminPage();
  const settings = await getSettings();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">إعدادات المطعم</h1>
      <SettingsForm initial={JSON.parse(JSON.stringify(settings))} integrations={integrationStatus()} />
    </div>
  );
}
