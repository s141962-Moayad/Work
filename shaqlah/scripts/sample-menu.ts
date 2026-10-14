// SAMPLE DATA ONLY — names, descriptions and prices below are placeholders until the
// restaurant owner provides the real menu. Everything is editable in the admin dashboard.

export const SAMPLE_CATEGORIES = [
  { slug: "offers", name: "العروض الخاصة", icon: "🔥" },
  { slug: "burgers", name: "البرجر", icon: "🍔" },
  { slug: "pizza", name: "البيتزا", icon: "🍕" },
  { slug: "shawarma", name: "الشاورما", icon: "🌯" },
  { slug: "grills", name: "المشاوي", icon: "🍖" },
  { slug: "arabic", name: "المأكولات العربية", icon: "🥘" },
  { slug: "international", name: "المأكولات العالمية", icon: "🥩" },
  { slug: "rice", name: "الأرز والوجبات الرئيسية", icon: "🍛" },
  { slug: "pasta", name: "المعكرونة", icon: "🍝" },
  { slug: "seafood", name: "المأكولات البحرية", icon: "🦐" },
  { slug: "starters", name: "المقبلات", icon: "🧆" },
  { slug: "salads", name: "السلطات", icon: "🥗" },
  { slug: "desserts", name: "الحلويات", icon: "🍰" },
  { slug: "drinks", name: "العصائر والمشروبات", icon: "🥤" },
  { slug: "kids", name: "وجبات الأطفال", icon: "🧒" },
  { slug: "family", name: "الوجبات العائلية", icon: "👨‍👩‍👧‍👦" },
];

type Sample = {
  cat: string; name: string; desc: string; price: number; old?: number;
  featured?: boolean; best?: boolean; prep?: number; allergens?: string[];
  sizes?: [string, number][]; extras?: [string, number][];
};

const cheese: [string, number] = ["جبنة إضافية", 0.3];
const drinkSizes: [string, number][] = [["وسط", 0], ["كبير", 0.3]];

export const SAMPLE_ITEMS: Sample[] = [
  // offers
  { cat: "offers", name: "كومبو شقلح برجر", desc: "برجر لحم كلاسيكي مع بطاطس مقرمشة ومشروب غازي.", price: 3.5, old: 4.4, featured: true, best: true, allergens: ["gluten", "dairy", "sesame"] },
  { cat: "offers", name: "عرض بيتزا الاثنين", desc: "بيتزا وسط من اختيارك مع بيتزا مارجريتا صغيرة مجانًا.", price: 4.9, old: 6.2, allergens: ["gluten", "dairy"], prep: 18 },
  { cat: "offers", name: "وجبة شاورما مزدوجة", desc: "ساندويتشان شاورما دجاج مع بطاطس ومشروبين.", price: 3.2, old: 3.9, allergens: ["gluten", "dairy", "sesame"] },
  // burgers
  { cat: "burgers", name: "برجر لحم كلاسيكي", desc: "قطعة لحم بقري مشوية على الفحم مع الخس والطماطم والمخلل وصلصة شقلح الخاصة.", price: 2.5, featured: true, best: true, allergens: ["gluten", "dairy", "sesame", "mustard"], sizes: [["عادي", 0], ["دبل", 1.2]], extras: [cheese, ["بيض مقلي", 0.3], ["لحم مقدد", 0.5], ["هالبينو", 0.2]] },
  { cat: "burgers", name: "برجر دجاج مقرمش", desc: "صدر دجاج مقرمش مع الخس والمايونيز الحار في خبز بريوش.", price: 2.2, allergens: ["gluten", "eggs", "dairy"], sizes: [["عادي", 0], ["دبل", 1]], extras: [cheese, ["هالبينو", 0.2]] },
  { cat: "burgers", name: "برجر مشروم سويس", desc: "لحم بقري مع جبنة سويسرية وفطر سوتيه وصلصة الثوم.", price: 2.9, allergens: ["gluten", "dairy"], extras: [cheese, ["لحم مقدد", 0.5]] },
  { cat: "burgers", name: "برجر حار على الفحم", desc: "لحم متبّل بالبهارات الحارة مع جبنة بيبر جاك وصلصة سريراتشا.", price: 2.7, allergens: ["gluten", "dairy"], extras: [cheese] },
  // pizza
  { cat: "pizza", name: "بيتزا مارجريتا", desc: "صلصة طماطم إيطالية وجبنة موزاريلا وريحان طازج.", price: 2, featured: true, allergens: ["gluten", "dairy"], prep: 18, sizes: [["صغير", 0], ["وسط", 1.5], ["كبير", 3]], extras: [["جبنة إضافية", 0.5], ["زيتون", 0.3], ["فطر", 0.4]] },
  { cat: "pizza", name: "بيتزا بيبروني", desc: "شرائح بيبروني حارة على جبنة موزاريلا ذائبة.", price: 2.8, best: true, allergens: ["gluten", "dairy"], prep: 18, sizes: [["صغير", 0], ["وسط", 1.6], ["كبير", 3.2]], extras: [["جبنة إضافية", 0.5], ["هالبينو", 0.3]] },
  { cat: "pizza", name: "بيتزا دجاج باربكيو", desc: "دجاج متبّل مع صلصة الباربكيو والبصل وجبنة الموزاريلا.", price: 3, allergens: ["gluten", "dairy"], prep: 18, sizes: [["صغير", 0], ["وسط", 1.6], ["كبير", 3.2]], extras: [["جبنة إضافية", 0.5]] },
  { cat: "pizza", name: "بيتزا خضار", desc: "فلفل ملوّن وزيتون وفطر وذرة وطماطم طازجة.", price: 2.4, allergens: ["gluten", "dairy"], prep: 18, sizes: [["صغير", 0], ["وسط", 1.5], ["كبير", 3]] },
  { cat: "pizza", name: "بيتزا أربع أجبان", desc: "موزاريلا وشيدر وبارميزان وجبنة زرقاء.", price: 3.4, allergens: ["gluten", "dairy"], prep: 18, sizes: [["صغير", 0], ["وسط", 1.7], ["كبير", 3.4]] },
  // shawarma
  { cat: "shawarma", name: "شاورما دجاج", desc: "دجاج متبّل مع الثوم والمخلل في خبز صاج طازج.", price: 0.9, best: true, featured: true, prep: 8, allergens: ["gluten", "sesame"], sizes: [["عادي", 0], ["جامبو", 0.5]], extras: [["جبنة", 0.2], ["بطاطس داخل الساندويتش", 0.2]] },
  { cat: "shawarma", name: "شاورما لحم", desc: "لحم بقري مشوي على السيخ مع الطحينة والبقدونس والبصل.", price: 1.2, prep: 8, allergens: ["gluten", "sesame"], sizes: [["عادي", 0], ["جامبو", 0.6]] },
  { cat: "shawarma", name: "صحن شاورما دجاج", desc: "شاورما دجاج مع أرز وسلطة وثوم وبطاطس.", price: 2.2, prep: 12, allergens: ["dairy", "sesame"] },
  // grills
  { cat: "grills", name: "مشاكيك لحم", desc: "مكعبات لحم طرية مشوية على الفحم مع الخضار والأرز.", price: 3.8, featured: true, prep: 20, allergens: [] },
  { cat: "grills", name: "شيش طاووق", desc: "صدور دجاج متبّلة بالزبادي والليمون مشوية على الفحم.", price: 3.2, prep: 20, allergens: ["dairy"] },
  { cat: "grills", name: "كباب مشوي", desc: "كباب لحم مفروم بالبقدونس والبصل مع الطماطم المشوية.", price: 3.5, prep: 20, allergens: ["gluten"] },
  { cat: "grills", name: "مشاوي مشكّلة", desc: "تشكيلة من المشاكيك والشيش طاووق والكباب مع أرز ومقبلات.", price: 5.9, best: true, prep: 25, allergens: ["dairy"] },
  // arabic
  { cat: "arabic", name: "مسخّن دجاج", desc: "خبز طابون مع البصل والسماق وزيت الزيتون ودجاج مشوي.", price: 3.3, prep: 20, allergens: ["gluten", "nuts"] },
  { cat: "arabic", name: "مقلوبة لحم", desc: "أرز وباذنجان وقرنبيط ولحم، تُقلب أمامك مع اللبن.", price: 3.6, prep: 20, allergens: ["dairy", "nuts"] },
  { cat: "arabic", name: "فتّة حمص", desc: "حمص مسلوق مع خبز محمّص ولبن وصنوبر وسمن.", price: 2.4, prep: 12, allergens: ["gluten", "dairy", "nuts", "sesame"] },
  // international
  { cat: "international", name: "ستيك ريب آي", desc: "ستيك ٣٠٠ غ مع بطاطس مهروسة وخضار سوتيه وصلصة الفطر.", price: 7.9, prep: 25, allergens: ["dairy"] },
  { cat: "international", name: "دجاج بارميزان", desc: "صدر دجاج مقرمش بالبارميزان مع صلصة الطماطم وسباغيتي.", price: 4.2, prep: 20, allergens: ["gluten", "dairy", "eggs"] },
  { cat: "international", name: "تشيكن كاتسو", desc: "دجاج مقرمش على الطريقة اليابانية مع أرز وصلصة كاري.", price: 3.9, prep: 18, allergens: ["gluten", "eggs", "soy"] },
  // rice
  { cat: "rice", name: "كبسة دجاج", desc: "أرز بسمتي بالبهارات الخليجية مع دجاج طري وصلصة الدقوس.", price: 2.9, featured: true, best: true, prep: 15, allergens: ["nuts"], sizes: [["فردي", 0], ["نفرين", 2.2]] },
  { cat: "rice", name: "مندي لحم", desc: "لحم غنم مطهو ببطء في التنور مع أرز المندي.", price: 4.5, prep: 20, allergens: [], sizes: [["فردي", 0], ["نفرين", 3.8]] },
  { cat: "rice", name: "برياني دجاج", desc: "أرز مطبوخ مع دجاج متبّل وبطاطس وبيض مسلوق.", price: 2.6, prep: 15, allergens: ["eggs", "dairy"] },
  // pasta
  { cat: "pasta", name: "ألفريدو دجاج", desc: "فيتوتشيني بصلصة الكريمة والدجاج والفطر.", price: 3.1, best: true, prep: 15, allergens: ["gluten", "dairy"], extras: [["جبنة بارميزان", 0.4]] },
  { cat: "pasta", name: "بولونيز", desc: "سباغيتي بصلصة اللحم الإيطالية.", price: 2.9, prep: 15, allergens: ["gluten"] },
  { cat: "pasta", name: "بنّا أرابياتا", desc: "بنّا بصلصة طماطم حارة وثوم وريحان.", price: 2.5, prep: 15, allergens: ["gluten"] },
  // seafood
  { cat: "seafood", name: "جمبري مقلي", desc: "جمبري مقرمش مع صلصة التارتار والليمون.", price: 4.8, prep: 15, allergens: ["gluten", "shellfish", "eggs"] },
  { cat: "seafood", name: "سمك هامور مشوي", desc: "فيليه هامور طازج مشوي مع أرز وخضار على البخار.", price: 5.5, featured: true, prep: 22, allergens: ["fish"] },
  { cat: "seafood", name: "فيش آند تشيبس", desc: "سمك مقرمش مع بطاطس مقلية وصلصة التارتار.", price: 3.6, prep: 15, allergens: ["gluten", "fish", "eggs"] },
  // starters
  { cat: "starters", name: "حمص بالطحينة", desc: "حمص كريمي بزيت الزيتون والبابريكا.", price: 1, prep: 5, allergens: ["sesame"] },
  { cat: "starters", name: "بطاطس مقلية", desc: "بطاطس ذهبية مقرمشة مع الكاتشب.", price: 0.9, prep: 8, allergens: [], extras: [["جبنة شيدر ذائبة", 0.4]] },
  { cat: "starters", name: "أصابع الموزاريلا", desc: "ست قطع موزاريلا مقرمشة مع صلصة الطماطم.", price: 1.8, prep: 10, allergens: ["gluten", "dairy", "eggs"] },
  { cat: "starters", name: "سمبوسة جبن", desc: "أربع قطع سمبوسة مقرمشة محشوة بالجبن.", price: 1.2, prep: 8, allergens: ["gluten", "dairy"] },
  // salads
  { cat: "salads", name: "سلطة سيزر", desc: "خس روماني ودجاج مشوي وجبنة بارميزان وصلصة السيزر.", price: 2.3, prep: 8, allergens: ["gluten", "dairy", "eggs", "fish"] },
  { cat: "salads", name: "فتوش", desc: "خضار طازجة مع خبز مقرمش ودبس الرمان.", price: 1.6, prep: 6, allergens: ["gluten"] },
  { cat: "salads", name: "تبولة", desc: "بقدونس وبرغل وطماطم وليمون.", price: 1.5, prep: 6, allergens: ["gluten"] },
  // desserts
  { cat: "desserts", name: "كنافة بالجبن", desc: "كنافة ناعمة بالجبنة الحلوة والقطر.", price: 1.9, featured: true, prep: 8, allergens: ["gluten", "dairy", "nuts"] },
  { cat: "desserts", name: "حلوى عُمانية", desc: "حلوى عُمانية تقليدية بالهيل والزعفران وماء الورد.", price: 1.4, prep: 3, allergens: ["gluten", "nuts"] },
  { cat: "desserts", name: "تشيز كيك", desc: "شريحة تشيز كيك بصلصة التوت.", price: 1.8, prep: 3, allergens: ["gluten", "dairy", "eggs"] },
  { cat: "desserts", name: "براوني مع آيس كريم", desc: "براوني دافئ بالشوكولاتة مع كرة آيس كريم فانيلا.", price: 1.7, prep: 6, allergens: ["gluten", "dairy", "eggs", "nuts"] },
  // drinks
  { cat: "drinks", name: "عصير برتقال طازج", desc: "برتقال معصور عند الطلب.", price: 1.2, prep: 4, sizes: drinkSizes },
  { cat: "drinks", name: "ليمون بالنعناع", desc: "ليمون طازج مع النعناع والثلج المجروش.", price: 1.1, best: true, prep: 4, sizes: drinkSizes },
  { cat: "drinks", name: "كوكتيل فواكه", desc: "مزيج فواكه موسمية.", price: 1.5, prep: 5, sizes: drinkSizes },
  { cat: "drinks", name: "شاي كرك", desc: "شاي بالحليب والهيل على الطريقة الخليجية.", price: 0.4, prep: 3, allergens: ["dairy"] },
  { cat: "drinks", name: "قهوة عربية", desc: "قهوة عربية بالهيل تُقدّم مع التمر.", price: 0.5, prep: 3 },
  { cat: "drinks", name: "مشروب غازي", desc: "مشروب غازي بارد.", price: 0.4, prep: 1 },
  { cat: "drinks", name: "مياه معدنية", desc: "عبوة مياه معدنية.", price: 0.2, prep: 1 },
  // kids
  { cat: "kids", name: "وجبة برجر الأطفال", desc: "برجر صغير مع بطاطس وعصير.", price: 1.9, prep: 10, allergens: ["gluten", "dairy"] },
  { cat: "kids", name: "وجبة ناجتس", desc: "٥ قطع ناجتس دجاج مع بطاطس وعصير.", price: 1.8, prep: 10, allergens: ["gluten", "eggs"] },
  // family
  { cat: "family", name: "وجبة المشاوي العائلية", desc: "تشكيلة مشاوي تكفي ٤-٥ أشخاص مع أرز وسلطات ومقبلات.", price: 17.5, featured: true, prep: 30, allergens: ["dairy", "sesame"] },
  { cat: "family", name: "بوكس البيتزا العائلي", desc: "بيتزتان كبيرتان وبطاطس كبيرة و٤ مشروبات.", price: 11.5, prep: 25, allergens: ["gluten", "dairy"] },
];
