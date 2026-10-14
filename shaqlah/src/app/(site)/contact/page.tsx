import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "@/components/contact-form";
import { LocationSection } from "@/components/location";

export const metadata: Metadata = { title: "تواصل معنا" };

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-black sm:text-4xl">تواصل معنا</h1>
      <p className="mt-2 text-ink-muted">يسعدنا سماع ملاحظاتك واستفساراتك. أرسل لنا رسالة وسنرد عليك.</p>
      <div className="mt-8 max-w-2xl"><ContactForm /></div>
      <LocationSection settings={s} className="mt-14" />
    </div>
  );
}
