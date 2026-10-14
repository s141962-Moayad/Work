import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
import { getSettings } from "@/lib/settings";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "سياسة الحجوزات" };

export default async function ReservationPolicy() {
  const r = (await getSettings()).reservations;
  return (
    <PolicyPage
      title="سياسة الحجوزات"
      sections={[
        { h: "الحجز والتأكيد", items: [r.autoConfirm ? "يُؤكَّد الحجز فورًا عند توفر طاولة مناسبة." : "يصل حجزك بحالة «بانتظار التأكيد» ثم يؤكده المطعم ويصلك إشعار.", `يمكن الحجز قبل الموعد بـ ${formatNumber(Math.round(r.minLeadMinutes / 60 * 10) / 10)} ساعة على الأقل وحتى ${formatNumber(r.maxDaysAhead)} يومًا مقدمًا.`, "تُخصَّص الطاولة تلقائيًا حسب عدد الأشخاص ونوع الجلسة المفضّل."] },
        { h: "مدة الجلوس", p: `مدة الحجز الواحد ${formatNumber(r.durationMinutes)} دقيقة تقريبًا، ويمكن للمطعم تمديدها حسب التوفر.` },
        { h: "التعديل والإلغاء", items: [`يمكن تعديل أو إلغاء الحجز من صفحته قبل الموعد بـ ${formatNumber(r.modifyCutoffHours)} ساعات على الأقل.`, "عند تعديل حجز مؤكد يعود إلى حالة «بانتظار التأكيد» ما لم يكن التأكيد التلقائي مفعّلًا.", "لتعديل حجز قريب من موعده تواصل معنا مباشرة."] },
        { h: "التأخر وعدم الحضور", p: "نحتفظ بالطاولة مدة قصيرة بعد الموعد، وبعدها قد تُسجَّل الحالة «لم يحضر العميل» وتُتاح الطاولة لغيرك. نرجو إبلاغنا عند التأخر." },
        { h: "المجموعات الكبيرة", p: "للمجموعات التي يزيد عددها عن سعة أكبر طاولة، أو للمناسبات الخاصة، يرجى التواصل معنا لترتيب حجز مخصص." },
      ]}
    />
  );
}
