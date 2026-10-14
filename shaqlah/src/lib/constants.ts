// Client-safe constants (no server imports).

export const ORDER_STATUSES = ["pending", "accepted", "preparing", "ready", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_AR: Record<OrderStatus, string> = {
  pending: "بانتظار التأكيد",
  accepted: "تم قبول الطلب",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  delivered: "تم التسليم",
  cancelled: "تم إلغاء الطلب",
};

/** Order progress shown on the tracking page (cancelled is handled separately). */
export const ORDER_FLOW: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "delivered"];

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-sky-100 text-sky-800",
  preparing: "bg-orange-100 text-orange-800",
  ready: "bg-emerald-100 text-emerald-800",
  delivered: "bg-stone-200 text-stone-700",
  cancelled: "bg-red-100 text-red-700",
};

export const RESERVATION_STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_STATUS_AR: Record<ReservationStatus, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "تم تأكيد الحجز",
  completed: "اكتمل الحجز",
  cancelled: "تم إلغاء الحجز",
  no_show: "لم يحضر العميل",
};

export const RESERVATION_STATUS_TONE: Record<ReservationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-stone-200 text-stone-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-purple-100 text-purple-700",
};

export const PAYMENT_STATUS_AR: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "بانتظار الدفع",
  paid: "مدفوع",
  failed: "فشلت عملية الدفع",
  cancelled: "ملغاة",
  refunded: "تم الاسترداد",
  partially_refunded: "استرداد جزئي",
};

export const PAYMENT_METHOD_AR: Record<string, string> = {
  cash: "الدفع عند الاستلام",
  card: "بطاقة مصرفية",
  apple_pay: "Apple Pay",
};

export const AREA_AR: Record<string, string> = {
  any: "لا يهم",
  indoor: "جلسة داخلية",
  outdoor: "جلسة خارجية",
};

export const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const ALLERGENS_AR: Record<string, string> = {
  gluten: "الغلوتين",
  dairy: "الألبان",
  eggs: "البيض",
  nuts: "المكسرات",
  peanuts: "الفول السوداني",
  soy: "الصويا",
  fish: "الأسماك",
  shellfish: "القشريات",
  sesame: "السمسم",
  mustard: "الخردل",
};

export const ROLE_AR: Record<string, string> = { customer: "عميل", staff: "موظف", admin: "مدير" };

export const SESSION_COOKIE = "shq_session";
export const TZ_OFFSET_MIN = 240; // Asia/Muscat, UTC+4, no DST
export const TZ_NAME = "Asia/Muscat";
export const CURRENCY_AR = "ر.ع";
