import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "الأسئلة الشائعة" };

export default async function FaqPage() {
  const s = await getSettings();
  const faqs: [string, string][] = [
    ["كيف أطلب من شقلح؟", "تصفّح قائمة الطعام، اختر الوجبات والحجم والإضافات، ثم أضفها إلى السلة وأكمل الطلب باختيار موعد الاستلام وطريقة الدفع."],
    ["هل يمكنني تحديد وقت استلام الطلب؟", `نعم. يمكنك اختيار «في أقرب وقت ممكن» ليحسب النظام أقرب موعد حسب وقت التحضير وضغط المطبخ، أو «تحديد موعد الاستلام» لاختيار اليوم والوقت المناسبين خلال ${s.ordering.maxDaysAhead} أيام قادمة.`],
    ["هل تتوفر خدمة التوصيل؟", "الخدمة الحالية هي الاستلام من المطعم في الموعد الذي تحدده. سنعلن في حال إضافة خدمة التوصيل."],
    ["ما طرق الدفع المتاحة؟", "الدفع عند الاستلام، وكذلك الدفع الإلكتروني بالبطاقة المصرفية أو Apple Pay عند تفعيلهما من المطعم. لا نخزّن بيانات بطاقتك إطلاقًا؛ تتم المعالجة لدى مزوّد الدفع."],
    ["كيف أتتبع طلبي؟", "بعد تأكيد الطلب ستصلك صفحة تتبّع تتحدّث لحظيًا. يمكنك العودة إليها من «طلباتي» بإدخال رقم الطلب ورقم الهاتف، أو بتسجيل الدخول إلى حسابك."],
    ["هل يمكنني إلغاء أو تعديل طلبي؟", `يمكن إلغاء الطلب قبل بدء التحضير، وقبل موعد الاستلام بـ ${s.ordering.customerCancelCutoffMinutes} دقيقة على الأقل. للتعديل تواصل معنا مباشرة. التفاصيل في سياسة إلغاء الطلبات.`],
    ["كيف أحجز طاولة؟", "من صفحة «احجز طاولتك» اختر عدد الأشخاص ونوع الجلسة والتاريخ والوقت المتاح. سنؤكد الحجز ونُشعرك."],
    ["هل أحتاج إلى حساب؟", "لا، يمكنك الطلب والحجز كضيف. إنشاء حساب يتيح لك حفظ بياناتك ومتابعة سجل طلباتك وحجوزاتك وأطباقك المفضلة وإعادة الطلب بسرعة."],
    ["ماذا عن الحساسية الغذائية؟", "نوضّح مسببات الحساسية المعروفة لكل طبق في صفحته. إن كانت لديك حساسية شديدة أخبرنا في ملاحظات الطلب أو تواصل معنا قبل الطلب."],
    ["هل الأسعار شاملة الضريبة؟", s.finance.vatPercent > 0 ? (s.finance.vatIncluded ? `نعم، الأسعار المعروضة شاملة ضريبة القيمة المضافة (${s.finance.vatPercent}٪) ويظهر مقدارها في ملخص الطلب.` : `تُضاف ضريبة القيمة المضافة (${s.finance.vatPercent}٪) في ملخص الطلب.`) : "تظهر كافة الرسوم والضرائب إن وُجدت في ملخص الطلب قبل التأكيد."],
  ];
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-black sm:text-4xl">الأسئلة الشائعة</h1>
      <div className="mt-8 space-y-3">
        {faqs.map(([q, a]) => (
          <details key={q} className="card group p-5 open:shadow-lift">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold">{q}<span className="text-brand transition group-open:rotate-45" aria-hidden>＋</span></summary>
            <p className="mt-3 leading-8 text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-center text-ink-muted">لم تجد إجابتك؟ <Link href="/contact" className="font-bold text-brand underline">تواصل معنا</Link></p>
    </div>
  );
}
