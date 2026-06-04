import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, ShoppingBag, TrendingUp, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GCCharacterShowcase } from "@/components/GCCharacterShowcase";
import { AD_IMAGES } from "@/lib/branding";
import { customFetch, useListAds, useListGames, useListActivity } from "@workspace/api-client-react";
import { getUser } from "@/lib/auth";
import { getLanguage } from "@/lib/language";

const MOCK_GAMES = [
  { id: 1, name: "Free Fire", nameAr: "فري فاير", imageUrl: "https://placehold.co/200x200/1a472a/ffffff?text=FF", color: "#1a472a" },
  { id: 2, name: "PUBG Mobile", nameAr: "ببجي موبايل", imageUrl: "https://placehold.co/200x200/1b3a5c/ffffff?text=PUBG", color: "#1b3a5c" },
  { id: 3, name: "Roblox", nameAr: "روبلوكس", imageUrl: "https://placehold.co/200x200/cc0000/ffffff?text=ROB", color: "#cc0000" },
  { id: 4, name: "FC Mobile", nameAr: "إف سي موبايل", imageUrl: "https://placehold.co/200x200/004c97/ffffff?text=FC", color: "#004c97" },
  { id: 5, name: "Minecraft", nameAr: "ماين كرافت", imageUrl: "https://placehold.co/200x200/5c4033/ffffff?text=MC", color: "#5c4033" },
  { id: 6, name: "Clash Royale", nameAr: "كلاش رويال", imageUrl: "https://placehold.co/200x200/2c4a7c/ffffff?text=CR", color: "#2c4a7c" },
  { id: 7, name: "Mobile Legends", nameAr: "موبايل ليجندز", imageUrl: "https://placehold.co/200x200/8b0000/ffffff?text=ML", color: "#8b0000" },
  { id: 8, name: "Genshin Impact", nameAr: "جينشن إمباكت", imageUrl: "https://placehold.co/200x200/1a237e/ffffff?text=GI", color: "#1a237e" },
];

const MOCK_PRODUCTS = [
  { id: 1, nameAr: "100 جوهرة فري فاير", price: 5, gameName: "Free Fire" },
  { id: 4, nameAr: "325 شدة ببجي", price: 29, gameName: "PUBG Mobile" },
  { id: 7, nameAr: "400 روبوكس", price: 16, gameName: "Roblox" },
  { id: 9, nameAr: "يوتيوب بريميوم شهر", price: 25, gameName: "" },
  { id: 10, nameAr: "نتفليكس شهر", price: 45, gameName: "" },
  { id: 13, nameAr: "1000 متابع إنستغرام", price: 35, gameName: "" },
  { id: 3, nameAr: "520 جوهرة فري فاير", price: 22, gameName: "Free Fire" },
  { id: 6, nameAr: "660 شدة ببجي", price: 55, gameName: "PUBG Mobile" },
];

const HOME_FEATURED_PRODUCTS = [
  { id: 5, nameAr: "عضوية فري فاير الأسبوعية", price: 2.1, gameName: "Free Fire" },
  { id: 23, nameAr: "رويال باس ببجي Elite", price: 9.99, gameName: "PUBG Mobile" },
  { id: 30, nameAr: "86 ألماس موبايل ليجندز", price: 1.6, gameName: "Mobile Legends" },
  { id: 50, nameAr: "بطاقة روبلوكس مميزة", price: 5, gameName: "Roblox" },
  { id: 60, nameAr: "بطاقة ستيم رقمية", price: 10, gameName: "Steam" },
  { id: 1040, nameAr: "يوتيوب بريميوم شهر", price: 2, gameName: "YouTube" },
  { id: 1020, nameAr: "شاهد VIP شهر", price: 5, gameName: "Shahid" },
  { id: 1010, nameAr: "ChatGPT Plus شهر", price: 15, gameName: "ChatGPT" },
];

const MOCK_ACTIVITY = [
  "أحمد اشترى 310 جوهرة فري فاير",
  "سارة شحنت 325 شدة ببجي",
  "محمد اشترى 1000 متابع إنستغرام",
  "ليان وصلت إلى رتبة دايموند",
  "ثائر استبدل 4000 نقطة بمكافأة",
  "خالد اشترى حساب ببجي مميز",
  "عمر شحن محفظته بنجاح",
  "نور اشترت عرض اليوم",
  "فهد وصل إلى رتبة ذهبي",
  "ريم اشترت 1000 روبوكس",
];

const RANKS = [
  { name: "Bronze", nameAr: "برونزي", icon: "III", min: 0, color: "#cd7f32" },
  { name: "Silver", nameAr: "فضي", icon: "II", min: 500, color: "#9ca3af" },
  { name: "Gold", nameAr: "ذهبي", icon: "I", min: 1500, color: "#fbbf24" },
  { name: "Platinum", nameAr: "بلاتيني", icon: "P", min: 4000, color: "#22d3ee" },
  { name: "Diamond", nameAr: "دايموند", icon: "D", min: 10000, color: "#60a5fa" },
  { name: "Legend", nameAr: "أسطوري", icon: "L", min: 30000, color: "#a855f7" },
  { name: "Niga", nameAr: "نيقا", icon: "/chargre-badge.png", min: 50000, color: "#22c55e" },
];

const MOCK_ADS = [
  { id: 1, titleAr: "تخفيضات ضخمة على فري فاير", descriptionAr: "احصل على ضعف الجواهر هذا الأسبوع", buttonTextAr: "تسوق الآن", linkUrl: "/games", bg: "linear-gradient(135deg, #1a472a 0%, #0a2a1a 100%)" },
  { id: 2, titleAr: "باس موسم ببجي الجديد", descriptionAr: "باقات الموسم الحصرية بأفضل الأسعار", buttonTextAr: "احصل عليه الآن", linkUrl: "/games", bg: "linear-gradient(135deg, #1b3a5c 0%, #0a1b30 100%)" },
  { id: 3, titleAr: "سوق الحسابات أصبح متاحاً", descriptionAr: "اشترِ وبع حسابات الألعاب بأمان تام", buttonTextAr: "استعرض الآن", linkUrl: "/marketplace", bg: "linear-gradient(135deg, #0a2a1a 0%, #0d3d1f 100%)" },
  { id: 4, titleAr: "اكسب نقاط واحصل على مكافآت", descriptionAr: "كل عملية شراء تكسبك نقاط للمكافآت المجانية", buttonTextAr: "اعرف المزيد", linkUrl: "/points", bg: "linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%)" },
];

function normalizeList<T>(value: unknown, keys: string[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  for (const key of ["data", "items", "results", "value", ...keys]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested as T[];
  }

  return [];
}

const CP1256_BYTES: Record<string, number> = {
  "€": 0x80, "پ": 0x81, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "ٹ": 0x8a, "‹": 0x8b, "Œ": 0x8c, "چ": 0x8d, "ژ": 0x8e, "ڈ": 0x8f,
  "گ": 0x90, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "ک": 0x98, "™": 0x99, "ڑ": 0x9a, "›": 0x9b, "œ": 0x9c, "ں": 0x9f, " ": 0xa0, "،": 0xa1,
  "¢": 0xa2, "£": 0xa3, "¤": 0xa4, "¥": 0xa5, "¦": 0xa6, "§": 0xa7, "¨": 0xa8, "©": 0xa9,
  "ھ": 0xaa, "«": 0xab, "¬": 0xac, "­": 0xad, "®": 0xae, "¯": 0xaf, "°": 0xb0, "±": 0xb1,
  "²": 0xb2, "³": 0xb3, "´": 0xb4, "µ": 0xb5, "¶": 0xb6, "·": 0xb7, "¸": 0xb8, "¹": 0xb9,
  "؛": 0xba, "»": 0xbb, "¼": 0xbc, "½": 0xbd, "¾": 0xbe, "؟": 0xbf, "ہ": 0xc0, "ء": 0xc1,
  "آ": 0xc2, "أ": 0xc3, "ؤ": 0xc4, "إ": 0xc5, "ئ": 0xc6, "ا": 0xc7, "ب": 0xc8, "ة": 0xc9,
  "ت": 0xca, "ث": 0xcb, "ج": 0xcc, "ح": 0xcd, "خ": 0xce, "د": 0xcf, "ذ": 0xd0, "ر": 0xd1,
  "ز": 0xd2, "س": 0xd3, "ش": 0xd4, "ص": 0xd5, "ض": 0xd6, "×": 0xd7, "ط": 0xd8, "ظ": 0xd9,
  "ع": 0xda, "غ": 0xdb, "ـ": 0xdc, "ف": 0xdd, "ق": 0xde, "ك": 0xdf, "à": 0xe0, "ل": 0xe1,
  "â": 0xe2, "م": 0xe3, "ن": 0xe4, "ه": 0xe5, "و": 0xe6, "ç": 0xe7, "è": 0xe8, "é": 0xe9,
  "ê": 0xea, "ë": 0xeb, "ى": 0xec, "ي": 0xed, "î": 0xee, "ï": 0xef, "ً": 0xf0, "ٌ": 0xf1,
  "ٍ": 0xf2, "َ": 0xf3, "ُ": 0xf4, "ِ": 0xf5, "ّ": 0xf6, "÷": 0xf7, "ø": 0xf8, "ù": 0xf9,
  "ْ": 0xfa, "û": 0xfb, "ü": 0xfc, "‎": 0xfd, "‏": 0xfe, "ے": 0xff,
};

function fixArabicText(value: unknown): string {
  if (typeof value !== "string") return "";
  const looksMojibake = /(?:ط§|ط£|ط¢|ط¥|ط¨|طھ|ط¬|ط­|ط®|ط¯|ط°|ط±|ط²|ط³|ط´|طµ|ط¶|ط¹|ط؛|ط©|ط،|طŒ|ظ„|ظ…|ظ†|ظ‡|ظˆ|ظٹ|ظƒ|ظ‚|ظپ|ظ‰|â€|âœ|ï)/.test(value);
  if (!looksMojibake) return value;

  try {
    const bytes = Array.from(value).map(char => char === " " ? 0x20 : (CP1256_BYTES[char] ?? char.charCodeAt(0)));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
    const cleaned = decoded.replace(/âœ…/g, "تم").replace(/â—‰/g, "").trim();
    return cleaned.includes("�") ? "" : cleaned;
  } catch {
    return value;
  }
}

function fallbackArabicName(name: string, nameAr: unknown): string {
  const fixed = fixArabicText(nameAr);
  if (fixed && !fixed.includes("�")) return fixed;

  const lower = name.toLowerCase();
  if (lower.includes("free fire")) return "فري فاير";
  if (lower.includes("pubg")) return "ببجي موبايل";
  if (lower.includes("roblox")) return "روبلوكس";
  if (lower.includes("minecraft")) return "ماين كرافت";
  if (lower.includes("steam")) return "بطاقات ستيم";
  if (lower.includes("google")) return "بطاقات جوجل بلاي";
  if (lower.includes("playstation")) return "بطاقات بلايستيشن";
  if (lower.includes("xbox")) return "بطاقات إكس بوكس";
  if (lower.includes("chatgpt")) return "ChatGPT";
  if (lower.includes("shahid")) return "شاهد VIP";
  if (lower.includes("netflix")) return "نتفليكس Premium";
  if (lower.includes("youtube")) return "يوتيوب بريميوم";
  if (lower.includes("mobile legends")) return "موبايل ليجندز";
  if (lower.includes("call of duty")) return "كول أوف ديوتي";
  return name;
}

function getServiceImage(name: string, imageUrl?: string) {
  if (imageUrl && !imageUrl.includes("placehold.co")) return imageUrl;
  const lower = name.toLowerCase();
  if (lower.includes("free fire")) return "/images/services/games/free-fire.png";
  if (lower.includes("pubg")) return "/images/services/games/pubg-mobile.png";
  if (lower.includes("roblox")) return "/images/services/games/roblox.png";
  if (lower.includes("mobile legends")) return "/images/services/games/mobile-legends.png";
  if (lower.includes("call of duty")) return "/images/services/games/call-of-duty-mobile.png";
  if (lower.includes("clash royale")) return "/images/services/games/clash-royale.png";
  if (lower.includes("steam")) return "/images/services/gift-cards/steam-gift-card.png";
  if (lower.includes("youtube")) return "/images/services/social/youtube.png";
  return imageUrl || "/images/logo/logo.png";
}

function AdCarousel({ ads }: { ads: typeof MOCK_ADS }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % ads.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [ads.length]);

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height: 280, perspective: "1000px" }}>
      {ads.map((ad, i) => (
        <motion.div
          key={ad.id}
          className="absolute inset-0 flex flex-col justify-center p-8"
          style={{ background: ad.bg }}
          initial={false}
          animate={{
            opacity: i === current ? 1 : 0,
            scale: i === current ? 1 : 0.95,
            rotateY: i === current ? 0 : (i < current ? -10 : 10),
            zIndex: i === current ? 10 : 0,
          }}
          transition={{ duration: 0.5 }}
        >
          {(ad as any).imageUrl && (
            <img src={(ad as any).imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" loading="lazy" />
          )}
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative max-w-lg">
            <h2 className="text-3xl font-black text-white mb-3">{ad.titleAr}</h2>
            <p className="text-white/70 mb-5 text-lg">{ad.descriptionAr}</p>
            <Link href={ad.linkUrl}>
              <Button className="bg-primary hover:bg-primary/90 font-bold px-6" data-testid={`button-ad-${ad.id}`}>
                {ad.buttonTextAr}
                <ArrowLeft size={16} className="mr-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      ))}

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
        {ads.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="w-2 h-2 rounded-full transition-all"
            style={{ background: i === current ? "hsl(142 70% 35%)" : "rgba(255,255,255,0.3)" }}
            data-testid={`button-ad-dot-${i}`}
          />
        ))}
      </div>

      <button
        onClick={() => setCurrent(prev => (prev - 1 + ads.length) % ads.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.4)" }}
        data-testid="button-ad-prev"
      >
        <ChevronRight size={18} className="text-white" />
      </button>
      <button
        onClick={() => setCurrent(prev => (prev + 1) % ads.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.4)" }}
        data-testid="button-ad-next"
      >
        <ChevronLeft size={18} className="text-white" />
      </button>
    </div>
  );
}

function Premium3DCard({ isFemale, name, phone }: { isFemale: boolean; name: string; phone: string }) {
  return (
    <div style={{ perspective: "1000px" }} className="w-full flex justify-center py-4">
      <motion.div
        className="relative w-72 h-44 rounded-2xl p-5 overflow-hidden border flex flex-col justify-between"
        style={{
          background: isFemale 
            ? "linear-gradient(135deg, rgba(219,39,119,0.3) 0%, rgba(139,92,246,0.15) 100%)"
            : "linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(20,83,45,0.15) 100%)",
          borderColor: isFemale ? "rgba(219,39,119,0.4)" : "rgba(34,197,94,0.4)",
          backdropFilter: "blur(12px)",
          boxShadow: isFemale 
            ? "0 15px 35px rgba(0,0,0,0.5), 0 0 20px rgba(219,39,119,0.2)"
            : "0 15px 35px rgba(0,0,0,0.5), 0 0 20px rgba(34,197,94,0.15)"
        }}
        whileHover={{ rotateY: 15, rotateX: -10, scale: 1.05 }}
        transition={{ type: "spring", stiffness: 150, damping: 15 }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl pointer-events-none" />
        
        <div className="flex justify-between items-start">
          <div className="flex flex-col items-start">
            <span className="text-[9px] text-white/50 uppercase tracking-widest">Grove Street Card</span>
            <div className="w-9 h-7 rounded bg-amber-400/80 border border-amber-300/30 mt-2 flex flex-col justify-around p-1">
              <div className="h-[1px] bg-black/30 w-full" />
              <div className="h-[1px] bg-black/30 w-full" />
            </div>
          </div>
          <span className="text-sm font-black italic text-white/80">VISA</span>
        </div>

        <div className="text-right">
          <p className="text-md font-mono font-black text-white tracking-widest leading-none mb-1 text-left">
            {phone.replace(/(\d{4})/g, "$1 ").trim()}
          </p>
          <div className="flex justify-between items-center text-[10px] text-white/70">
            <span className="font-bold">{name}</span>
            <span className="font-mono text-white/50">12/30</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Premium3DController({ isFemale }: { isFemale: boolean }) {
  return (
    <div style={{ perspective: "1000px" }} className="w-full flex justify-center py-4">
      <motion.div
        className="w-48 h-40 flex items-center justify-center relative"
        animate={{ rotateY: 360 }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
      >
        <svg viewBox="0 0 100 80" className="w-36 h-36 drop-shadow-lg" style={{ filter: isFemale ? "drop-shadow(0 8px 16px rgba(219,39,119,0.35))" : "drop-shadow(0 8px 16px rgba(34,197,94,0.25))" }}>
          <path
            d="M 15 25 C 20 15, 80 15, 85 25 C 92 40, 85 70, 75 75 C 68 78, 60 62, 50 62 C 40 62, 32 78, 25 75 C 15 70, 8 40, 15 25 Z"
            fill={isFemale ? "hsl(290 15% 10%)" : "hsl(0 0% 7%)"}
            stroke={isFemale ? "hsl(330 85% 65%)" : "hsl(142 70% 35%)"}
            strokeWidth="2.5"
          />
          <path d="M 12 35 Q 22 45 28 65" fill="none" stroke={isFemale ? "rgba(219,39,119,0.2)" : "rgba(34,197,94,0.2)"} strokeWidth="2" />
          <path d="M 88 35 Q 78 45 72 65" fill="none" stroke={isFemale ? "rgba(219,39,119,0.2)" : "rgba(34,197,94,0.2)"} strokeWidth="2" />
          
          <path d="M 24 35 H 32 V 43 H 24 Z" fill="rgba(255,255,255,0.05)" stroke="white" strokeWidth="1" />
          <path d="M 28 32 V 46" fill="none" stroke="white" strokeWidth="2.5" />
          <path d="M 21 39 H 35" fill="none" stroke="white" strokeWidth="2.5" />

          <circle cx="38" cy="50" r="7" fill="#111" stroke="gray" strokeWidth="1" />
          <circle cx="62" cy="50" r="7" fill="#111" stroke="gray" strokeWidth="1" />
          
          <circle cx="76" cy="32" r="2.5" fill={isFemale ? "hsl(330 85% 65%)" : "hsl(142 70% 35%)"} />
          <circle cx="68" cy="38" r="2.5" fill="rgba(255,255,255,0.8)" />
          <circle cx="84" cy="38" r="2.5" fill="rgba(255,255,255,0.8)" />
          <circle cx="76" cy="44" r="2.5" fill="rgba(255,255,255,0.8)" />

          <rect x="36" y="26" width="28" height="8" rx="2" fill="black" stroke={isFemale ? "hsl(330 85% 65%)" : "hsl(142 70% 35%)"} strokeWidth="1" />
          <text x="50" y="32" fontSize="3" fontWeight="bold" fill="white" textAnchor="middle">GROVE STREET</text>
        </svg>
      </motion.div>
    </div>
  );
}

function Premium3DTruck({ isFemale }: { isFemale: boolean }) {
  return (
    <div className="w-full overflow-hidden py-4 relative h-40 flex items-center justify-center bg-black/15 rounded-2xl border border-white/5">
      <motion.div
        className="flex items-center gap-1 absolute"
        style={{ right: "-120px" }}
        animate={{ right: ["-120px", "110%"] }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      >
        <svg viewBox="0 0 120 60" className="w-28 h-20">
          <rect x="10" y="15" width="65" height="30" rx="3" fill={isFemale ? "hsl(290 15% 15%)" : "hsl(0 0% 12%)"} stroke={isFemale ? "hsl(330 85% 65%)" : "hsl(142 70% 35%)"} strokeWidth="2" />
          
          <path d="M 75 25 L 90 25 L 100 35 L 100 45 L 75 45 Z" fill={isFemale ? "hsl(290 15% 10%)" : "hsl(0 0% 7%)"} stroke={isFemale ? "hsl(330 85% 65%)" : "hsl(142 70% 35%)"} strokeWidth="2" />
          <path d="M 85 28 L 92 28 L 97 34 L 85 34 Z" fill="cyan" opacity="0.6" />
          
          <circle cx="30" cy="46" r="7" fill="#111" stroke="gray" strokeWidth="2" />
          <circle cx="30" cy="46" r="2.5" fill="white" />
          
          <circle cx="85" cy="46" r="7" fill="#111" stroke="gray" strokeWidth="2" />
          <circle cx="85" cy="46" r="2.5" fill="white" />
          
          <text x="42" y="32" fontSize="5.5" fontWeight="bold" fill="white" textAnchor="middle">GROVE</text>
          <text x="42" y="38" fontSize="4.5" fontWeight="bold" fill={isFemale ? "hsl(330 85% 65%)" : "hsl(142 70% 35%)"} textAnchor="middle">DELIVERY</text>

          <line x1="-5" y1="20" x2="-25" y2="20" stroke={isFemale ? "rgba(219,39,119,0.3)" : "rgba(34,197,94,0.3)"} strokeWidth="1.5" />
          <line x1="-10" y1="30" x2="-35" y2="30" stroke={isFemale ? "rgba(219,39,119,0.3)" : "rgba(34,197,94,0.3)"} strokeWidth="1.5" />
          <line x1="-2" y1="40" x2="-20" y2="40" stroke={isFemale ? "rgba(219,39,119,0.3)" : "rgba(34,197,94,0.3)"} strokeWidth="1.5" />
        </svg>
      </motion.div>
    </div>
  );
}

export default function HomePage() {
  const lang = getLanguage();
  const [adminTicker, setAdminTicker] = useState<any>(null);
  const { data: adsData } = useListAds();
  const { data: gamesData } = useListGames();
  const { data: activityData } = useListActivity();

  const user = getUser();
  const isFemale = user?.gender === "female";

  useEffect(() => {
    let alive = true;
    customFetch<any>("/api/ticker", { responseType: "json" })
      .then((data) => {
        if (alive && data?.isActive && data?.text) setAdminTicker(data);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const getAdImage = (img: string | undefined, index: number) => {
    if (img) {
      if (isFemale) {
        if (img.includes("a3lan1.png")) return "/a3lan1g.png";
        if (img.includes("a3lan2.png")) return "/a3lan2g.png";
      }
      return img;
    }
    if (isFemale) {
      const girlAds = ["/a3lan1g.png", "/a3lan2g.png", "/images/ads/a3lan3.png"];
      return girlAds[index % girlAds.length];
    }
    return AD_IMAGES[index % AD_IMAGES.length];
  };

  const adsList = normalizeList<(typeof MOCK_ADS)[number]>(adsData, ["ads"]);
  const gamesList = normalizeList<(typeof MOCK_GAMES)[number]>(gamesData, ["games"]);
  const activityList = normalizeList<{ message?: string; messageAr?: string }>(activityData, ["activity"]);

  const ads = adsList.length > 0 ? adsList.map((a: any, i) => ({
    id: a.id,
    titleAr: lang === "en" ? fixArabicText(a.titleEn || a.title) : fixArabicText(a.titleAr || a.title),
    descriptionAr: lang === "en" ? fixArabicText(a.descriptionEn || a.description || "") : fixArabicText(a.descriptionAr || a.description || ""),
    buttonTextAr: lang === "en" ? fixArabicText(a.buttonTextEn || "Shop Now") : fixArabicText(a.buttonTextAr || a.buttonText || "تسوق الآن"),
    linkUrl: a.linkUrl || "/games",
    imageUrl: getAdImage((a as any).imageUrl, i),
    bg: isFemale 
      ? "linear-gradient(135deg, hsl(290 20% 6%) 0%, hsl(290 15% 10%) 100%)"
      : "linear-gradient(135deg, #1a472a 0%, #0a2a1a 100%)",
  })) : MOCK_ADS.map((ad, i) => ({ 
    ...ad, 
    titleAr: lang === "en" ? ad.titleAr.replace("تخفيضات ضخمة على فري فاير", "Huge discounts on Free Fire").replace("باس موسم ببجي الجديد", "New PUBG Mobile Season Pass").replace("سوق الحسابات أصبح متاحاً", "Marketplace is now available").replace("اكسب نقاط واحصل على مكافآت", "Earn points & get rewards") : ad.titleAr,
    descriptionAr: lang === "en" ? ad.descriptionAr.replace("احصل على ضعف الجواهر هذا الأسبوع", "Get double diamonds this week").replace("باقات الموسم الحصرية بأفضل الأسعار", "Exclusive season packages at best prices").replace("اشترِ وبع حسابات الألعاب بأمان تام", "Buy & sell game accounts with total security").replace("كل عملية شراء تكسبك نقاط للمكافآت المجانية", "Every purchase earns you points for free rewards") : ad.descriptionAr,
    buttonTextAr: lang === "en" ? "Shop Now" : ad.buttonTextAr,
    imageUrl: getAdImage(undefined, i),
    bg: isFemale
      ? "linear-gradient(135deg, hsl(290 20% 6%) 0%, hsl(290 15% 10%) 100%)"
      : ad.bg
  }));

  const games = gamesList.length > 0 ? gamesList.map((g, i) => ({
    id: g.id,
    name: g.name,
    nameAr: lang === "en" ? ((g as any).nameEn || g.name) : fallbackArabicName(g.name, g.nameAr),
    imageUrl: getServiceImage(g.name, g.imageUrl),
    color: MOCK_GAMES[i]?.color ?? "#1a472a",
  })) : MOCK_GAMES.map(game => ({ 
    ...game, 
    nameAr: lang === "en" ? game.name : game.nameAr,
    imageUrl: getServiceImage(game.name, game.imageUrl) 
  }));

  const products = HOME_FEATURED_PRODUCTS;

  const activityMessages: Array<string | { text: string; rank?: string; imageUrl?: string; type?: string; textColor?: string }> = activityList.length > 0
    ? activityList.reduce<Array<{ text: string; rank?: string; imageUrl?: string; type?: string; textColor?: string }>>((items, a) => {
      const text = lang === "en" ? (a.message || a.messageAr) : (a.messageAr || a.message);
      const type = (a as any).type;
      const rank = fixArabicText((a as any).userRank);
      const isAdminTicker = type === "ticker";
      const isNiga = rank === "Niga";
      if (text) {
        items.push({
          text: fixArabicText(text),
          rank,
          imageUrl: isAdminTicker || isNiga ? (a as any).imageUrl : "",
          type,
          textColor: isAdminTicker ? ((a as any).textColor || "#ffffff") : isNiga ? "#22c55e" : "#ffffff",
        });
      }
      return items;
    }, [])
    : (lang === "en" ? [
        "Welcome to Grove Street",
        "Top up your wallet and order easily",
        "Grove Street for games and digital subscriptions"
      ] : [
        "أهلا وسهلا بكم في Grove Street",
        "اشحن محفظتك واطلب خدمتك بسهولة",
        "Grove Street لخدمات الألعاب والاشتراكات الرقمية"
      ]);

  const hasActivityTicker = activityMessages.some((item) => typeof item === "object" && item.type === "ticker");
  const tickerBase = adminTicker?.isActive && adminTicker?.text && !hasActivityTicker
    ? [{ text: fixArabicText(adminTicker.text), imageUrl: adminTicker.imageUrl || "", type: "ticker", textColor: adminTicker.textColor || "#d1fae5" }, ...activityMessages]
    : activityMessages;
  const tickerContent = [...tickerBase, ...tickerBase];

  const cardholderName = user?.name || user?.username || "عضو مميز";
  const cardNumber = user?.phone || "0791517855";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative px-6 pt-12 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: isFemale ? "radial-gradient(ellipse at top right, hsl(330 85% 65% / 0.3) 0%, transparent 60%)" : "radial-gradient(ellipse at top right, hsl(142 70% 35% / 0.3) 0%, transparent 60%)" }}
        />
        <GCCharacterShowcase />
        <div className="relative z-10 max-w-3xl mx-auto text-center lg:mr-12 lg:ml-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-primary font-bold mb-3 tracking-widest text-sm uppercase">{lang === "en" ? "Digital gaming store" : "المتجر الرقمي للألعاب"}</p>
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-4 leading-tight">
              GROVE STREET
            </h1>
            <p className="text-xl lg:text-2xl text-white/80 mb-2 font-medium">
              {lang === "en" ? "Your digital street for games and services" : "شارعك الرقمي لشحن الألعاب والخدمات"}
            </p>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              {lang === "en"
                ? "A fast, trusted platform for game top-ups, digital subscriptions, gift cards, and social services."
                : "منصة موثوقة لشحن الألعاب والاشتراكات الرقمية وبطاقات الهدايا وخدمات التواصل الاجتماعي."}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/games">
                <Button className="bg-primary hover:bg-primary/90 font-bold text-lg px-8 py-5" data-testid="button-hero-start">
                  {lang === "en" ? "Start Top-Up" : "ابدأ الشحن"}
                  <Gamepad2 size={18} className="mr-2" />
                </Button>
              </Link>
              <Link href="/wallet">
                <Button variant="outline" className="font-bold text-lg px-8 py-5" data-testid="button-hero-wallet">
                  {lang === "en" ? "Top Up Wallet" : "شحن المحفظة"}
                  <Wallet size={18} className="mr-2" />
                </Button>
              </Link>
              <Link href="/marketplace/sell">
                <Button variant="ghost" className="font-bold text-lg px-8 py-5 text-white" data-testid="button-hero-sell">
                  {lang === "en" ? "Sell Account" : "بيع حساب"}
                  <ShoppingBag size={18} className="mr-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Activity Ticker */}
      <div className="border-y py-3 overflow-hidden" style={{ borderColor: isFemale ? "hsl(290 15% 15%)" : "hsl(142 20% 12%)", background: "hsl(0 0% 5%)" }}>
        <div
          className="flex gap-8 whitespace-nowrap"
          style={{
            animation: "ticker-scroll 115s linear infinite",
            display: "flex",
            width: "max-content",
          }}
        >
          {tickerContent.map((msg: any, i) => {
            const text = typeof msg === "string" ? msg : msg.text;
            const normalizedText = String(text ?? "").trim().replace(/\s+/g, " ");
            const rank = typeof msg === "object" ? msg.rank : "";
            const imageUrl = typeof msg === "object" ? msg.imageUrl : "";
            const textColor = typeof msg === "object" ? msg.textColor : "";
            const isNega = rank === "Niga";
            const isLegend = rank === "Legend" || rank === "أسطوري";
            const isSystemFallbackText =
              normalizedText === "Welcome to Grove Street" ||
              normalizedText === "أهلا وسهلا بكم في Grove Street" ||
              normalizedText === "Top up your wallet and order easily" ||
              normalizedText === "اشحن محفظتك واطلب خدمتك بسهولة" ||
              normalizedText === "Grove Street for games and digital subscriptions" ||
              normalizedText === "Grove Street لخدمات الألعاب والاشتراكات الرقمية";
            const isAdminTickerItem = typeof msg === "object" && msg.type === "ticker" && !isSystemFallbackText && (
              Boolean(msg.highlightText) || normalizedText === String(adminTicker?.text ?? "").trim().replace(/\s+/g, " ")
            );
            const itemStyle = isAdminTickerItem && textColor
              ? { color: textColor, textShadow: `0 0 16px ${textColor}55` }
              : isNega
                ? { color: "#22c55e" }
                : { color: "#ffffff" };
            return (
            <span key={i} className={`text-sm flex items-center gap-2 flex-shrink-0 ${isNega ? "font-black" : isLegend ? "font-bold" : isAdminTickerItem ? "font-black" : ""}`} style={itemStyle}>
              {imageUrl ? <img src={imageUrl} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-primary/40" loading="lazy" /> : isNega ? <img src="/chargre-badge.png" alt="" className="h-5 w-5 rounded-full object-cover" /> : <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
              {text}
            </span>
          )})}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-12 py-10">
        {/* Ad Carousel */}
        <section>
          <AdCarousel ads={ads} />
        </section>

        {/* Games */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black text-white">{lang === "en" ? "Games & Services" : "الألعاب والخدمات"}</h2>
            <Link href="/games">
              <span className="text-primary text-sm font-medium hover:underline cursor-pointer">{lang === "en" ? "View all" : "عرض الكل"}</span>
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {games.map((game, i) => (
              <Link key={game.id} href={`/games?gameId=${game.id}`}>
                <motion.div
                  className="flex-shrink-0 w-32 h-32 rounded-2xl overflow-hidden cursor-pointer relative"
                  style={{ background: `linear-gradient(135deg, ${game.color}aa, ${game.color}44)`, border: "1px solid rgba(255,255,255,0.08)" }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.05 }}
                  data-testid={`card-game-${game.id}`}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <div className="mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/10 shadow-lg">
                      <img src={game.imageUrl} alt={game.nameAr} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <span className="text-xs font-bold text-white text-center">{game.nameAr}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* Rank Benefits */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black text-white">
              <TrendingUp size={24} className="inline ml-2 text-primary" />
              خطوات الرتب
            </h2>
            <Link href="/ranks">
              <span className="text-primary text-sm font-medium hover:underline cursor-pointer">تفاصيل الرتب</span>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "نقاط هادئة", text: "اجمع نقاطك من الطلبات المكتملة فقط، بدون مبالغة وبدون احتساب الطلبات المرفوضة.", value: "XP", color: "#9ca3af" },
              { title: "أولوية أفضل", text: "كلما تقدمت رتبتك تظهر طلباتك للإدارة بصورة أوضح وتحصل على متابعة أسرع.", value: "Queue", color: "#22d3ee" },
              { title: "شارة مميزة", text: "الرتب العالية تعطي حضوراً خاصاً داخل الحساب وبعض الميزات تبقى سرية حتى الوصول.", value: "Badge", color: "#22c55e" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-card p-5"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-white">{item.title}</span>
                  <span className="text-3xl font-black" style={{ color: item.color }}>{item.value}</span>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-2xl p-8" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <h2 className="text-2xl font-black text-white text-center mb-8">كيف يعمل؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              className="text-center flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Premium3DCard isFemale={isFemale} name={cardholderName} phone={cardNumber} />
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mb-3 mt-2"
                style={{ background: "hsl(var(--primary))", color: "white" }}>
                ١
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{lang === "en" ? "Top up your wallet" : "اشحن محفظتك"}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
                {lang === "en"
                  ? "Add balance securely by sending the payment proof to the admin for review."
                  : "أضف رصيداً لمحفظتك بأمان عن طريق إرسال إثبات الدفع للإدارة."}
              </p>
            </motion.div>

            <motion.div
              className="text-center flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Premium3DController isFemale={isFemale} />
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mb-3 mt-2"
                style={{ background: "hsl(var(--primary))", color: "white" }}>
                ٢
              </div>
              <h3 className="text-white font-bold text-lg mb-2">اختر الخدمة</h3>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">تصفح الخدمات والبطاقات الرقمية والألعاب واختر الباقة التي تناسبك</p>
            </motion.div>

            <motion.div
              className="text-center flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Premium3DTruck isFemale={isFemale} />
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mb-3 mt-2"
                style={{ background: "hsl(var(--primary))", color: "white" }}>
                ٣
              </div>
              <h3 className="text-white font-bold text-lg mb-2">استلم طلبك</h3>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">تتم معالجة وتوصيل طلبك أو أكواد الشحن فورياً وبأعلى مستويات الأمان</p>
            </motion.div>
          </div>
        </section>

        {/* Ranks Preview */}
        <section>
          <h2 className="text-2xl font-black text-white mb-5">{lang === "en" ? "Ranks & Rewards" : "نظام الرتب والمكافآت"}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {RANKS.map((rank, i) => (
              <motion.div
                key={rank.name}
                className="rounded-xl p-4 text-center"
                style={{
                  background: `${rank.color}11`,
                  border: `1px solid ${rank.color}33`,
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="text-3xl mb-2">{rank.icon.startsWith?.("/") ? <img src={rank.icon} alt="" className="mx-auto h-10 w-10 rounded-full object-cover" /> : rank.icon}</div>
                <p className="font-bold text-sm" style={{ color: rank.color }}>{rank.nameAr}</p>
                <p className="text-xs text-muted-foreground mt-1">{rank.min.toLocaleString()} نقطة</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link href="/ranks">
              <Button variant="outline" className="font-medium" data-testid="button-view-ranks">
                تعرف على المزيد عن الرتب
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}



