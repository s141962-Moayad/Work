import { getSiteContext } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteProvider } from "@/components/site-provider";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { settings, user, favorites } = await getSiteContext();
  const u = user ? { name: user.name, role: user.role } : null;
  return (
    <SiteProvider user={u} favorites={favorites}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:bg-white focus:p-3">تخطَّ إلى المحتوى</a>
      <SiteHeader name={settings.general.name} logo={settings.general.logo} user={u} />
      <main id="main" className="min-h-[60dvh]">{children}</main>
      <SiteFooter settings={settings} />
    </SiteProvider>
  );
}
