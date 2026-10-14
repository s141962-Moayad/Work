import Link from "next/link";
import { BrandMark } from "@/components/brand";

export function NotFoundView() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
      <BrandMark size={72} />
      <p className="text-7xl font-black text-brand">٤٠٤</p>
      <h1 className="text-2xl font-black">عذرًا، الصفحة غير موجودة</h1>
      <p className="max-w-md text-ink-muted">ربما تم نقل الصفحة أو أن الرابط غير صحيح. يمكنك العودة إلى الرئيسية أو تصفّح قائمة الطعام.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">الرئيسية</Link>
        <Link href="/menu" className="btn-outline">قائمة الطعام</Link>
        <Link href="/reservations" className="btn-outline">احجز طاولة</Link>
      </div>
    </div>
  );
}
