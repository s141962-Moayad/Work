import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { Toaster } from "@/components/ui/toast";
import { PwaRegister } from "@/components/pwa";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = (await getSettings().catch(() => null))?.general;
  const name = s?.name ?? "شقلح";
  return {
    title: { default: `${name} — ${s?.slogan ?? "شقلحها على مزاجك!"}`, template: `%s | ${name}` },
    description: `${name} — اطلب وجبتك أونلاين، حدّد موعد الاستلام، واحجز طاولتك بسهولة.`,
    applicationName: name,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: name, statusBarStyle: "black-translucent" },
    icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#151515",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
