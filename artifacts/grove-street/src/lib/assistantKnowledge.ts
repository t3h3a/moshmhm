export interface KnowledgeItem {
  keywords: string[];
  responseAr: string;
  responseEn: string;
  escalate?: boolean;
}

export const KNOWLEDGE_BASE: Record<string, KnowledgeItem> = {
  greetings: {
    keywords: [
      "السلام عليكم", "سلام عليكم", "وعليكم السلام", "سلام", "مرحبا", "هلا", "اهلا", "أهلا", "اهلين", "هاي",
      "كيفك", "كيف الحال", "شو اخبارك", "يعطيك العافية", "صباح الخير", "مساء الخير",
      "hi", "hello", "hey", "salam", "how are you",
    ],
    responseAr: "وعليكم السلام ورحمة الله وبركاته. أهلاً بك في Grove Street، أنا مساعد GC الذكي. أقدر أساعدك في الشحن، المحفظة، الطلبات، النقاط، الرتب، التوثيق، سوق الحسابات، والدعم.",
    responseEn: "Welcome to Grove Street. I can help with top-ups, wallet balance, orders, points, ranks, verification, marketplace, and support.",
  },
  about: {
    keywords: [
      "شو هذا الموقع", "ما هو grove street", "ايش بعمل الموقع", "شو بتبيعوا", "عن الموقع", "شرح الموقع", "ما هي الصفحات",
      "what is grove street", "what does this website do", "about site", "pages",
    ],
    responseAr: "Grove Street متجر رقمي عربي لشحن الألعاب والخدمات الرقمية. داخل الموقع تجد الصفحة الرئيسية، الشحن، بطاقات الهدايا، تفعيلات الألعاب، الإنشاء، العروض، سوق الحسابات، السياسات، الملف الشخصي، المحفظة، طلباتي، النقاط والرتب، التوثيق، الدعم، الأمان، والإعدادات. كل شيء مبني حول فكرة بسيطة: تشحن محفظتك، تختار الخدمة، تدخل بياناتك بدقة، ثم تتابع الطلب من صفحة طلباتي.",
    responseEn: "Grove Street is an Arabic digital store for game top-ups and digital services. Main areas include home, top-ups, gift cards, activations, offers, marketplace, wallet, orders, points and ranks, verification, support, security, and settings.",
  },
  owner: {
    keywords: [
      "مين صاحب الموقع", "مين عامل الموقع", "مين صمم", "من صاحب المتجر", "الإدارة", "ادارة الموقع", "ثائر", "السلامين",
      "owner", "founder", "who made", "who owns",
    ],
    responseAr: "صاحب ومؤسس متجر Grove Street هو ثائر محمد السلامين من الأردن، وتحديداً من وادي موسى. الإدارة تتابع الطلبات، الإيداعات، التوثيق، الدعم، والعروض لضمان أن تجربة المستخدم تكون واضحة وسريعة.",
    responseEn: "Grove Street was founded by Thaer Mohammad Al-Salameen from Wadi Musa, Jordan. The team handles orders, wallet deposits, verification, offers, and support.",
  },
  register_login: {
    keywords: [
      "تسجيل", "تسجيل دخول", "انشاء حساب", "أنشئ حساب", "بريد", "كلمة سر", "نسيت كلمة المرور", "حسابي", "ادخل",
      "login", "register", "create account", "email", "password", "forgot password",
    ],
    responseAr: "تقدر تنشئ حساب من زر إنشاء حساب جديد باستخدام بريدك وكلمة المرور وبياناتك الأساسية. بعد الدخول يظهر لك حسابك في الشريط الجانبي، وتقدر تستخدم المحفظة، الطلبات، التوثيق، الدعم، النقاط، والإعدادات. إذا نسيت كلمة المرور استخدم صفحة نسيت كلمة المرور أو افتح تذكرة دعم إذا احتجت مساعدة.",
    responseEn: "Create an account with your email and password, then log in to access wallet, orders, verification, support, points, and settings. Use Forgot Password or contact support if needed.",
  },
  wallet: {
    keywords: [
      "محفظة", "رصيد", "اشحن محفظتي", "كيف اشحن", "شحن رصيد", "اورنج", "orange money", "إيداع", "دفع", "اثبات الدفع", "رقم العملية", "0791517855", "رصيدي", "بدي اعبي",
      "wallet", "balance", "top up", "deposit", "receipt", "transaction",
    ],
    responseAr: "لشحن محفظتك بالدينار الأردني، حوّل المبلغ عبر Orange Money الأردن إلى رقم الإدارة: 0791517855. بعدها افتح صفحة المحفظة، أدخل المبلغ، واكتب رقم العملية أو ارفع صورة إثبات الدفع. عند مراجعة الإيداع والموافقة عليه ينضاف الرصيد لمحفظتك وتقدر تشتري منه مباشرة.",
    responseEn: "To top up your wallet, transfer through Orange Money Jordan to 0791517855, then submit the amount and transaction number or receipt on the Wallet page. After review, the balance is added to your wallet.",
  },
  purchase: {
    keywords: [
      "كيف اشتري", "كيف اطلب", "شراء", "طلب", "اشحن لعبة", "ادخل ايدي", "player id", "user id", "zone id", "طريقة الشراء", "بدي اشتري", "بدي اشحن",
      "buy", "purchase", "order", "how to order", "game top up",
    ],
    responseAr: "طريقة الشراء: اختر اللعبة أو الخدمة، افتح الباقة المناسبة، أدخل البيانات المطلوبة بدقة مثل Player ID أو السيرفر أو اسم الحساب، ثم ادفع من رصيد المحفظة. بعد الدفع يظهر الطلب في صفحة طلباتي، وهناك تقدر تشوف حالته وملاحظات الإدارة إذا وجدت.",
    responseEn: "Choose the game or service, select a package, enter the required details accurately, and pay from your wallet. Track the order status from My Orders.",
  },
  fulfillment: {
    keywords: [
      "فوري", "يدوي", "مراجعة", "ليش الطلب مطول", "متى يوصل", "سرعة التفعيل", "اشتراك يدوي", "تفعيل يدوي",
      "instant", "manual", "review", "delayed", "activation",
    ],
    responseAr: "بعض الخدمات تكون فورية عندما تحتاج فقط إلى معرف اللاعب أو اسم الحساب. خدمات أخرى تحتاج مراجعة وتنفيذ يدوي مثل الاشتراكات أو الخدمات التي تحتاج بيانات حساب، لذلك قد تأخذ وقتاً أكثر. تابع الحالة من صفحة طلباتي، وإذا تأخر الطلب افتح تذكرة دعم.",
    responseEn: "Some services are instant when they only require a player ID or username. Other subscriptions or account-based services require manual review and may take longer. Track status from My Orders.",
  },
  orders: {
    keywords: [
      "حالة الطلب", "طلبي وين", "طلباتي", "قيد المراجعة", "قيد التنفيذ", "مكتمل", "مرفوض", "مسترد", "تأخر الطلب", "وين طلبي",
      "order status", "my order", "pending", "processing", "completed", "rejected", "refunded",
    ],
    responseAr: "حالات الطلب في صفحة طلباتي: قيد المراجعة يعني بانتظار الفحص، قيد التنفيذ يعني تتم معالجة الطلب، مكتمل يعني تم التسليم، مرفوض يعني البيانات غير مناسبة أو الطلب لم يقبل، ومسترد يعني رجع المبلغ للمحفظة. إذا عندك طلب متأخر افتح تذكرة دعم مع رقم الطلب.",
    responseEn: "Order statuses: Pending is under review, Processing is being handled, Completed means delivered, Rejected means not accepted, and Refunded means balance returned to your wallet.",
  },
  services: {
    keywords: [
      "فري فاير", "ببجي", "موبايل ليجندز", "كول اوف ديوتي", "روبلوكس", "ستيم", "جوجل بلاي", "بلايستيشن", "اكس بوكس", "بطاقات", "اشتراكات", "نتفليكس", "يوتيوب", "شاهد", "chatgpt", "iptv", "شدات", "جواهر", "روبوكس",
      "free fire", "pubg", "mobile legends", "cod", "roblox", "steam", "google play", "playstation", "xbox", "netflix", "youtube", "shahid",
    ],
    responseAr: "الخدمات تشمل شحن فري فاير، ببجي، موبايل ليجندز، كول أوف ديوتي، روبلوكس، بطاقات ستيم وجوجل بلاي وبلايستيشن وإكس بوكس، إضافة إلى اشتراكات رقمية مثل ChatGPT وNetflix وYouTube Premium وShahid وIPTV حسب المتاح داخل صفحة الشحن أو بطاقات الهدايا أو التفعيلات.",
    responseEn: "Services include Free Fire, PUBG, Mobile Legends, COD, Roblox, Steam, Google Play, PlayStation, Xbox gift cards, and subscriptions like ChatGPT, Netflix, YouTube Premium, Shahid, and IPTV when available.",
  },
  points: {
    keywords: [
      "نقاط", "كم نقطة", "كيف اجمع نقاط", "مكافآت", "استبدال النقاط", "نقاطي", "ليش ما انضافت",
      "points", "earn points", "rewards", "redeem",
    ],
    responseAr: "النقاط تنضاف بعد اكتمال الطلب بنجاح، وليس عند إنشاء الطلب. تقدر تتابع نقاطك من صفحة النقاط والرتب، وتستبدلها بمكافآت متاحة عندما يكون رصيد النقاط كافياً. إذا لم تنضف النقاط بعد اكتمال الطلب، افتح تذكرة دعم مع رقم الطلب.",
    responseEn: "Points are added after successful order completion. Track and redeem them from Points and Ranks. Contact support if points are missing after completion.",
  },
  ranks: {
    keywords: [
      "رتبة", "رتبتي", "برونزي", "فضي", "ذهبي", "بلاتيني", "دايموند", "أسطوري", "نيقا", "كيف ارفع رتبتي", "توهج", "شارة",
      "rank", "bronze", "silver", "gold", "platinum", "diamond", "legend",
    ],
    responseAr: "نظام الرتب يعتمد على النقاط: برونزي من 0 نقطة، فضي من 500، ذهبي من 1500، بلاتيني من 3000، دايموند من 5000، أسطوري من 10000، ورتبة نيقا من 999999 نقطة. الرتبة تظهر في حسابك وتزيد تميزك داخل المتجر.",
    responseEn: "Ranks depend on points from completed orders: Bronze 0, Silver 500, Gold 1500, Platinum 4000, Diamond 10000, Legend 30000, and Niga 50000 points. Some high-rank benefits stay private until unlocked.",
  },
  marketplace: {
    keywords: [
      "بيع حساب", "اشتري حساب", "سوق الحسابات", "اعرض حسابي", "حساب للبيع", "كيف ابيع", "حساب ببجي", "حساب فري فاير",
      "sell account", "buy account", "marketplace", "gaming account",
    ],
    responseAr: "سوق الحسابات يسمح بعرض حسابات الألعاب للبيع أو شراء حسابات معروضة. لبيع حسابك افتح صفحة بيع حساب، أضف بيانات الحساب، السعر، الصور، والملاحظات. بعد المراجعة والموافقة يظهر الحساب في السوق. لا تشارك بيانات حساسة خارج نموذج البيع أو الدعم.",
    responseEn: "The marketplace lets users list and buy gaming accounts. To sell, fill account details, price, screenshots, and notes. The listing appears after review and approval.",
  },
  verification: {
    keywords: [
      "توثيق", "وثق حسابي", "شارة التوثيق", "حساب موثق", "توثيق الهوية", "صور الهوية", "سيلفي", "كيف اوثق",
      "verification", "verify account", "verified badge", "id photo", "selfie",
    ],
    responseAr: "التوثيق يعطي حسابك موثوقية أعلى وشارة مميزة. من صفحة التوثيق أدخل اسمك ورقم الهاتف، وارفع صورة الهوية من الأمام، صورة الهوية من الخلف، وصورة سيلفي واضحة مع الهوية. الإدارة تراجع الطلب وتقبل أو ترفض مع توضيح السبب عند الحاجة.",
    responseEn: "Verification adds trust and a verified badge. Submit name, phone, front/back ID photos, and a selfie with ID. The team reviews and approves or rejects with notes.",
  },
  support: {
    keywords: [
      "دعم", "مشكلة", "مساعدة", "بدي احكي مع شخص", "اكلم الادمن", "شكوى", "تذكرة", "تواصل", "طلبي مطول", "رقم الادمن",
      "support", "help", "problem", "ticket", "complaint", "contact admin", "human support",
    ],
    responseAr: "إذا احتجت مساعدة بشرية افتح صفحة الدعم وأنشئ تذكرة جديدة بعنوان واضح ورسالة فيها التفاصيل ورقم الطلب إن وجد. المساعد يحاول يساعدك أولاً، وإذا احتاج الموضوع مراجعة سيتم تحويله لفريق الدعم.",
    responseEn: "For human help, open Support and create a ticket with clear details and order number if available. The assistant can also escalate unresolved issues.",
  },
  offers: {
    keywords: [
      "عروض", "اعلانات", "خصومات", "عرض اليوم", "كوبون", "كود خصم",
      "offers", "ads", "discount", "coupon",
    ],
    responseAr: "العروض والإعلانات تظهر في الصفحة الرئيسية وصفحة العروض. هناك تجد الخصومات، عروض الشحن، الباقات المميزة، وأي تنبيهات مهمة من الإدارة.",
    responseEn: "Offers and announcements appear on the home and offers pages, including discounts, bundles, and important notices.",
  },
  policies: {
    keywords: [
      "سياسة", "سياسات", "استرجاع", "خصوصية", "قوانين", "شروط", "الغاء الطلب",
      "policy", "policies", "refund", "privacy", "terms",
    ],
    responseAr: "صفحة السياسات توضح قواعد الاستخدام، الخصوصية، الاسترجاع، التعامل مع الطلبات، ومسؤولية إدخال البيانات. اقرأها قبل الشراء خصوصاً عند إدخال Player ID أو بيانات الحساب.",
    responseEn: "Policies explain usage rules, privacy, refunds, order handling, and the importance of entering correct details before purchase.",
  },
  fallback: {
    keywords: [],
    responseAr: "أقدر أساعدك في شحن المحفظة، شراء الخدمات، متابعة الطلبات، النقاط والرتب، التوثيق، سوق الحسابات، العروض، السياسات، أو فتح تذكرة دعم. اكتب سؤالك بطريقة ثانية أو اختر موضوعاً من هذه المواضيع.",
    responseEn: "I can help with wallet top-ups, purchases, orders, points, ranks, verification, marketplace, offers, policies, or support. Please rephrase or choose one of these topics.",
  },
};
