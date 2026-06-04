const fs = require('fs');
const path = require('path');

// CP-1256 translation map builder
const charToByteMap = new Map();
// Simple raw windows-1256 decode logic for Node
const cp1256Bytes = [
  0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
  0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
  0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
  0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
  0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF,
  0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF,
  0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xCB, 0xEC, 0xED, 0xEE, 0xEF,
  0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF
];

// Recreate TextDecoder for windows-1256 manually to be robust in all node environments
const cp1256Chars = "€ ‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ ¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ءآأؤإئابةتثجحخدذرزسشصضطظعغـفقكلمنهويًٌٍَُِْ";
const arabicMapping = [
  "ء", "آ", "أ", "ؤ", "إ", "ئ", "ا", "ب", "ة", "ت", "ث", "ج", "ح", "خ", "د", "ذ",
  "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ـ", "ف", "ق", "ك", "ل", "م",
  "ن", "ه", "و", "ى", "ي", "ً", "ٌ", "ٍ", "َ", "ُ", "ِ", "ّ", "ْ"
];

const cp1256ToUtf8Map = new Map();
// Set up CP-1256 to Arabic character map based on standard mapping
const cp1256Table = {
  0xC1: "ء", 0xC2: "آ", 0xC3: "أ", 0xC4: "ؤ", 0xC5: "إ", 0xC6: "ئ", 0xC7: "ا", 0xC8: "ب",
  0xC9: "ة", 0xCA: "ت", 0xCB: "ث", 0xCC: "ج", 0xCD: "ح", 0xCE: "خ", 0xCF: "د", 0xD0: "ذ",
  0xD1: "ر", 0xD2: "ز", 0xD3: "س", 0xD4: "ش", 0xD5: "ص", 0xD6: "ض", 0x60: "`", 0xD7: "ط",
  0xD8: "ظ", 0xD9: "ع", 0xDA: "غ", 0xE0: "ـ", 0xE1: "ف", 0xE2: "ق", 0xE3: "ك", 0xE4: "ل",
  0xE5: "م", 0xE6: "ن", 0xE7: "ه", 0xE8: "و", 0xE9: "ى", 0xEA: "ي",
  0xF0: "ً", 0xF1: "ٌ", 0xF2: "ٍ", 0xF3: "َ", 0xF5: "ُ", 0xF6: "ِ", 0xFA: "ّ", 0xFC: "ْ"
};

// Populate decoding map dynamically
const decoder = new TextDecoder("windows-1256");
for (let i = 0x80; i <= 0xFF; i++) {
  try {
    const char = decoder.decode(new Uint8Array([i]));
    charToByteMap.set(char, i);
  } catch (e) {}
}

function hasCP1256Mojibake(str) {
  if (typeof str !== "string") return false;
  const patterns = [
    'ط§', 'ط¨', 'طھ', 'ط«', 'ط¬', 'ط­', 'ط®', 'ط¯', 'ط°', 'ط±', 'ط²', 'ط³', 'ط´', 'طµ', 'ط¶', 'ط·', 'ط¸', 'ط¹',
    'ط؛', 'ظ„', 'ظ…', 'ظ†', 'ظ‡', 'ظˆ', 'ظa', 'ط©', 'ط£', 'ط¥', 'طآ', 'ط¤', 'ط¦', 'ظ‰', 'ط،', 'ظٹ', 'ظy'
  ];
  return patterns.some(p => str.includes(p));
}

function healMojibake(str) {
  if (!str || !hasCP1256Mojibake(str)) return str;
  try {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const code = char.charCodeAt(0);
      if (code < 128) {
        bytes.push(code);
      } else {
        const byteVal = charToByteMap.get(char);
        if (byteVal !== undefined) {
          bytes.push(byteVal);
        } else {
          bytes.push(code & 0xFF);
        }
      }
    }
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  } catch {
    return str;
  }
}

function healRecursive(obj) {
  if (typeof obj === "string") {
    return healMojibake(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(healRecursive);
  }
  if (obj !== null && typeof obj === "object") {
    const copy = {};
    for (const key of Object.keys(obj)) {
      copy[key] = healRecursive(obj[key]);
    }
    return copy;
  }
  return obj;
}

// 1. Heal local-store.json
const localStorePath = path.resolve(__dirname, '..', 'artifacts', 'api-server', 'data', 'local-store.json');
if (fs.existsSync(localStorePath)) {
  console.log("Healing local-store.json...");
  try {
    const content = fs.readFileSync(localStorePath, "utf8");
    const parsed = JSON.parse(content);
    const healed = healRecursive(parsed);
    fs.writeFileSync(localStorePath, JSON.stringify(healed, null, 2), "utf8");
    console.log("Successfully healed local-store.json!");
  } catch (err) {
    console.error("Failed to heal local-store.json:", err);
  }
}

// 2. Heal mock-app.ts static arrays and smart AI response
const mockAppPath = path.resolve(__dirname, '..', 'artifacts', 'api-server', 'src', 'mock-app.ts');
if (fs.existsSync(mockAppPath)) {
  console.log("Healing mock-app.ts...");
  try {
    let content = fs.readFileSync(mockAppPath, "utf8");

    // Clean syntax corruption if any leftover
    content = content.replace(/\}§[^\n]*\n\s*\}/g, '}');

    // Replace the entire getSmartAIResponse with the clean UTF-8 Arabic version
    const getSmartAIResponseStart = content.indexOf("function getSmartAIResponse(");
    if (getSmartAIResponseStart !== -1) {
      const nextRouteIndex = content.indexOf('app.post("/api/support/tickets"', getSmartAIResponseStart);
      if (nextRouteIndex !== -1) {
        const cleanAIResponse = `function getSmartAIResponse(title: string, message: string): string {
  let cleanMessage = message;
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
      cleanMessage = parsed.text;
    }
  } catch {}

  const text = (title + " " + cleanMessage).toLowerCase();
  
  // Normalize Arabic letters to handle variations and remove Levantine slang differences
  const normalize = (str: string) => {
    return str
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ًٌٍَُِّّْ]/g, "") // strip diacritics
      .replace(/هسا|هسه/g, "الان")
      .replace(/بدي|ابغي|ابي/g, "اريد")
      .replace(/ايش|شو/g, "ماذا")
      .replace(/شلون|كيفاش/g, "كيف")
      .replace(/قديش|بكم/g, "كم")
      .replace(/[.,\\/#!$%\\^&\\*;:{}=\\-_\`~()?؟]/g, "") // strip punctuation
      .replace(/\\s+/g, " ")
      .trim();
  };
  
  const normText = normalize(text);

  const topics = [
    {
      keywords: ["موبايل ليجند", "ليجندز", "روبلوكس", "روبوكس", "robux", "roblox", "mlbb", "weekly diamond pass"],
      response: "نوفر شحن ألماس موبايل ليجيندز (MLBB) فورياً عبر إدخال رقم الحساب (User ID) ورقم الخادم (Zone ID)، بما في ذلك العضوية الأسبوعية المميزة (Weekly Diamond Pass). كما نوفر شحن روبوكس روبلوكس (Robux) فورياً وآمناً بمجرد إدخال اسم المستخدم الخاص بك في Roblox."
    },
    {
      keywords: ["بطاقات", "كرت", "ستيم", "جوجل بلاي", "بلايستيشن", "اكس بوكس", "steam", "google play", "playstation", "xbox", "gift card", "كود"],
      response: "نوفر أكواد شحن وبطاقات هدايا رقمية عالمية وأمريكية وعربية لمختلف المنصات:\\n- بطاقات ستيم (Steam) أمريكي وتركي لتعبئة حسابك بالأكواد يدوياً.\\n- بطاقات جوجل بلاي (Google Play) أمريكي وسعودي.\\n- بطاقات بلايستيشن (PlayStation Network PSN) أمريكي.\\n- بطاقات إكس بوكس (Xbox Live) أمريكي.\\nيصلك الكود مباشرة لتفعيله بيدك."
    },
    {
      keywords: ["شات جي بي تي", "chatgpt", "شاهد", "netflix", "نتفلكس", "نتفليكس", "يوتيوب بريميوم", "youtube", "premium", "iptv", "اشتراك", "حساب جاهز", "باسورد"],
      response: "الاشتراكات المميزة مثل ChatGPT Plus، شاهد VIP، نتفليكس Premium، يوتيوب بريميوم، وIPTV يتم تفعيلها وتجهيزها يدوياً بواسطة الإدارة. بعد طلب الخدمة وإتمام الدفع من محفظتك، سيظهر الطلب للإدارة لتنفيذه وإرسال الحساب أو التفعيل إليك.\\n\\n🔒 نصيحة أمان: يرجى تغيير كلمة مرور حسابك بعد انتهاء الأدمن من التفعيل وتأكيد اكتمال طلبك للحفاظ على سرية حساباتك بالكامل."
    },
    {
      keywords: ["رتب", "رتبة", "رتبتي", "برونزي", "فضي", "ذهبي", "بلاتيني", "دايموند", "اسطوري", "نيقا", "emerald", "glow", "زمردي", "الشريط"],
      response: "تعتمد الرتب في متجر جروف بالكامل على تجميع النقاط:\\n- برونزي (Bronze): 0 نقطة.\\n- فضي (Silver): 500 نقطة.\\n- ذهبي (Gold): 1500 نقطة.\\n- بلاتيني (Platinum): 4000 نقطة.\\n- دايموند (Diamond): 10000 نقطة.\\n- أسطوري (Legend): 25000 نقطة.\\n- رتبة نيقا (Niga) السرية والمميزة: 50000 نقطة.\\n\\n👑 رتبة نيقا هي رتبة سرية بميزات خاصة تظهر عند الوصول إليها."
    },
    {
      keywords: ["نقاط", "النقاط", "جمع نقاط", "ليش ما انضافت", "استبدل", "مكافاة", "جوائز", "مكافآت"],
      response: "تمنح النقاط تلقائياً بعد اكتمال الطلب بنجاح (وليس عند إنشاء الطلب وهو قيد المراجعة). النظام مصمم بمنح 10 نقاط لكل 1.5 د.أ تقريباً من الطلبات المكتملة. بمجرد أن يقوم الأدمن بتحديث حالة طلبك إلى 'مكتمل'، ستضاف النقاط فوراً إلى رصيد نقاطك لتتمكن من استبدالها بجوائز مجانية من صفحة النقاط والرتب."
    },
    {
      keywords: ["توثيق", "وثق", "شارة توثيق", "حساب موثق", "هوية", "سيلفي", "الهوية", "شارة خضراء"],
      response: "التوثيق يمنحك شارة توثيق خضراء فاخرة بجانب اسمك لزيادة الموثوقية والأمان في المتجر وسوق الحسابات. لطلب التوثيق، اذهب لصفحة 'التوثيق'، أدخل اسمك ورقم جوالك، وارفع صور الهوية (من الأمام والخلف) وصورة سيلفي واضحة وأنت تحمل الهوية بجانب وجهك. سيراجع الأدمن البيانات ويوثق حسابك قريباً."
    },
    {
      keywords: ["بيع حساب", "سوق الحسابات", "اعرض حسابي", "شراء حساب", "بيع حسابي", "سوق الحساب"],
      response: "سوق الحسابات هو بيئة آمنة تتيح لك عرض حسابات ألعابك للبيع أو شراء حسابات موثقة ومضمونة. لعرض حسابك للبيع، اذهب إلى صفحة 'بيع حساب'، أدخل تفاصيل الحساب ومواصفاته كاملة والسعر المطلوب بالدينار الأردني، وارفع صوراً واضحة للحساب. سيقوم الأدمن بمراجعة الحساب وعرضه للجميع فور الموافقة."
    },
    {
      keywords: ["ثائر", "السلامين", "وادي موسى", "صاحب المتجر", "مؤسس الموقع", "من صمم", "الادمن الرئيسي"],
      response: "مؤسس وصاحب متجر Grove Street بالكامل هو الشاب ثائر محمد السلامين، يبلغ من العمر 18 عاماً، من الأردن وتحديداً من مدينة وادي موسى الأثرية (البتراء). يقوم بإدارة المتجر والإشراف على معالجة الطلبات، التوثيق، شحن المحفظة، ودعم العملاء يدوياً بالكامل مع فريق العمل المساعد."
    }
  ];

  for (const t of topics) {
    for (const kw of t.keywords) {
      if (normText.includes(normalize(kw.toLowerCase()))) {
        return t.response;
      }
    }
  }

  return "";
}

`;
        content = content.substring(0, getSmartAIResponseStart) + cleanAIResponse + content.substring(nextRouteIndex);
      }
    }

    // Now, decode all remaining quotes in mock-app.ts to ensure absolutely no Mojibake remains
    const quoteRegex = /(["'])(.*?)\1/g;
    let healedContent = content.replace(quoteRegex, (match, quote, str) => {
      if (hasCP1256Mojibake(str)) {
        const decoded = healMojibake(str);
        console.log(`Decoded mock-app.ts literal: ${str} -> ${decoded}`);
        return `${quote}${decoded}${quote}`;
      }
      return match;
    });

    fs.writeFileSync(mockAppPath, healedContent, "utf8");
    console.log("Successfully healed mock-app.ts file literals!");
  } catch (err) {
    console.error("Failed to heal mock-app.ts file literals:", err);
  }
}
