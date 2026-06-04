import express, { type Express } from "express";
import cors from "cors";
import crypto from "crypto";
import { readLocalStore, updateLocalStore } from "./lib/localStore";
import liveControlsRouter from "./routes/liveControls";
import { verifyTOTP, generateBase32Secret, generateBackupCodes, encrypt, decrypt } from "./lib/totp";
import qrcodeLib from "./lib/qrcode";
import { generateChallengeToken, verifyChallengeToken } from "./lib/authTokens";
import { logSecurityEvent } from "./lib/securityAudit";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));
app.use("/api", liveControlsRouter);
app.use((req, res, next) => {
  res.on("finish", () => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && res.statusCode < 500) {
      saveMockState();
    }
  });
  next();
});

type User = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  walletBalance: number;
  points: number;
  rank: string;
  isVerified: boolean;
  isBanned: boolean;
  gender: string;
  createdAt: string;
  temporaryRankUntil?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  twoFactorVerifiedAt?: string | null;
  twoFactorRequired: boolean;
  twoFactorBackupCodes?: string | null;
  googleSub?: string;
  googleEmail?: string;
  avatarUrl?: string;
  authProvider?: "password" | "google" | "both";
};

const now = () => new Date().toISOString();
const ADMIN_PASSWORD = "Thaermoh@@123456";
const attemptLimiter = new Map<string, { count: number; lockUntil: number }>();

function checkRateLimit(key: string, limit = 5, windowMs = 5 * 60 * 1000): { ok: boolean; message?: string } {
  const nowMs = Date.now();
  const state = attemptLimiter.get(key);
  if (state) {
    if (nowMs < state.lockUntil) {
      return { ok: false, message: "Too many attempts. Please wait before trying again." };
    }
    // If the window has completely elapsed, reset count
    if (state.lockUntil > 0 && nowMs > state.lockUntil) {
      state.count = 1;
      state.lockUntil = 0;
      return { ok: true };
    }
    state.count += 1;
    if (state.count > limit) {
      state.lockUntil = nowMs + windowMs;
      return { ok: false, message: "Too many attempts. Please wait before trying again." };
    }
  } else {
    attemptLimiter.set(key, { count: 1, lockUntil: 0 });
  }
  return { ok: true };
}
const TOKEN_SECRET = process.env["AUTH_TOKEN_SECRET"] || "grove-local-dev-secret-change-before-production";
const TICKER_FALLBACK = [
  "أهلاً بكم في Grove Street، شارعك الرقمي لشحن الألعاب والخدمات.",
  "اشحن محفظتك بأمان واطلب خدماتك مباشرة من المتجر.",
  "كل طلب مكتمل يضيف نقاط لحسابك ويرفع رتبتك داخل Grove Street.",
  "الدعم والإدارة يتابعون الطلبات اليدوية بأسرع وقت ممكن.",
];

const walletRewards = [
  { id: 1, nameAr: "رصيد محفظة 1 د.أ", pointsCost: 3500, walletCredit: 1, description: "استبدال نقاطك برصيد داخل المحفظة." },
  { id: 2, nameAr: "رصيد محفظة 3 د.أ", pointsCost: 9500, walletCredit: 3, description: "باقة رصيد أفضل للمستخدمين النشطين." },
  { id: 3, nameAr: "رصيد محفظة 5 د.أ", pointsCost: 15000, walletCredit: 5, description: "رصيد محفظة مرتفع بتكلفة نقاط محسوبة." },
];

const CLEAN_TICKER_FALLBACK = [
  "أهلاً بكم في Grove Street، شارعك الرقمي لشحن الألعاب والخدمات.",
  "اشحن محفظتك بأمان واطلب خدماتك مباشرة من المتجر.",
  "كل طلب مكتمل يضيف نقاط لحسابك ويرفع رتبتك داخل Grove Street.",
  "الدعم والإدارة يتابعون الطلبات اليدوية بأسرع وقت ممكن.",
];

const fortunePrizes = [
  { id: "wallet-1", type: "wallet", value: 1, weight: 7, tier: "rare" },
  { id: "wallet-5", type: "wallet", value: 5, weight: 3, tier: "rare" },
  { id: "points-10", type: "points", value: 10, weight: 18, tier: "common" },
  { id: "rank-up", type: "rank", value: 1, weight: 7, tier: "good" },
  { id: "better-luck-a", type: "none", value: 0, weight: 31, tier: "lose" },
  { id: "nega-day", type: "temporary_rank", value: "nega_1_day", weight: 4, tier: "rare" },
  { id: "better-luck-b", type: "none", value: 0, weight: 27, tier: "lose" },
  { id: "extra-spin", type: "extra_spin", value: 1, weight: 6, tier: "good" },
  { id: "points-15", type: "points", value: 15, weight: 10, tier: "good" },
  { id: "wallet-10", type: "wallet", value: 10, weight: 1, tier: "best" },
];

const SPIN_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

const RANK_TABLE = [
  { id: 1, name: "Bronze", nameAr: "برونزي", minPoints: 0, color: "#cd7f32", icon: "B", discountPercent: 0, benefits: "دخول أساسي لكل الخدمات بدون خصم." },
  { id: 2, name: "Silver", nameAr: "فضي", minPoints: 2000, color: "#9ca3af", icon: "S", discountPercent: 1, benefits: "خصم 1% وأولوية خفيفة في المراجعة." },
  { id: 3, name: "Gold", nameAr: "ذهبي", minPoints: 6000, color: "#fbbf24", icon: "G", discountPercent: 2, benefits: "خصم 2% وأولوية دعم أفضل." },
  { id: 4, name: "Platinum", nameAr: "بلاتيني", minPoints: 15000, color: "#22d3ee", icon: "P", discountPercent: 3, benefits: "خصم 3% وعروض مخصصة." },
  { id: 5, name: "Diamond", nameAr: "دايموند", minPoints: 35000, color: "#60a5fa", icon: "D", discountPercent: 4, benefits: "خصم 4% ومعاملة VIP." },
  { id: 6, name: "Legend", nameAr: "أسطوري", minPoints: 75000, color: "#ffd700", icon: "L", discountPercent: 5, benefits: "خصم 5% وأعلى أولوية تنفيذ." },
  { id: 7, name: "Nega", nameAr: "نيقا", minPoints: 150000, color: "#22c55e", icon: "/chargre-badge.png", discountPercent: 7, benefits: "خصم 7% وشارة خاصة وتمييز كامل." },
];

const SERVICE_IMAGE_BY_GAME_ID: Record<number, string> = {
  1: "/images/services/games/free-fire.png",
  2: "/images/services/games/mobile-legends.png",
  3: "/images/services/games/pubg-mobile.png",
  5: "/images/services/games/call-of-duty-mobile.png",
  6: "/images/services/games/brawl-stars.png",
  7: "/images/services/games/jawaker.png",
  8: "/images/services/games/wolvesville.png",
  9: "/images/services/games/roblox.png",
  10: "/images/services/games/lords-mobile.png",
  11: "/images/services/games/delta-force.png",
  12: "/images/services/games/hay-day.png",
  17: "/images/services/games/clash-of-clans.png",
  18: "/images/services/games/clash-royale.png",
  19: "/images/services/games/ea-fc-mobile.png",
  20: "/images/services/games/blood-strike.png",
  21: "/images/services/games/fortnite.png",
  13: "/images/services/gift-cards/steam-gift-card.png",
  14: "/images/services/gift-cards/google-play-gift-card.png",
  15: "/images/services/gift-cards/playstation-gift-card.png",
  16: "/images/services/gift-cards/xbox-gift-card.png",
  22: "/images/services/gift-cards/itunes-us-gift-card.png",
  23: "/images/services/gift-cards/spotify-gift-card.png",
  24: "/images/services/gift-cards/discord-nitro.png",
  101: "/images/services/subscriptions/chatgpt.png",
  102: "/images/services/subscriptions/shahid.png",
  103: "/images/services/subscriptions/netflix.png",
  104: "/images/services/subscriptions/youtube-premium.png",
  105: "/images/services/subscriptions/snapchat-plus.png",
  106: "/images/services/subscriptions/gemini.png",
  201: "/images/services/social/whatsapp.png",
  202: "/images/services/social/instagram.png",
  203: "/images/services/social/tiktok.png",
  204: "/images/services/social/facebook.png",
  205: "/images/services/social/youtube.png",
};

const users: User[] = [
  { id: 1, name: "ثائر", username: "owner", email: "tthhaaeeeerr@gmail.com", role: "owner", walletBalance: 1000, points: 25000, rank: "نيقا", isVerified: true, isBanned: false, gender: "male", createdAt: now(), twoFactorEnabled: false, twoFactorSecret: null, twoFactorVerifiedAt: null, twoFactorRequired: true, twoFactorBackupCodes: null },
  { id: 2, name: "مدير النظام", username: "admin", email: "qtybhrbas774@gmail.com", role: "admin", walletBalance: 500, points: 12000, rank: "نيقا", isVerified: true, isBanned: false, gender: "male", createdAt: now(), twoFactorEnabled: false, twoFactorSecret: null, twoFactorVerifiedAt: null, twoFactorRequired: true, twoFactorBackupCodes: null },
  { id: 3, name: "GC Player", username: "gcplayer", email: "user@grove.local", role: "user", walletBalance: 25, points: 420, rank: "Bronze", isVerified: false, isBanned: false, gender: "male", createdAt: now(), twoFactorEnabled: false, twoFactorSecret: null, twoFactorVerifiedAt: null, twoFactorRequired: false, twoFactorBackupCodes: null },
];

const passwords = new Map<number, string>([
  [1, ADMIN_PASSWORD],
  [2, ADMIN_PASSWORD],
  [3, "123456"],
]);

const games: any[] = [
  { id: 1, name: "Free Fire", nameAr: "فري فاير", imageUrl: SERVICE_IMAGE_BY_GAME_ID[1], isActive: true, category: "topups" },
  { id: 2, name: "Mobile Legends", nameAr: "موبايل ليجندز", imageUrl: SERVICE_IMAGE_BY_GAME_ID[2], isActive: true, category: "topups" },
  { id: 3, name: "PUBG Mobile", nameAr: "ببجي موبايل", imageUrl: SERVICE_IMAGE_BY_GAME_ID[3], isActive: true, category: "topups" },
  { id: 5, name: "Call of Duty Mobile", nameAr: "كول اوف ديوتي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[5], isActive: true, category: "topups" },
  { id: 6, name: "Brawl Stars", nameAr: "براول ستارز", imageUrl: SERVICE_IMAGE_BY_GAME_ID[6], isActive: true, category: "topups" },
  { id: 7, name: "Jawaker", nameAr: "جواكر", imageUrl: SERVICE_IMAGE_BY_GAME_ID[7], isActive: true, category: "topups" },
  { id: 8, name: "Wolvesville", nameAr: "ولفزفيل", imageUrl: SERVICE_IMAGE_BY_GAME_ID[8], isActive: true, category: "topups" },
  { id: 9, name: "Roblox", nameAr: "روبلوكس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[9], isActive: true, category: "topups" },
  { id: 10, name: "Lords Mobile", nameAr: "لوردز موبايل", imageUrl: SERVICE_IMAGE_BY_GAME_ID[10], isActive: true, category: "topups" },
  { id: 11, name: "Delta Force", nameAr: "دلتا فورس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[11], isActive: true, category: "topups" },
  { id: 12, name: "Hay Day", nameAr: "هاي داي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[12], isActive: true, category: "topups" },
  { id: 17, name: "Clash of Clans", nameAr: "كلاش اوف كلانس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[17], isActive: true, category: "topups" },
  { id: 18, name: "Clash Royale", nameAr: "كلاش رويال", imageUrl: SERVICE_IMAGE_BY_GAME_ID[18], isActive: true, category: "topups" },
  { id: 19, name: "EA FC Mobile", nameAr: "EA FC موبايل", imageUrl: SERVICE_IMAGE_BY_GAME_ID[19], isActive: true, category: "topups" },
  { id: 20, name: "Blood Strike", nameAr: "بلود سترايك", imageUrl: SERVICE_IMAGE_BY_GAME_ID[20], isActive: true, category: "topups" },
  { id: 21, name: "Fortnite", nameAr: "فورتنايت", imageUrl: SERVICE_IMAGE_BY_GAME_ID[21], isActive: true, category: "topups" },
  { id: 13, name: "Steam Gift Cards", nameAr: "بطاقات ستيم", imageUrl: SERVICE_IMAGE_BY_GAME_ID[13], isActive: true, category: "gift_cards" },
  { id: 14, name: "Google Play", nameAr: "بطاقات جوجل بلاي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[14], isActive: true, category: "gift_cards" },
  { id: 15, name: "PlayStation", nameAr: "بطاقات بلايستيشن", imageUrl: SERVICE_IMAGE_BY_GAME_ID[15], isActive: true, category: "gift_cards" },
  { id: 16, name: "Xbox", nameAr: "بطاقات اكس بوكس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[16], isActive: true, category: "gift_cards" },
  { id: 22, name: "US iTunes Gift Card", nameAr: "بطاقات آيتونز أمريكي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[22], isActive: true, category: "gift_cards" },
  { id: 23, name: "Spotify Gift Card", nameAr: "بطاقات سبوتيفاي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[23], isActive: true, category: "gift_cards" },
  { id: 24, name: "Discord Nitro", nameAr: "ديسكورد نيترو", imageUrl: SERVICE_IMAGE_BY_GAME_ID[24], isActive: true, category: "gift_cards" },
  { id: 101, name: "ChatGPT", nameAr: "ChatGPT", imageUrl: SERVICE_IMAGE_BY_GAME_ID[101], isActive: true, category: "subscriptions" },
  { id: 102, name: "Shahid", nameAr: "شاهد VIP", imageUrl: SERVICE_IMAGE_BY_GAME_ID[102], isActive: true, category: "subscriptions" },
  { id: 103, name: "Netflix", nameAr: "نتفليكس Premium", imageUrl: SERVICE_IMAGE_BY_GAME_ID[103], isActive: true, category: "subscriptions" },
  { id: 104, name: "YouTube Premium", nameAr: "يوتيوب بريميوم", imageUrl: SERVICE_IMAGE_BY_GAME_ID[104], isActive: true, category: "subscriptions" },
  { id: 105, name: "Snapchat Plus", nameAr: "سناب شات بلس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[105], isActive: true, category: "subscriptions" },
  { id: 106, name: "Gemini", nameAr: "Gemini", imageUrl: SERVICE_IMAGE_BY_GAME_ID[106], isActive: true, category: "subscriptions" },
  { id: 201, name: "WhatsApp", nameAr: "واتساب", imageUrl: SERVICE_IMAGE_BY_GAME_ID[201], isActive: true, category: "social" },
  { id: 202, name: "Instagram", nameAr: "انستغرام", imageUrl: SERVICE_IMAGE_BY_GAME_ID[202], isActive: true, category: "social" },
  { id: 203, name: "TikTok", nameAr: "تيك توك", imageUrl: SERVICE_IMAGE_BY_GAME_ID[203], isActive: true, category: "social" },
  { id: 204, name: "Facebook", nameAr: "فيسبوك", imageUrl: SERVICE_IMAGE_BY_GAME_ID[204], isActive: true, category: "social" },
  { id: 205, name: "YouTube", nameAr: "يوتيوب", imageUrl: SERVICE_IMAGE_BY_GAME_ID[205], isActive: true, category: "social" },
];

const products: any[] = [
  // 1. Free Fire (gameId: 1)
  {
    id: 1, gameId: 1, gameName: "Free Fire", name: "Free Fire 100 Diamonds", nameAr: "100 جوهرة فري فاير", category: "topups", description: "شحن جواهر فري فاير عبر المعرف فقط", price: 1.00, pointsEarned: 0, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-id-topup", amount: "100 Diamonds", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 2, gameId: 1, gameName: "Free Fire", name: "Free Fire 210 Diamonds", nameAr: "210 جواهر فري فاير", category: "topups", description: "شحن جواهر فري فاير عبر المعرف فقط", price: 2.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-id-topup", amount: "210 Diamonds", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 3, gameId: 1, gameName: "Free Fire", name: "Free Fire 520 Diamonds", nameAr: "520 جوهرة فري فاير", category: "topups", description: "شحن جواهر فري فاير عبر المعرف فقط", price: 4.80, pointsEarned: 2, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: true, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-id-topup", amount: "520 Diamonds", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 4, gameId: 1, gameName: "Free Fire", name: "Free Fire Account Topup", nameAr: "شحن جواهر عبر الحساب (يدوي)", category: "topups", description: "شحن يدوي آمن عبر الحساب بالكامل", price: 10.00, pointsEarned: 5, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([
      { name: "email", label: "البريد الإلكتروني أو رقم الهاتف", type: "text", required: true },
      { name: "password", label: "كلمة المرور للحساب", type: "password", required: true },
      { name: "notes", label: "ملاحظات إضافية (أكواد الأمان إن وجدت)", type: "text", required: false }
    ]),
    serviceGroupId: "ff-account-topup", amount: "1000 Diamonds", region: "any", server: "any", deliveryType: "manual"
  },
  {
    id: 5, gameId: 1, gameName: "Free Fire", name: "Free Fire Weekly Membership", nameAr: "عضوية فري فاير الأسبوعية (Weekly)", category: "topups", description: "شحن العضوية الأسبوعية فورياً", price: 2.10, pointsEarned: 1, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-membership", amount: "Weekly Membership", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 6, gameId: 1, gameName: "Free Fire", name: "Free Fire Monthly Membership", nameAr: "عضوية فري فاير الشهرية (Monthly)", category: "topups", description: "تفعيل العضوية الشهرية فورياً", price: 8.50, pointsEarned: 4, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-membership", amount: "Monthly Membership", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 7, gameId: 1, gameName: "Free Fire", name: "Free Fire Global 100 Diamonds", nameAr: "شحن Free Fire Global 100 Diamonds", category: "topups", description: "شحن عالمي فوري", price: 1.20, pointsEarned: 0, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-global", amount: "100 Diamonds", region: "Global", server: "Global", deliveryType: "direct_topup"
  },
  {
    id: 8, gameId: 1, gameName: "Free Fire", name: "Free Fire MENA 310 Diamonds", nameAr: "شحن Free Fire MENA 310 Diamonds", category: "topups", description: "شحن فوري سيرفر الشرق الأوسط", price: 3.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-mena", amount: "310 Diamonds", region: "MENA", server: "MENA", deliveryType: "direct_topup"
  },
  {
    id: 9, gameId: 1, gameName: "Free Fire", name: "Free Fire Europe Server 100 Diamonds", nameAr: "شحن Free Fire Europe 100 Diamonds", category: "topups", description: "شحن فوري سيرفر أوروبا", price: 1.30, pointsEarned: 0, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-server", amount: "100 Diamonds", region: "Europe", server: "Europe", deliveryType: "direct_topup"
  },
  {
    id: 10, gameId: 1, gameName: "Free Fire", name: "Free Fire Brazil Server 100 Diamonds", nameAr: "شحن Free Fire Brazil 100 Diamonds", category: "topups", description: "شحن فوري سيرفر البرازيل", price: 1.25, pointsEarned: 0, stock: 9999, imageUrl: "/images/games/freefire/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-server", amount: "100 Diamonds", region: "Brazil", server: "Brazil", deliveryType: "direct_topup"
  },

  // 2. PUBG Mobile (gameId: 3)
  {
    id: 20, gameId: 3, gameName: "PUBG Mobile", name: "PUBG Mobile 60 UC", nameAr: "60 شدة ببجي (ID)", category: "topups", description: "شحن شدات ببجي فوري عبر المعرّف", price: 1.00, pointsEarned: 0, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "معرّف اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "pubg-id-topup", amount: "60 UC", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 21, gameId: 3, gameName: "PUBG Mobile", name: "PUBG Mobile 325 UC", nameAr: "300 + 25 شدة ببجي (ID)", category: "topups", description: "شحن شدات ببجي فوري عبر المعرّف", price: 4.25, pointsEarned: 2, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "معرّف اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "pubg-id-topup", amount: "325 UC", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 22, gameId: 3, gameName: "PUBG Mobile", name: "PUBG Mobile 660 UC", nameAr: "600 + 60 شدة ببجي (ID)", category: "topups", description: "شحن شدات ببجي فوري عبر المعرّف", price: 8.50, pointsEarned: 4, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: false, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "معرّف اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "pubg-id-topup", amount: "660 UC", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 23, gameId: 3, gameName: "PUBG Mobile", name: "PUBG Mobile Elite Pass", nameAr: "باقة النخبة ببجي Elite Pass", category: "topups", description: "تفعيل الرويال باس النخبة فورا", price: 9.99, pointsEarned: 4, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "معرّف اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "pubg-pass", amount: "Elite Pass", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 24, gameId: 3, gameName: "PUBG Mobile", name: "PUBG Mobile UC Global 325", nameAr: "شدات ببجي Global 325 UC", category: "topups", description: "شحن فوري سيرفر عالمي", price: 4.50, pointsEarned: 2, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "معرّف اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "pubg-global", amount: "325 UC", region: "Global", server: "Global", deliveryType: "direct_topup"
  },

  // 3. Mobile Legends (gameId: 2)
  {
    id: 30, gameId: 2, gameName: "Mobile Legends", name: "MLBB Diamonds 86", nameAr: "86 ألماس موبايل ليجيندز (ID)", category: "topups", description: "شحن فوري عبر معرّف الحساب والخادم", price: 2.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([
      { name: "player_id", label: "رقم الحساب (User ID)", type: "text", required: true },
      { name: "zone_id", label: "رقم الخادم (Zone ID)", type: "text", required: true }
    ]),
    serviceGroupId: "ml-diamonds-id", amount: "86 Diamonds", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 31, gameId: 2, gameName: "Mobile Legends", name: "MLBB Weekly Diamond Pass", nameAr: "عضوية MLBB Weekly Diamond Pass", category: "topups", description: "العضوية الأسبوعية للألماس فوري", price: 2.20, pointsEarned: 1, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([
      { name: "player_id", label: "رقم الحساب (User ID)", type: "text", required: true },
      { name: "zone_id", label: "رقم الخادم (Zone ID)", type: "text", required: true }
    ]),
    serviceGroupId: "ml-weekly-pass", amount: "Weekly Pass", region: "any", server: "any", deliveryType: "direct_topup"
  },

  // 4. Call of Duty Mobile (gameId: 5)
  {
    id: 40, gameId: 5, gameName: "Call of Duty Mobile", name: "CODM 80 CP", nameAr: "80 سي بي كول أوف ديوتي (ID)", category: "topups", description: "شحن نقاط CP فوري عبر المعرّف", price: 1.10, pointsEarned: 0, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم معرف اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "cod-cp-id", amount: "80 CP", region: "any", server: "any", deliveryType: "direct_topup"
  },

  // 5. Roblox (gameId: 9)
  {
    id: 50, gameId: 9, gameName: "Roblox", name: "Roblox 400 Robux", nameAr: "400 روبوكس روبلوكس (فوري)", category: "topups", description: "شحن Robux فوري عبر اسم المستخدم", price: 5.00, pointsEarned: 2, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "username", label: "اسم المستخدم في Roblox", type: "text", required: true }]),
    serviceGroupId: "roblox-robux", amount: "400 Robux", region: "any", server: "any", deliveryType: "direct_topup"
  },

  // 6. Steam (gameId: 13)
  {
    id: 60, gameId: 13, gameName: "Steam Gift Cards", name: "Steam Gift Card USA $10", nameAr: "بطاقة ستيم أمريكي $10 USD", category: "gift_cards", description: "كود شحن حساب ستيم أمريكي", price: 10.00, pointsEarned: 5, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "manual",
    inputFields: JSON.stringify([]),
    serviceGroupId: "steam-usa", amount: "$10 USD", region: "USA", server: "any", deliveryType: "gift_code"
  },
  {
    id: 61, gameId: 13, gameName: "Steam Gift Cards", name: "Steam Gift Card Turkey 100 TL", nameAr: "بطاقة ستيم تركي 100 TL", category: "gift_cards", description: "كود شحن حساب ستيم تركي", price: 4.80, pointsEarned: 2, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([]),
    serviceGroupId: "steam-turkey", amount: "100 TL", region: "Turkey", server: "any", deliveryType: "gift_code"
  },

  // 7. Google Play (gameId: 14)
  {
    id: 70, gameId: 14, gameName: "Google Play", name: "Google Play USA $10", nameAr: "بطاقة جوجل بلاي أمريكي $10", category: "gift_cards", description: "كود جوجل بلاي أمريكي فوري", price: 10.00, pointsEarned: 5, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "manual",
    inputFields: JSON.stringify([]),
    serviceGroupId: "google-usa", amount: "$10 USD", region: "USA", server: "any", deliveryType: "gift_code"
  },
  {
    id: 71, gameId: 14, gameName: "Google Play", name: "Google Play Saudi 50 SAR", nameAr: "بطاقة جوجل بلاي سعودي 50 ر.س", category: "gift_cards", description: "كود جوجل بلاي سعودي", price: 13.00, pointsEarned: 6, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([]),
    serviceGroupId: "google-saudi", amount: "50 SAR", region: "Saudi", server: "any", deliveryType: "gift_code"
  },

  // 8. PlayStation (gameId: 15)
  {
    id: 80, gameId: 15, gameName: "PlayStation", name: "PSN Gift Card USA $10", nameAr: "بطاقة بلايستيشن أمريكي $10", category: "gift_cards", description: "كود شحن حساب بلايستيشن أمريكي", price: 10.00, pointsEarned: 5, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "manual",
    inputFields: JSON.stringify([]),
    serviceGroupId: "psn-usa", amount: "$10 USD", region: "USA", server: "any", deliveryType: "gift_code"
  },

  // 9. Xbox (gameId: 16)
  {
    id: 90, gameId: 16, gameName: "Xbox", name: "Xbox Gift Card USA $10", nameAr: "بطاقة إكس بوكس أمريكي $10", category: "gift_cards", description: "كود شحن إكس بوكس أمريكي", price: 10.00, pointsEarned: 5, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "manual",
    inputFields: JSON.stringify([]),
    serviceGroupId: "xbox-usa", amount: "$10 USD", region: "USA", server: "any", deliveryType: "gift_code"
  },

  // 10. Subscriptions (ChatGPT: 101, Shahid: 102, Netflix: 103, YouTube: 104)
  {
    id: 1010, gameId: 101, gameName: "ChatGPT", name: "ChatGPT Plus 1 Month", nameAr: "اشتراك ChatGPT Plus شهر (حساب جاهز)", category: "subscriptions", description: "حساب جاهز مفعل به اشتراك ChatGPT Plus بالكامل لـ 30 يوماً", price: 15.00, pointsEarned: 7, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "manual",
    inputFields: JSON.stringify([
      { name: "email", label: "البريد الإلكتروني المفضل للتواصل", type: "email", required: true },
      { name: "notes", label: "ملاحظات إضافية للتنفيذ يدوياً", type: "text", required: false }
    ]),
    serviceGroupId: "chatgpt-monthly", amount: "1 Month", region: "any", server: "any", deliveryType: "manual"
  },
  {
    id: 1020, gameId: 102, gameName: "Shahid", name: "Shahid VIP Sports 1 Month", nameAr: "اشتراك شاهد VIP الرياضية شهر", category: "subscriptions", description: "اشتراك شاهد الرياضي VIP لمشاهدة المباريات الحصرية", price: 5.00, pointsEarned: 2, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "manual",
    inputFields: JSON.stringify([
      { name: "email", label: "البريد الإلكتروني لحساب شاهد VIP", type: "text", required: true },
      { name: "password", label: "كلمة المرور للحساب", type: "password", required: true }
    ]),
    serviceGroupId: "shahid-sports", amount: "1 Month VIP Sports", region: "any", server: "any", deliveryType: "manual"
  },
  {
    id: 1030, gameId: 103, gameName: "Netflix", name: "Netflix Premium Screen 1 Month", nameAr: "شاشة مشتركة نتفليكس بريميوم شهر", category: "subscriptions", description: "شاشة واحدة داخل حساب نتفليكس بريميوم Ultra HD فائق الجودة", price: 2.50, pointsEarned: 1, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "manual",
    inputFields: JSON.stringify([
      { name: "whatsapp", label: "رقم الواتساب لإرسال معلومات الشاشة", type: "text", required: true }
    ]),
    serviceGroupId: "netflix-screen", amount: "1 Screen Premium", region: "any", server: "any", deliveryType: "manual"
  },
  {
    id: 1040, gameId: 104, gameName: "YouTube Premium", name: "YouTube Premium 1 Month", nameAr: "اشتراك يوتيوب بريميوم شهر فردي", category: "subscriptions", description: "تفعيل اشتراك يوتيوب بريميوم على حسابك الشخصي يدوياً عبر دعوة عائلية", price: 2.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/logo/logo.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([
      { name: "email", label: "بريد Gmail المراد إرسال دعوة الاشتراك عليه", type: "email", required: true }
    ]),
    serviceGroupId: "youtube-individual", amount: "1 Month", region: "any", server: "any", deliveryType: "manual"
  },

  // 11. Social media services
  {
    id: 2010, gameId: 201, gameName: "WhatsApp", name: "WhatsApp Channel Members", nameAr: "أعضاء قناة واتساب", category: "social", description: "تنفيذ خدمة أعضاء قناة واتساب بعد إدخال الرابط المطلوب", price: 3.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/services/social/whatsapp-channel-members.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "whatsapp-channel-members", amount: "100 Members", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2011, gameId: 201, gameName: "WhatsApp", name: "WhatsApp Post Reactions", nameAr: "تفاعلات منشور واتساب", category: "social", description: "تنفيذ خدمة تفاعلات منشور واتساب بعد إدخال الرابط المطلوب", price: 2.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/services/social/whatsapp-post-reactions.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "whatsapp-post-reactions", amount: "100 Reactions", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2012, gameId: 201, gameName: "WhatsApp", name: "Random WhatsApp Post Reactions", nameAr: "تفاعلات عشوائية واتساب", category: "social", description: "تنفيذ خدمة تفاعلات عشوائية واتساب بعد إدخال الرابط المطلوب", price: 1.50, pointsEarned: 0, stock: 9999, imageUrl: "/images/services/social/whatsapp-random-reactions.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "whatsapp-random-reactions", amount: "100 Random Reactions", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2013, gameId: 201, gameName: "WhatsApp", name: "Custom WhatsApp Post Reactions", nameAr: "تفاعلات مخصصة واتساب", category: "social", description: "تنفيذ خدمة تفاعلات مخصصة واتساب بعد إدخال الرابط المطلوب", price: 2.50, pointsEarned: 1, stock: 9999, imageUrl: "/images/services/social/whatsapp-custom-reactions.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "whatsapp-custom-reactions", amount: "100 Custom Reactions", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2020, gameId: 202, gameName: "Instagram", name: "Instagram Followers", nameAr: "متابعين انستغرام", category: "social", description: "تنفيذ خدمة متابعين انستغرام بعد إدخال الرابط المطلوب", price: 3.50, pointsEarned: 1, stock: 9999, imageUrl: "/images/services/social/instagram-followers.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "instagram-followers", amount: "1000 Followers", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2021, gameId: 202, gameName: "Instagram", name: "Instagram Likes", nameAr: "لايكات انستغرام", category: "social", description: "تنفيذ خدمة لايكات انستغرام بعد إدخال الرابط المطلوب", price: 1.50, pointsEarned: 0, stock: 9999, imageUrl: "/images/services/social/instagram-likes.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "instagram-likes", amount: "1000 Likes", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2022, gameId: 202, gameName: "Instagram", name: "Instagram Views", nameAr: "مشاهدات انستغرام", category: "social", description: "تنفيذ خدمة مشاهدات انستغرام بعد إدخال الرابط المطلوب", price: 1.00, pointsEarned: 0, stock: 9999, imageUrl: "/images/services/social/instagram-views.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "instagram-views", amount: "1000 Views", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2030, gameId: 203, gameName: "TikTok", name: "TikTok Followers", nameAr: "متابعين تيك توك", category: "social", description: "تنفيذ خدمة متابعين تيك توك بعد إدخال الرابط المطلوب", price: 3.50, pointsEarned: 1, stock: 9999, imageUrl: "/images/services/social/tiktok-followers.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "tiktok-followers", amount: "1000 Followers", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2031, gameId: 203, gameName: "TikTok", name: "TikTok Likes", nameAr: "لايكات تيك توك", category: "social", description: "تنفيذ خدمة لايكات تيك توك بعد إدخال الرابط المطلوب", price: 1.50, pointsEarned: 0, stock: 9999, imageUrl: "/images/services/social/tiktok-likes.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "tiktok-likes", amount: "1000 Likes", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2032, gameId: 203, gameName: "TikTok", name: "TikTok Views", nameAr: "مشاهدات تيك توك", category: "social", description: "تنفيذ خدمة مشاهدات تيك توك بعد إدخال الرابط المطلوب", price: 1.00, pointsEarned: 0, stock: 9999, imageUrl: "/images/services/social/tiktok-views.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "tiktok-views", amount: "1000 Views", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2040, gameId: 204, gameName: "Facebook", name: "Facebook Profile Followers", nameAr: "متابعين بروفايل فيسبوك", category: "social", description: "تنفيذ خدمة متابعين بروفايل فيسبوك بعد إدخال الرابط المطلوب", price: 3.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/services/social/facebook-profile-followers.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "facebook-profile-followers", amount: "1000 Followers", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2041, gameId: 204, gameName: "Facebook", name: "Facebook Page Followers", nameAr: "متابعين صفحة فيسبوك", category: "social", description: "تنفيذ خدمة متابعين صفحة فيسبوك بعد إدخال الرابط المطلوب", price: 3.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/services/social/facebook-page-followers.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "facebook-page-followers", amount: "1000 Page Followers", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2042, gameId: 204, gameName: "Facebook", name: "Facebook Post Likes", nameAr: "لايكات منشور فيسبوك", category: "social", description: "تنفيذ خدمة لايكات منشور فيسبوك بعد إدخال الرابط المطلوب", price: 1.50, pointsEarned: 0, stock: 9999, imageUrl: "/images/services/social/facebook-post-likes.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "facebook-post-likes", amount: "1000 Likes", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2043, gameId: 204, gameName: "Facebook", name: "Facebook Views", nameAr: "مشاهدات فيسبوك", category: "social", description: "تنفيذ خدمة مشاهدات فيسبوك بعد إدخال الرابط المطلوب", price: 1.00, pointsEarned: 0, stock: 9999, imageUrl: "/images/services/social/facebook-views.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "facebook-views", amount: "1000 Views", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2050, gameId: 205, gameName: "YouTube", name: "YouTube Views", nameAr: "مشاهدات يوتيوب", category: "social", description: "تنفيذ خدمة مشاهدات يوتيوب بعد إدخال الرابط المطلوب", price: 2.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/services/social/youtube-views.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "youtube-views", amount: "1000 Views", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2051, gameId: 205, gameName: "YouTube", name: "YouTube Likes", nameAr: "لايكات يوتيوب", category: "social", description: "تنفيذ خدمة لايكات يوتيوب بعد إدخال الرابط المطلوب", price: 2.00, pointsEarned: 1, stock: 9999, imageUrl: "/images/services/social/youtube-likes.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "youtube-likes", amount: "1000 Likes", region: "any", server: "any", deliveryType: "social_service"
  },
  {
    id: 2052, gameId: 205, gameName: "YouTube", name: "YouTube Subscribers", nameAr: "مشتركين يوتيوب", category: "social", description: "تنفيذ خدمة مشتركين يوتيوب بعد إدخال الرابط المطلوب", price: 6.00, pointsEarned: 3, stock: 9999, imageUrl: "/images/services/social/youtube-subscribers.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([{ name: "link", label: "رابط الحساب أو المنشور", type: "text", required: true }, { name: "notes", label: "ملاحظات إضافية", type: "text", required: false }]),
    serviceGroupId: "youtube-subscribers", amount: "100 Subscribers", region: "any", server: "any", deliveryType: "social_service"
  }

];

const pendingTwoFactorSetups = new Map<string, { userId: number; secret: string; expiresAt: number }>();

function logTwoFactorDebug(input: Record<string, unknown>) {
  if (process.env["NODE_ENV"] === "production") return;
  console.info("[2FA debug]", input);
}

function cleanTotpCode(code: unknown) {
  return String(code ?? "").trim().replace(/\s+/g, "");
}

const SOCIAL_SERVICE_NOTICE_AR = "تنبيه مهم: يجب أن يكون الحساب أو المنشور عاما وليس خاصا. تأكد من أن الرابط صحيح وأن الحساب أو المنشور غير محذوف. يمنع تغيير اسم المستخدم أو إغلاق الحساب أثناء تنفيذ الطلب. المتجر غير مسؤول عن أي تأخير أو فشل بسبب رابط خاطئ أو حساب خاص أو تغيير البيانات أثناء التنفيذ. خدمات المتابعين واللايكات والمشاهدات قد تنقص بعد التسليم وقد لا تكون النتائج ثابتة دائما.";
const SOCIAL_SERVICE_NOTICE_EN = "Important notice: Your account or post must be public and not private. Make sure the link is correct and the account or post is not deleted. Do not change the username or close the account during processing. The store is not responsible for delays or failed orders caused by wrong links, private accounts, or changed data. Followers, likes, views, and engagement services may drop after delivery and results are not always permanent.";
const SUBSCRIPTION_NOTICE_AR = "خدمات الاشتراكات يتم تنفيذها بشكل يدوي وليست فورية دائما. قد تحتاج الخدمة بعض الوقت حسب توفر الاشتراك وحالة الحساب. يرجى التأكد من كتابة الإيميل أو اليوزر بشكل صحيح قبل إرسال الطلب. أي خطأ في البيانات قد يؤدي إلى تأخير الطلب أو فشل التفعيل.";
const SUBSCRIPTION_NOTICE_EN = "Subscription services are handled manually and are not always instant. Delivery may take some time depending on availability and account status. Please make sure the email or username is correct before sending the order. Wrong data may delay or fail activation.";

function localizedFields(kind: "profile" | "post" | "video" | "channel" | "email" | "snap" | "account", required = true) {
  const labels: Record<string, { ar: string; en: string }> = {
    profile: { ar: "رابط الملف الشخصي", en: "Profile link" },
    post: { ar: "رابط المنشور", en: "Post link" },
    video: { ar: "رابط الفيديو", en: "Video link" },
    channel: { ar: "رابط القناة", en: "Channel link" },
    email: { ar: "الإيميل", en: "Email" },
    snap: { ar: "اسم المستخدم في سناب شات", en: "Snapchat username" },
    account: { ar: "الإيميل أو بيانات الحساب المطلوبة للتفعيل", en: "Email or account details required for activation" },
  };
  const fieldName = kind === "email" ? "email" : kind === "snap" ? "username" : kind === "account" ? "account_details" : "link";
  const fieldType = kind === "email" ? "email" : "text";
  return JSON.stringify([{ name: fieldName, label: labels[kind].ar, labelAr: labels[kind].ar, labelEn: labels[kind].en, type: fieldType, required }]);
}

function upsertGame(game: any) {
  const current = games.find((item) => item.id === game.id);
  if (current) Object.assign(current, game);
  else games.push(game);
}

function upsertProduct(product: any) {
  const current = products.find((item) => item.id === product.id || item.serviceGroupId === product.serviceGroupId);
  const game = games.find((item) => item.id === Number(product.gameId));
  const next = {
    isActive: true,
    isFeatured: false,
    isTrending: false,
    stock: 9999,
    fulfillmentType: "manual",
    imageUrl: game?.imageUrl ?? SERVICE_IMAGE_BY_GAME_ID[Number(product.gameId)] ?? "/images/logo/logo.png",
    gameName: game?.name ?? product.gameName ?? "",
    pointsEarned: 0,
    ...product,
  };
  if (current) Object.assign(current, next);
  else products.push(next);
}

function applyFinalCatalogFixes() {
  RANK_TABLE.splice(0, RANK_TABLE.length,
    { id: 1, name: "Bronze", nameAr: "برونزي", minPoints: 0, color: "#cd7f32", icon: "B", discountPercent: 0, benefits: "بداية الحساب وتجميع النقاط من الطلبات المكتملة." },
    { id: 2, name: "Silver", nameAr: "فضي", minPoints: 500, color: "#9ca3af", icon: "S", discountPercent: 0, benefits: "شارة أفضل في البروفايل ومتابعة أوضح للطلبات." },
    { id: 3, name: "Gold", nameAr: "ذهبي", minPoints: 1500, color: "#fbbf24", icon: "G", discountPercent: 0, benefits: "أولوية خفيفة في مراجعة الطلبات اليدوية." },
    { id: 4, name: "Platinum", nameAr: "بلاتيني", minPoints: 4000, color: "#22d3ee", icon: "P", discountPercent: 0, benefits: "تمييز أفضل داخل الحساب ودعم أسرع." },
    { id: 5, name: "Diamond", nameAr: "دايموند", minPoints: 10000, color: "#60a5fa", icon: "D", discountPercent: 0, benefits: "أولوية أعلى في الدعم والطلبات." },
    { id: 6, name: "Legend", nameAr: "أسطوري", minPoints: 30000, color: "#ffd700", icon: "L", discountPercent: 1, benefits: "خصم بسيط جدا وأولوية تنفيذ مميزة." },
    { id: 7, name: "Niga", nameAr: "نيقا", minPoints: 50000, color: "#22c55e", icon: "/chargre-badge.png", discountPercent: 0, benefits: "رتبة سرية بميزات خاصة تظهر عند الوصول إليها." },
  );

  for (const user of users) {
    if (user.role === "owner" && (user.rank === "Nega" || user.rank === "نيقا" || user.rank === "Niga")) user.rank = "Legend";
    if (user.role === "admin" && (user.rank === "Nega" || user.rank === "نيقا" || user.rank === "Niga")) user.rank = "Gold";
    if (user.rank === "Nega") user.rank = "Niga";
  }

  Object.assign(fortunePrizes.find((prize) => prize.id === "nega-day") ?? {}, { type: "temporary_rank", value: "niga_1_day", weight: 1, minLuck: 90, tier: "best" });

  upsertGame({ id: 1, name: "Free Fire", nameAr: "فري فاير", imageUrl: SERVICE_IMAGE_BY_GAME_ID[1], isActive: true, category: "topups" });
  upsertGame({ id: 104, name: "YouTube Premium", nameAr: "يوتيوب بريميوم", imageUrl: SERVICE_IMAGE_BY_GAME_ID[104], isActive: true, category: "subscriptions" });
  upsertGame({ id: 105, name: "Snapchat Plus", nameAr: "سناب شات بلس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[105], isActive: true, category: "subscriptions" });
  upsertGame({ id: 301, name: "Design Services", nameAr: "قسم التصميم", imageUrl: "/images/logo/logo.png", isActive: true, category: "subscriptions" });

  const social = [
    [2020, 202, "Instagram Followers", "متابعين انستغرام", "Instagram followers service", "خدمة متابعين انستغرام", 0.150, 0.148, 100, 100, "profile", "instagram-followers"],
    [2021, 202, "Instagram Likes", "لايكات انستغرام", "Instagram post likes service", "خدمة لايكات منشور انستغرام", 0.020, 0.018, 100, 100, "post", "instagram-likes"],
    [2022, 202, "Instagram Views", "مشاهدات انستغرام", "Instagram post views service", "خدمة مشاهدات منشور انستغرام", 0.010, 0.004, 500, 500, "post", "instagram-views"],
    [2043, 204, "Facebook Views", "مشاهدات فيسبوك", "Facebook post views service", "خدمة مشاهدات منشور فيسبوك", 0.030, 0.030, 500, 500, "post", "facebook-views"],
    [2040, 204, "Facebook Profile Followers", "متابعين حساب شخصي فيسبوك", "Facebook profile followers service", "خدمة متابعين حساب شخصي فيسبوك", 0.080, 0.074, 100, 100, "profile", "facebook-profile-followers"],
    [2041, 204, "Facebook Page Followers", "متابعين صفحة فيسبوك", "Facebook page followers service", "خدمة متابعين صفحة فيسبوك", 0.080, 0.074, 100, 100, "profile", "facebook-page-followers"],
    [2042, 204, "Facebook Post Likes", "لايكات منشور فيسبوك", "Facebook post likes service", "خدمة لايكات منشور فيسبوك", 0.030, 0.027, 100, 100, "post", "facebook-post-likes"],
    [2031, 203, "TikTok Likes", "لايكات تيك توك", "TikTok post likes service", "خدمة لايكات منشور تيك توك", 0.030, 0.027, 100, 100, "post", "tiktok-likes"],
    [2032, 203, "TikTok Views", "مشاهدات تيك توك", "TikTok video views service", "خدمة مشاهدات فيديو تيك توك", 0.020, 0.013, 1000, 1000, "post", "tiktok-views"],
    [2030, 203, "TikTok Followers", "متابعين تيك توك", "TikTok followers service", "خدمة متابعين تيك توك", 0.260, 0.251, 100, 100, "profile", "tiktok-followers"],
    [2010, 201, "WhatsApp Channel Members", "أعضاء قنوات واتساب", "WhatsApp channel members service", "خدمة أعضاء قنوات واتساب", 0.240, 0.236, 100, 100, "channel", "whatsapp-channel-members"],
    [2011, 201, "WhatsApp Post Reaction Like", "تفاعل على منشور واتساب 👍", "WhatsApp post like reaction service", "خدمة تفاعل لايك على منشور واتساب", 0.090, 0.087, 50, 50, "post", "whatsapp-post-like"],
    [2013, 201, "WhatsApp Post Reaction Heart", "تفاعل على منشور واتساب 💗", "WhatsApp post heart reaction service", "خدمة تفاعل قلب على منشور واتساب", 0.040, 0.031, 10, 10, "post", "whatsapp-post-heart"],
    [2012, 201, "WhatsApp Random Reactions", "تفاعل عشوائي على منشور واتساب 🥺 😮 💗 👍", "Random WhatsApp post reactions service", "خدمة تفاعل عشوائي على منشور واتساب", 0.160, 0.154, 50, 50, "post", "whatsapp-random-reactions"],
    [2051, 205, "YouTube Likes", "لايكات يوتيوب", "YouTube video likes service", "خدمة لايكات فيديو يوتيوب", 0.140, 0.137, 100, 100, "video", "youtube-likes"],
    [2050, 205, "YouTube Views", "مشاهدات يوتيوب", "YouTube video views service", "خدمة مشاهدات فيديو يوتيوب", 0.150, 0.148, 100, 100, "video", "youtube-views"],
  ] as const;

  for (const [id, gameId, name, nameAr, descriptionEn, descriptionAr, price, providerCost, minQuantity, unitQuantity, fieldKind, group] of social) {
    const maxQuantity = ["facebook-profile-followers", "facebook-page-followers", "tiktok-followers"].includes(group) ? 5000000 : undefined;
    upsertProduct({
      id, gameId, name, nameEn: name, nameAr, category: "social", description: descriptionEn, descriptionEn, descriptionAr,
      price, pricePerUnitJod: price, priceUnitAmount: unitQuantity, providerCost, providerCostPerUnitJod: providerCost,
      originalCost: providerCost, originalCostPerUnitJod: providerCost, minQuantity, unitQuantity, maxQuantity,
      isQuantityBased: true, pricingType: "per_unit", purchasable: true,
      inputFields: localizedFields(fieldKind as any), serviceGroupId: group, warningMessage: SOCIAL_SERVICE_NOTICE_AR,
      warningAr: SOCIAL_SERVICE_NOTICE_AR, warningEn: SOCIAL_SERVICE_NOTICE_EN, notesAr: SOCIAL_SERVICE_NOTICE_AR, notesEn: SOCIAL_SERVICE_NOTICE_EN,
      deliveryType: "social_service", fulfillmentType: "manual", stock: 9999, isActive: true,
    });
  }
  upsertProduct({
    id: 2052, gameId: 205, name: "YouTube Subscribers", nameEn: "YouTube Subscribers", nameAr: "مشتركين يوتيوب",
    category: "social", description: "Currently out of stock", descriptionEn: "Currently out of stock", descriptionAr: "الخدمة غير متاحة حاليا",
    price: 6, pricePerUnitJod: 6, priceUnitAmount: 100, providerCost: 0, providerCostPerUnitJod: 0,
    originalCost: 0, originalCostPerUnitJod: 0, minQuantity: 100, unitQuantity: 100,
    inputFields: localizedFields("channel"), serviceGroupId: "youtube-subscribers", fulfillmentType: "manual",
    stock: 0, isActive: true, isOutOfStock: true, purchasable: false, isQuantityBased: true, pricingType: "per_unit",
    warningMessage: SOCIAL_SERVICE_NOTICE_AR, warningAr: SOCIAL_SERVICE_NOTICE_AR, warningEn: SOCIAL_SERVICE_NOTICE_EN,
  });

  const subscriptions = [
    [3001, 105, "Snapchat Plus 3 Months", "سناب شات بلس 3 أشهر", 4.490, 4.484, "3 أشهر", "snap"],
    [3002, 105, "Snapchat Plus 6 Months", "سناب شات بلس 6 أشهر", 8.520, 8.513, "6 أشهر", "snap"],
    [3003, 105, "Snapchat Plus 12 Months", "سناب شات بلس 12 شهر", 17.560, 17.557, "12 شهر", "snap"],
    [3011, 104, "YouTube Premium 1 Month", "يوتيوب بريميوم شهر واحد", 4.070, 4.066, "شهر واحد", "email"],
    [3012, 104, "YouTube Premium 3 Months", "يوتيوب بريميوم 3 أشهر", 12.200, 12.199, "3 أشهر", "email"],
    [3013, 104, "YouTube Premium 6 Months", "يوتيوب بريميوم 6 أشهر", 18.010, 18.006, "6 أشهر", "email"],
    [3014, 104, "YouTube Premium 12 Months", "يوتيوب بريميوم 12 شهر", 31.320, 31.315, "12 شهر", "email"],
    [3020, 301, "iPhone Plus 1 Year", "بلس الايفون سنة", 10.070, 10.066, "سنة كاملة", "account"],
    [3030, 301, "CapCut 1 Month", "كاب كات شهر", 2.520, 2.517, "شهر واحد", "account"],
    [3031, 301, "Picsart Personal 1 Month", "بيكسارت حساب شخصي شهر", 2.050, 2.049, "شهر واحد", "account"],
    [3032, 301, "Canva 1 Year", "اشتراك كانفا سنة", 1.980, 1.977, "سنة كاملة", "email"],
  ] as const;

  for (const [id, gameId, name, nameAr, price, providerCost, duration, fieldKind] of subscriptions) {
    upsertProduct({
      id, gameId, name, nameEn: name, nameAr, category: "subscriptions",
      description: `${name} subscription. Manual activation.`,
      descriptionEn: `${name} subscription. Manual activation.`,
      descriptionAr: `${nameAr}. تنفيذ يدوي حسب توفر الخدمة وحالة الحساب.`,
      price, providerCost, originalCost: providerCost, duration, minQuantity: 1, unitQuantity: 1,
      inputFields: localizedFields(fieldKind as any), serviceGroupId: `subscription-${id}`,
      warningMessage: SUBSCRIPTION_NOTICE_AR, warningAr: SUBSCRIPTION_NOTICE_AR, warningEn: SUBSCRIPTION_NOTICE_EN,
      notesAr: SUBSCRIPTION_NOTICE_AR, notesEn: SUBSCRIPTION_NOTICE_EN,
      deliveryType: "manual_subscription", fulfillmentType: "manual", stock: 9999, isActive: true,
    });
  }

}

applyFinalCatalogFixes();

let deposits: any[] = [];
let transactions: any[] = [];
let orders: any[] = [];
let tickets: any[] = [];
let ticketMessages: any[] = [];
let fortuneLastSpins: Record<string, number> = {};
let activities: any[] = [
  { id: 1, message: "Local mode is ready", messageAr: "الوضع المحلي جاهز", type: "system", createdAt: now() },
];

let suggestions: any[] = [];
let tickerSettings: any = {
  text: "أهلا بكم في Grove Street",
  isActive: false,
  audience: "all",
  durationMinutes: 0,
  imageUrl: "",
  textColor: "#d1fae5",
  deviceTarget: "all",
  updatedAt: now(),
};

const ads = [
  { id: 1, title: "Wallet offer", titleAr: "عرض الشحن", description: "Recharge and buy instantly", descriptionAr: "اشحن واشتر مباشرة", imageUrl: "/images/ads/a3lan1.png", linkUrl: "/wallet", isActive: true },
  { id: 2, title: "Gaming deals", titleAr: "عروض الألعاب", description: "New top-up deals", descriptionAr: "عروض شحن جديدة", imageUrl: "/images/ads/a3lan2.png", linkUrl: "/offers", isActive: true },
];

let marketplaceListings: any[] = [];
let adminNotifications: any[] = [];

function currentUser(req: express.Request) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const id = verifyToken(token);
  return users.find((user) => user.id === id) ?? null;
}

function requireUser(req: express.Request, res: express.Response) {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return user;
}

function publicUser(user: User) {
  const copy = { ...user };
  delete copy.twoFactorSecret;
  delete copy.twoFactorBackupCodes;
  return copy;
}

function signToken(userId: number, issuedAt = Date.now(), nonce = crypto.randomBytes(8).toString("hex")) {
  const payload = `${userId}.${issuedAt}.${nonce}`;
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifyToken(token: string | undefined): number {
  if (!token) return 0;
  const parts = token.split(".");
  if (parts.length !== 4) return 0;
  const [rawUserId, rawIssuedAt, nonce, signature] = parts;
  const userId = Number(rawUserId);
  const issuedAt = Number(rawIssuedAt);
  if (!Number.isInteger(userId) || !Number.isFinite(issuedAt) || !nonce || !signature) return 0;
  const payload = `${rawUserId}.${rawIssuedAt}.${nonce}`;
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  if (signature.length !== expected.length) return 0;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return 0;
  return userId;
}

function requireAdmin(req: express.Request, res: express.Response) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== "admin" && user.role !== "owner") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user;
}

function makeActivity(input: { message: string; messageAr: string; type: string; user?: User }) {
  activities = [{
    id: activities.length + 1,
    message: input.message,
    messageAr: input.messageAr,
    type: input.type,
    userName: input.user?.name,
    userRank: input.user?.rank,
    createdAt: now(),
  }, ...activities].slice(0, 50);
}

function cleanTickerTextSafe(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.includes("�") || /[\uFFFD]{1,}|[?]{4,}/.test(text)) return "";
  if (text.toLowerCase().includes("local mode")) return "";
  if (/(?:ط§|ط£|ط¢|ط¥|ط¨|طھ|ط¬|ط­|ط®|ط¯|ط°|ط±|ط²|ط³|ط´|طµ|ط¶|ط¹|ط؛|ط©|ط،|طŒ|ظ„|ظ…|ظ†|ظ‡|ظˆ|ظٹ|ظƒ|ظ‚|ظپ|ظ‰|â€|ï)/.test(text)) return "";
  return text;
}

function readFortuneState() {
  const store = readLocalStore();
  const liveControls = store["liveControls"] as any;
  return {
    liveControls: liveControls && typeof liveControls === "object" ? liveControls : {},
    store,
  };
}

function writeFortuneState(liveControls: any) {
  updateLocalStore("liveControls", liveControls);
}

function chooseFortunePrize(globalConfig: any, userConfig: any) {
  const forcedId = userConfig?.forcedPrizeId !== "auto" ? userConfig?.forcedPrizeId : globalConfig?.forcedPrizeId !== "auto" ? globalConfig?.forcedPrizeId : "";
  const forced = fortunePrizes.find((prize) => prize.id === forcedId);
  if (forced) return forced;

  const luck = Math.min(100, Math.max(0, Number(userConfig?.luckOverride ?? globalConfig?.globalLuck ?? 0) || 0));
  if (luck <= 0) return fortunePrizes.find((prize) => prize.id === "better-luck-a") ?? fortunePrizes[0];
  if (luck >= 100) return fortunePrizes.find((prize) => prize.id === "wallet-10") ?? fortunePrizes[0];
  const eligible = (luck >= 80 ? fortunePrizes.filter((prize) => prize.type === "wallet" || (prize.type === "temporary_rank" && luck >= Number((prize as any).minLuck ?? 90))) : fortunePrizes.filter((prize) => prize.type !== "wallet" && prize.type !== "temporary_rank"));
  const weighted = eligible.map((prize) => {
    const tier = String(prize.tier);
    const multiplier =
      tier === "lose" ? Math.max(0.22, 1 - luck / 120) :
      tier === "common" ? 1 + luck / 140 :
      tier === "good" ? 1 + luck / 90 :
      tier === "rare" ? 1 + luck / 55 :
      1 + luck / 35;
    return { prize, weight: Math.max(0.1, prize.weight * multiplier) };
  });
  let cursor = Math.random() * weighted.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.prize;
  }
  return weighted[0]?.prize ?? fortunePrizes[0];
}

function applyFortunePrize(user: User, prize: any) {
  if (prize.type === "wallet") user.walletBalance = Number((user.walletBalance + Number(prize.value)).toFixed(2));
  if (prize.type === "points") {
    user.points += Number(prize.value);
    updateRank(user);
  }
  if (prize.type === "rank") {
    const ranks = getRanks().filter((rank) => rank.name !== "Niga");
    const currentIndex = Math.max(0, ranks.findIndex((rank) => rank.name === user.rank));
    user.rank = ranks[Math.min(currentIndex + 1, ranks.length - 1)]?.name ?? user.rank;
  }
  if (prize.type === "temporary_rank") {
    user.rank = "Niga";
    user.temporaryRankUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }
}

function getRanks() {
  return RANK_TABLE;
}

function updateRank(user: User) {
  const ranks = getRanks().filter((rank) => rank.name !== "Niga");
  const best = ranks.reduce((current, rank) => (user.points >= rank.minPoints ? rank : current), ranks[0]);
  if (user.rank === "Nega") user.rank = "Niga";
  if (user.rank === "Niga") {
    if (user.temporaryRankUntil && Date.parse(user.temporaryRankUntil) > Date.now()) return;
    delete user.temporaryRankUntil;
  }
  const currentIndex = Math.max(0, ranks.findIndex((rank) => rank.name === user.rank));
  const bestIndex = Math.max(0, ranks.findIndex((rank) => rank.name === best.name));
  user.rank = ranks[Math.max(currentIndex, bestIndex)]?.name ?? best.name;
}

function getRankDiscountPercent(user: User) {
  updateRank(user);
  return Number(getRanks().find((rank) => rank.name === user.rank || rank.nameAr === user.rank)?.discountPercent ?? 0);
}

function productResponse(product: any) {
  const game = games.find((item) => item.id === product.gameId);
  return { ...product, gameName: product.gameName || game?.name || "", imageUrl: product.imageUrl || SERVICE_IMAGE_BY_GAME_ID[Number(product.gameId)] || game?.imageUrl || "/images/logo/logo.png" };
}

function ticketWithMessages(ticket: any) {
  const msgs = ticketMessages.filter((message) => message.ticketId === ticket.id);
  return { 
    id: ticket.id,
    userId: ticket.userId,
    userName: ticket.userName || "",
    title: ticket.title || ticket.subject || "طلب دعم",
    status: ticket.status,
    createdAt: typeof ticket.createdAt === "string" ? ticket.createdAt : ticket.createdAt,
    messages: msgs.map(m => ({
      id: m.id,
      ticketId: m.ticketId,
      senderId: m.senderId,
      senderName: m.senderName,
      message: m.message,
      isAdmin: m.isAdmin ?? (m.senderRole === "admin" || m.senderRole === "owner"),
      createdAt: typeof m.createdAt === "string" ? m.createdAt : m.createdAt
    }))
  };
}

app.get("/api/health", (_req, res) => res.json({ ok: true, mode: "local-memory" }));

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  
  // Rate limiting login attempts
  const limitKey = `login:${email}:${req.ip}`;
  const rateLimit = checkRateLimit(limitKey, 5, 5 * 60 * 1000);
  if (!rateLimit.ok) {
    return res.status(429).json({ error: rateLimit.message });
  }

  const user = users.find((item) => item.email.toLowerCase() === email);
  if (!user || passwords.get(user.id) !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: "Account is banned" });
  }

  // Determine if user requires 2FA or first-time setup
  const requires2FA = user.twoFactorEnabled;
  const requiresSetup = !user.twoFactorEnabled && (
    user.twoFactorRequired ||
    user.role === "admin" ||
    user.role === "owner" ||
    user.email.toLowerCase() === "tthhaaeeeerr@gmail.com" ||
    user.email.toLowerCase() === "qtybhrbas774@gmail.com"
  );

  if (requires2FA) {
    const challengeToken = generateChallengeToken(user.id, "login");
    logSecurityEvent({ userId: user.id, action: "2FA login challenge issued", ip: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({
      requires2FA: true,
      challengeToken,
      expiresIn: 300
    });
  }

  if (requiresSetup) {
    const secret = generateBase32Secret();
    user.twoFactorSecret = encrypt(secret);
    
    const otpauthUrl = `otpauth://totp/Grove%20Street:${user.email}?secret=${secret}&issuer=Grove%20Street`;
    
    // Generate QR code SVG locally
    const qr = qrcodeLib(0, "M");
    qr.addData(otpauthUrl);
    qr.make();
    const qrCodeSvg = qr.createSvgTag({ cellSize: 4, margin: 4 });
    
    const challengeToken = generateChallengeToken(user.id, "setup");
    pendingTwoFactorSetups.set(challengeToken, { userId: user.id, secret, expiresAt: Date.now() + 5 * 60 * 1000 });
    
    logSecurityEvent({ userId: user.id, action: "2FA setup started", ip: req.ip, userAgent: req.headers["user-agent"] });
    
    return res.json({
      requiresSetup2FA: true,
      challengeToken,
      secret,
      qrCode: qrCodeSvg,
      expiresIn: 300
    });
  }

  // Normal login without 2FA
  logSecurityEvent({ userId: user.id, action: "Login success (No 2FA)", ip: req.ip, userAgent: req.headers["user-agent"] });
  return res.json({ user: publicUser(user), token: signToken(user.id) });
});

app.post("/api/auth/verify-2fa", (req, res) => {
  const { challengeToken } = req.body;
  const code = cleanTotpCode(req.body?.code);
  if (!challengeToken) {
    return res.status(400).json({ error: "Missing 2FA challenge token" });
  }
  if (!code) {
    return res.status(400).json({ error: "Missing 2FA code" });
  }
  if (!/^\d{6}$/.test(code) && !/^[a-f0-9]{8}$/i.test(code)) {
    return res.status(400).json({ error: "Invalid or expired 2FA code" });
  }

  // Rate limiting verify-2fa
  const rateLimit = checkRateLimit(`verify2fa:${challengeToken}:${req.ip}`, 5, 5 * 60 * 1000);
  if (!rateLimit.ok) {
    return res.status(429).json({ error: rateLimit.message });
  }

  const verified = verifyChallengeToken(challengeToken, { consume: false });
  if (!verified) {
    return res.status(400).json({ error: "2FA setup expired please login again" });
  }

  const { userId, purpose } = verified;
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (purpose === "login") {
    // Check TOTP code
    const plainSecret = decrypt(user.twoFactorSecret);
    let isValid = verifyTOTP(plainSecret, code, 1);

    // If invalid, check if it's a backup code
    if (!isValid && code.length === 8) {
      const backupArray = JSON.parse(decrypt(user.twoFactorBackupCodes) || "[]");
      const idx = backupArray.indexOf(code);
      if (idx !== -1) {
        backupArray.splice(idx, 1);
        user.twoFactorBackupCodes = encrypt(JSON.stringify(backupArray));
        isValid = true;
        logSecurityEvent({ userId: user.id, action: "backup code used", ip: req.ip, userAgent: req.headers["user-agent"] });
      }
    }

    if (!isValid) {
      logTwoFactorDebug({ hasChallengeToken: true, hasSecret: Boolean(plainSecret), setupMode: false, codeLength: code.length, verificationResult: false });
      logSecurityEvent({ userId: user.id, action: "2FA login failed", ip: req.ip, userAgent: req.headers["user-agent"] });
      return res.status(400).json({ error: "Invalid or expired 2FA code" });
    }

    logTwoFactorDebug({ hasChallengeToken: true, hasSecret: Boolean(plainSecret), setupMode: false, codeLength: code.length, verificationResult: true });
    logSecurityEvent({ userId: user.id, action: "2FA login success", ip: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ user: publicUser(user), token: signToken(user.id) });
  }

  if (purpose === "setup") {
    // Check TOTP code
    const pendingSetup = pendingTwoFactorSetups.get(String(challengeToken));
    if (pendingSetup && (pendingSetup.userId !== user.id || pendingSetup.expiresAt < Date.now())) {
      pendingTwoFactorSetups.delete(String(challengeToken));
      return res.status(400).json({ error: "2FA setup expired please login again" });
    }
    const plainSecret = pendingSetup?.secret || decrypt(user.twoFactorSecret);
    const isValid = verifyTOTP(plainSecret, code, 1);

    if (!isValid) {
      logTwoFactorDebug({ hasChallengeToken: true, hasSecret: Boolean(plainSecret), setupMode: true, codeLength: code.length, verificationResult: false });
      return res.status(400).json({ error: "Invalid or expired 2FA code" });
    }

    // Set 2FA enabled
    user.twoFactorEnabled = true;
    user.twoFactorSecret = encrypt(plainSecret);
    user.twoFactorVerifiedAt = new Date().toISOString();
    
    // Generate backup codes
    const backupCodes = generateBackupCodes(8);
    user.twoFactorBackupCodes = encrypt(JSON.stringify(backupCodes));
    pendingTwoFactorSetups.delete(String(challengeToken));

    logTwoFactorDebug({ hasChallengeToken: true, hasSecret: Boolean(plainSecret), setupMode: true, codeLength: code.length, verificationResult: true });
    logSecurityEvent({ userId: user.id, action: "2FA enabled", ip: req.ip, userAgent: req.headers["user-agent"] });

    return res.json({
      success: true,
      token: signToken(user.id),
      user: publicUser(user),
      backupCodes
    });
  }

  return res.status(400).json({ error: "Invalid challenge purpose" });
});

app.post("/api/auth/enable-2fa", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;

  const rateLimit = checkRateLimit(`enable2fa:${user.id}:${req.ip}`, 5, 5 * 60 * 1000);
  if (!rateLimit.ok) {
    return res.status(429).json({ error: rateLimit.message });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: "2FA is already enabled" });
  }

  const secret = generateBase32Secret();
  user.twoFactorSecret = encrypt(secret);
  
  const otpauthUrl = `otpauth://totp/Grove%20Street:${user.email}?secret=${secret}&issuer=Grove%20Street`;
  
  const qr = qrcodeLib(0, "M");
  qr.addData(otpauthUrl);
  qr.make();
  const qrCodeSvg = qr.createSvgTag({ cellSize: 4, margin: 4 });
  
  const challengeToken = generateChallengeToken(user.id, "setup");
  pendingTwoFactorSetups.set(challengeToken, { userId: user.id, secret, expiresAt: Date.now() + 5 * 60 * 1000 });

  logSecurityEvent({ userId: user.id, action: "2FA setup started", ip: req.ip, userAgent: req.headers["user-agent"] });

  return res.json({
    requiresSetup2FA: true,
    challengeToken,
    secret,
    qrCode: qrCodeSvg,
    expiresIn: 300
  });
});

app.post("/api/auth/disable-2fa", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;

  const rateLimit = checkRateLimit(`disable2fa:${user.id}:${req.ip}`, 5, 5 * 60 * 1000);
  if (!rateLimit.ok) {
    return res.status(429).json({ error: rateLimit.message });
  }

  const { password, code } = req.body;
  if (!password || !code) {
    return res.status(400).json({ error: "Password and verification code are required" });
  }

  // Admins and owners cannot disable 2FA
  if (user.role === "admin" || user.role === "owner" || user.twoFactorRequired) {
    return res.status(403).json({ error: "Two-Factor Authentication is mandatory for administrative accounts and cannot be disabled." });
  }

  // Check password
  if (passwords.get(user.id) !== password) {
    return res.status(400).json({ error: "Incorrect password" });
  }

  // Verify TOTP code
  const plainSecret = decrypt(user.twoFactorSecret);
  const isValid = verifyTOTP(plainSecret, code);
  if (!isValid) {
    return res.status(400).json({ error: "Invalid two factor verification code" });
  }

  // Disable 2FA
  user.twoFactorEnabled = false;
  user.twoFactorSecret = null;
  user.twoFactorVerifiedAt = null;
  user.twoFactorBackupCodes = null;

  logSecurityEvent({ userId: user.id, action: "2FA disabled", ip: req.ip, userAgent: req.headers["user-agent"] });

  return res.json({ success: true, message: "Two-Factor Authentication disabled successfully." });
});

// Admin Reset 2FA route
app.post("/api/admin/users/:id/reset-2fa", (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;

  if (actor.role !== "owner") {
    return res.status(403).json({ error: "Only the Owner can reset Two-Factor Authentication for administrative accounts." });
  }

  const targetId = Number(req.params.id);
  const targetUser = users.find((u) => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({ error: "User not found" });
  }

  // Reset 2FA
  targetUser.twoFactorEnabled = false;
  targetUser.twoFactorSecret = null;
  targetUser.twoFactorVerifiedAt = null;
  targetUser.twoFactorBackupCodes = null;

  logSecurityEvent({
    userId: targetUser.id,
    action: "2FA reset by owner",
    actorId: actor.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"]
  });

  return res.json({ success: true, message: `Two-Factor Authentication has been reset successfully for ${targetUser.name}.` });
});

app.post("/api/debug/reset-2fa", (req, res) => {
  if (process.env["NODE_ENV"] === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const targetUser = users.find((u) => u.email.toLowerCase() === email);
  if (!targetUser) return res.status(404).json({ error: "User not found" });
  targetUser.twoFactorEnabled = false;
  targetUser.twoFactorSecret = null;
  targetUser.twoFactorVerifiedAt = null;
  targetUser.twoFactorBackupCodes = null;
  targetUser.twoFactorRequired = targetUser.role === "admin" || targetUser.role === "owner" || targetUser.twoFactorRequired;
  for (const [token, setup] of pendingTwoFactorSetups.entries()) {
    if (setup.userId === targetUser.id) pendingTwoFactorSetups.delete(token);
  }
  logSecurityEvent({ userId: targetUser.id, action: "2FA reset in local dev", ip: req.ip, userAgent: req.headers["user-agent"] });
  return res.json({ success: true, message: "2FA reset for local development" });
});

app.post("/api/auth/register", (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email || users.some((user) => user.email.toLowerCase() === email)) return res.status(400).json({ error: "Email is already used" });
  const gender = req.body?.gender === "female" ? "female" : "male";
  const user: User = {
    id: users.length + 1,
    name: req.body?.name || "مستخدم جديد",
    username: req.body?.username || email.split("@")[0],
    email,
    role: "user",
    walletBalance: 0,
    points: 0,
    rank: "Bronze",
    isVerified: false,
    isBanned: false,
    gender,
    createdAt: now(),
    twoFactorEnabled: false,
    twoFactorRequired: false,
  };
  users.push(user);
  passwords.set(user.id, String(req.body?.password ?? "123456"));
  return res.status(201).json({ user: publicUser(user), token: signToken(user.id) });
});

app.get("/api/auth/me", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json(publicUser(user));
});

app.patch("/api/auth/me", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const allowed = ["name", "username", "phone", "gender", "avatar"];
  for (const key of allowed) {
    if (req.body?.[key] !== undefined) (user as any)[key] = req.body[key];
  }
  res.json(publicUser(user));
});

app.post("/api/auth/change-password", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  const currentPassword = String(req.body?.currentPassword ?? "");
  const nextPassword = String(req.body?.newPassword ?? "");
  if (passwords.get(user.id) !== currentPassword) return res.status(400).json({ error: "Current password is incorrect" });
  if (nextPassword.length < 6) return res.status(400).json({ error: "Password is too short" });
  passwords.set(user.id, nextPassword);
  return res.json({ ok: true });
});

app.get("/api/wallet", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json({ balance: user.walletBalance });
});
app.get("/api/points", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  updateRank(user);
  const ranks = getRanks();
  const currentIndex = Math.max(0, ranks.findIndex((rank) => rank.name === user.rank || rank.nameAr === user.rank));
  const current = ranks[currentIndex] ?? ranks[0];
  const next = ranks[currentIndex + 1] ?? null;
  res.json({
    points: user.points,
    rank: current.name,
    rankAr: current.nameAr,
    nextRank: next?.name ?? null,
    nextRankAr: next?.nameAr ?? null,
    progressPercent: next ? Math.min(100, Math.round((user.points / next.minPoints) * 100)) : 100,
    pointsToNext: next ? Math.max(0, next.minPoints - user.points) : 0,
  });
});
app.get("/api/points/history", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json(transactions
    .filter((item) => item.userId === user.id && item.type === "points")
    .map((item) => ({ id: item.id, points: item.points, reason: item.description, createdAt: item.createdAt })));
});
app.get("/api/rewards", (_req, res) => {
  res.json(walletRewards.map((reward) => ({ ...reward, imageUrl: "", isActive: true })));
});
app.post("/api/rewards/:id/redeem", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  const reward = walletRewards.find((item) => item.id === Number(req.params.id));
  if (!reward) return res.status(404).json({ error: "Reward not found" });
  if (user.points < reward.pointsCost) return res.status(400).json({ error: "Insufficient points" });

  user.points -= reward.pointsCost;
  user.walletBalance = Number((user.walletBalance + reward.walletCredit).toFixed(2));
  updateRank(user);
  transactions = [
    { id: transactions.length + 1, userId: user.id, amount: reward.walletCredit, type: "credit", description: `استبدال نقاط برصيد ${reward.walletCredit} د.أ`, createdAt: now() },
    { id: transactions.length + 2, userId: user.id, points: -reward.pointsCost, type: "points", description: `استبدال ${reward.nameAr}`, createdAt: now() },
    ...transactions,
  ];
  makeActivity({ message: `${user.name} redeemed wallet credit`, messageAr: `${user.name} استبدل نقاطه برصيد ${reward.walletCredit} د.أ`, type: "points", user });
  return res.json({ success: true, newBalance: user.points, walletBalance: user.walletBalance, reward });
});
app.post("/api/fortune-wheel/spin", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;

  const userKey = String(user.id);
  const { liveControls } = readFortuneState();
  const globalConfig = {
    globalLuck: 0,
    forcedPrizeId: "auto",
    globalSpinGrants: 0,
    updatedAt: 0,
    ...(liveControls.fortuneGlobalConfig ?? {}),
  };
  const fortuneUserConfigs = liveControls.fortuneUserConfigs ?? {};
  const userConfig = {
    luckOverride: null,
    extraSpins: 0,
    forcedPrizeId: "auto",
    globalSpinsUsed: 0,
    ...(fortuneUserConfigs[userKey] ?? {}),
  };

  const unusedGlobalSpins = Math.max(0, Number(globalConfig.globalSpinGrants) - Number(userConfig.globalSpinsUsed));
  const bonusSpins = Math.max(0, Number(userConfig.extraSpins)) + unusedGlobalSpins;
  const lastSpin = Number(fortuneLastSpins[userKey] ?? 0);
  const nowMs = Date.now();
  if (bonusSpins <= 0 && nowMs - lastSpin < SPIN_INTERVAL_MS && user.role !== "admin" && user.role !== "owner") {
    return res.status(429).json({ error: "Fortune wheel is not ready yet", nextSpinAt: lastSpin + SPIN_INTERVAL_MS });
  }

  const prize = chooseFortunePrize(globalConfig, userConfig);
  if (user.role !== "admin" && user.role !== "owner") {
    if (userConfig.extraSpins > 0) userConfig.extraSpins -= 1;
    else if (unusedGlobalSpins > 0) userConfig.globalSpinsUsed += 1;
    else fortuneLastSpins[userKey] = nowMs;
  }
  if (userConfig.forcedPrizeId !== "auto") userConfig.forcedPrizeId = "auto";
  if (prize.type === "extra_spin") userConfig.extraSpins += 1;

  applyFortunePrize(user, prize);
  fortuneUserConfigs[userKey] = userConfig;
  writeFortuneState({ ...liveControls, fortuneGlobalConfig: globalConfig, fortuneUserConfigs });
  makeActivity({ message: `${user.name} spun the fortune wheel`, messageAr: `${user.name} ربح من دولاب الحظ`, type: "points", user });
  return res.json({ prizeId: prize.id, user: publicUser(user), userConfig, globalConfig, lastSpin: fortuneLastSpins[userKey] ?? lastSpin });
});
app.get("/api/wallet/transactions", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json(transactions.filter((item) => item.userId === user.id));
});
app.get("/api/wallet/deposits", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json(deposits.filter((item) => item.userId === user.id));
});
app.post("/api/wallet/deposits", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 1) return res.status(400).json({ error: "Minimum deposit amount is 1 JOD" });
  const deposit = { id: deposits.length + 1, userId: user.id, userName: user.name, amount, method: req.body?.method, status: "pending", notes: req.body?.notes ?? "", receiptUrl: req.body?.receiptUrl ?? "", createdAt: now() };
  deposits = [deposit, ...deposits];
  makeActivity({ message: `${user.name} requested wallet top-up`, messageAr: `${user.name} طلب شحن رصيد بقيمة ${amount} د.أ`, type: "wallet", user });
  return res.status(201).json(deposit);
});
app.get("/api/wallet/deposits/all", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  res.json(deposits);
});

app.post("/api/wallet/deposits/:id/approve", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;

  const deposit = deposits.find((item) => item.id === Number(req.params.id));
  if (!deposit) return res.status(404).json({ error: "Deposit not found" });

  const isAlreadyProcessed = deposit.status !== "pending";
  if (isAlreadyProcessed) {
    if (deposit.status === "approved") {
      return res.status(400).json({ error: "Deposit is already approved" });
    }
    if (admin.role !== "owner") {
      return res.status(403).json({ error: "Deposit is already processed. Only owner can re-approve." });
    }
  }

  deposit.status = "approved";
  const user = users.find((item) => item.id === deposit.userId);
  if (user) {
    const oldBalance = user.walletBalance;
    user.walletBalance = Number((user.walletBalance + deposit.amount).toFixed(2));
    transactions = [{ id: transactions.length + 1, userId: deposit.userId, amount: deposit.amount, type: "credit", description: `شحن محفظة - ${deposit.method}`, createdAt: now() }, ...transactions];
    makeActivity({ message: `${user.name} topped up wallet`, messageAr: `${user.name} شحن رصيده بقيمة ${deposit.amount} د.أ`, type: "wallet", user });
  }

  return res.json(deposit);
});

app.post("/api/wallet/deposits/:id/reject", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;

  const deposit = deposits.find((item) => item.id === Number(req.params.id));
  if (!deposit) return res.status(404).json({ error: "Deposit not found" });

  const isAlreadyProcessed = deposit.status !== "pending";
  if (isAlreadyProcessed) {
    if (deposit.status === "rejected") {
      return res.status(400).json({ error: "Deposit is already rejected" });
    }
    if (admin.role !== "owner") {
      return res.status(403).json({ error: "Deposit is already approved. Only owner can reject." });
    }
  }

  const oldStatus = deposit.status;
  deposit.status = "rejected";
  
  const user = users.find((item) => item.id === deposit.userId);
  if (user && oldStatus === "approved") {
    // Reverse wallet balance if it was previously approved!
    user.walletBalance = Math.max(0, Number((user.walletBalance - deposit.amount).toFixed(2)));
    transactions = [{ id: transactions.length + 1, userId: deposit.userId, amount: -deposit.amount, type: "debit", description: `عكس شحن محفظة - إلغاء إيداع #${deposit.id}`, createdAt: now() }, ...transactions];
  }

  return res.json(deposit);
});


app.get("/api/games", (_req, res) => res.json(games.filter((game) => game.isActive)));
app.post("/api/games", (req, res) => {
  const game = { id: games.length + 1, isActive: true, imageUrl: "/images/logo/logo.png", ...req.body };
  games.push(game);
  res.status(201).json(game);
});

app.get("/api/products/trending", (_req, res) => res.json(products.filter((product) => product.isTrending || product.isFeatured).slice(0, 8).map(productResponse)));
app.get("/api/products", (req, res) => {
  const category = req.query.category ? String(req.query.category) : "";
  const gameId = req.query.gameId ? Number(req.query.gameId) : 0;
  const includeInactive = String(req.query.includeInactive ?? "") === "true";
  res.json(products.filter((product) => (includeInactive || product.isActive !== false) && (!gameId || product.gameId === gameId) && (!category || product.category === category)).map(productResponse));
});
app.post("/api/products", (req, res) => {
  const game = games.find((item) => item.id === Number(req.body?.gameId));
  const product = { id: products.length + 1, isActive: true, isFeatured: false, isTrending: false, imageUrl: game?.imageUrl ?? "/images/logo/logo.png", gameName: game?.name ?? "", ...req.body };
  products.push(product);
  res.status(201).json(productResponse(product));
});
app.get("/api/products/:id", (req, res) => res.json(productResponse(products.find((product) => product.id === Number(req.params.id)) ?? products[0])));
app.patch("/api/products/:id", (req, res) => {
  const product = products.find((item) => item.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  Object.assign(product, req.body);
  return res.json(productResponse(product));
});
app.delete("/api/products/:id", (req, res) => {
  const index = products.findIndex((item) => item.id === Number(req.params.id));
  if (index >= 0) products.splice(index, 1);
  res.status(204).end();
});
app.get("/api/orders", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json(orders.filter((order) => order.userId === user.id));
});

app.get("/api/orders/all", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  res.json(orders);
});

app.get("/api/orders/:id", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;

  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });

  const isAdmin = user.role === "admin" || user.role === "owner";
  if (order.userId !== user.id && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: You are not authorized to view this order" });
  }

  return res.json(order);
});


app.post("/api/orders", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  const product = products.find((item) => item.id === Number(req.body?.productId)) ?? products[0];
  if (product.isActive === false) return res.status(400).json({ error: "Product is not available" });
  if (product.purchasable === false || product.isOutOfStock === true) return res.status(400).json({ error: "Out of stock" });
  if (Number(product.stock ?? 9999) <= 0) return res.status(400).json({ error: "Out of stock" });
  let userInputData = req.body?.data ?? req.body?.userInputData ?? {};
  if (typeof userInputData === "string") {
    try { userInputData = JSON.parse(userInputData); } catch { userInputData = {}; }
  }
  if (!userInputData || typeof userInputData !== "object") userInputData = {};
  let originalPrice = Number(product.price);
  if (product.category === "social") {
    const link = String(userInputData.socialLink ?? userInputData.link ?? userInputData.url ?? userInputData.profileLink ?? userInputData.videoLink ?? "").trim();
    if (!link) return res.status(400).json({ error: "Social services require a valid account, post, or video link" });
    if (!/^https?:\/\/|^[\w.-]+\.[a-z]{2,}/i.test(link)) return res.status(400).json({ error: "Please enter a valid public link" });
    const isQuantityBased = product.isQuantityBased === true || product.pricingType === "per_unit" || product.priceUnitAmount || product.unitQuantity;
    const unitAmount = Math.max(1, Number(product.priceUnitAmount ?? product.unitQuantity ?? product.minQuantity ?? 1));
    const pricePerUnitJod = Number(product.pricePerUnitJod ?? product.price ?? 0);
    const quantity = Number(userInputData.quantity);
    const minQuantity = Number(product.minQuantity ?? 1);
    if (!Number.isFinite(quantity) || quantity < minQuantity) return res.status(400).json({ error: `Minimum quantity for this service is ${minQuantity}` });
    if (isQuantityBased && quantity % unitAmount !== 0) return res.status(400).json({ error: `Quantity must be a multiple of ${unitAmount}` });
    if (product.maxQuantity && quantity > Number(product.maxQuantity)) return res.status(400).json({ error: `Maximum quantity for this service is ${product.maxQuantity}` });
    originalPrice = isQuantityBased ? Number(((quantity / unitAmount) * pricePerUnitJod).toFixed(3)) : Number(product.price);
    userInputData = {
      ...userInputData,
      socialLink: link,
      quantity,
      unitAmount,
      pricePerUnitJod,
      totalPriceJod: originalPrice,
    };
  }
  const discountPercent = product.category === "social" ? 0 : getRankDiscountPercent(user);
  const finalPrice = Number((originalPrice * (1 - discountPercent / 100)).toFixed(3));
  if (user.walletBalance < finalPrice) return res.status(400).json({ error: "Insufficient wallet balance" });
  
  // Deduct balance
  user.walletBalance = Number((user.walletBalance - finalPrice).toFixed(3));
  
  // Points are awarded only once when the order is completed.
  const pointsEarned = Math.floor(finalPrice) * 10;
  
  const fulfillmentType = product.fulfillmentType ?? "manual";
  const initialStatus = fulfillmentType === "api" ? "pending" : "pending_review";
  
  const order = { 
    id: orders.length + 1, 
    userId: user.id, 
    userName: user.name, 
    productId: product.id, 
    productName: product.name,
    productNameAr: product.nameAr, 
    price: finalPrice,
    amount: finalPrice,
    originalPrice,
    discountPercent,
    quantity: userInputData.quantity,
    unitAmount: userInputData.unitAmount,
    pricePerUnitJod: userInputData.pricePerUnitJod,
    totalPriceJod: userInputData.totalPriceJod,
    fulfillmentType,
    status: initialStatus, 
    userInputData, 
    pointsEarned,
    earnedPoints: pointsEarned,
    notes: "",
    createdAt: now() 
  };
  
  orders = [order, ...orders];
  transactions = [{ id: transactions.length + 1, userId: user.id, amount: -finalPrice, type: "debit", description: `شراء ${product.nameAr}`, createdAt: now() }, ...transactions];
  makeActivity({ message: `${user.name} bought ${product.name}`, messageAr: `${user.name} اشترى ${product.nameAr}`, type: "purchase", user });
  return res.status(201).json(order);
});

app.patch("/api/orders/:id/status", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;

  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  
  const oldStatus = order.status;
  const newStatus = req.body.status;
  const notes = req.body.notes;
  
  order.status = newStatus;
  if (notes !== undefined) order.notes = notes;
  
  const user = users.find((u) => u.id === order.userId);
  
  // Award points on complete
  if (newStatus === "completed" || newStatus === "executed") {
    if (oldStatus !== "completed" && oldStatus !== "executed" && user) {
      const pointsToAdd = order.pointsEarned ?? Math.floor(order.amount) * 10;
      user.points += pointsToAdd;
      order.pointsAwarded = true;
      updateRank(user);
      
      activities = [{
        id: activities.length + 1,
        message: `${user.name} earned points`,
        messageAr: `حصل ${user.name} على ${pointsToAdd} نقطة لإتمام الطلب #${order.id}`,
        type: "points",
        userName: user.name,
        userRank: user.rank,
        createdAt: now()
      }, ...activities];
    }
  }
  
  // Refund wallet on reject/refund
  if (newStatus === "rejected" || newStatus === "refunded") {
    if (oldStatus !== "rejected" && oldStatus !== "refunded" && user) {
      user.walletBalance = Number((user.walletBalance + order.amount).toFixed(2));
      transactions = [{
        id: transactions.length + 1,
        userId: user.id,
        amount: order.amount,
        type: "credit",
        description: `استرداد قيمة طلب #${order.id} - ${order.productNameAr || order.productName}`,
        createdAt: now()
      }, ...transactions];
      
      activities = [{
        id: activities.length + 1,
        message: `${user.name} was refunded`,
        messageAr: `تم استرداد ${order.amount} د.أ لمحفظة ${user.name} للطلب #${order.id}`,
        type: "wallet",
        userName: user.name,
        userRank: user.rank,
        createdAt: now()
      }, ...activities];
    }
  }
  
  return res.json(order);
});

app.patch("/api/orders/:id", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;

  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });

  const isAdmin = user.role === "admin" || user.role === "owner";
  const newStatus = req.body.status;
  
  if (newStatus !== undefined && newStatus !== order.status) {
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only admin can change order status" });
    }

    const oldStatus = order.status;
    order.status = newStatus;
    const targetUser = users.find((u) => u.id === order.userId);
    
    if (newStatus === "completed" || newStatus === "executed") {
      if (oldStatus !== "completed" && oldStatus !== "executed" && targetUser) {
        const pointsToAdd = order.pointsEarned ?? Math.floor(order.amount / 2);
        targetUser.points += pointsToAdd;
        updateRank(targetUser);
      }
    }
    
    if (newStatus === "rejected" || newStatus === "refunded") {
      if (oldStatus !== "rejected" && oldStatus !== "refunded" && targetUser) {
        targetUser.walletBalance = Number((targetUser.walletBalance + order.amount).toFixed(2));
        transactions = [{
          id: transactions.length + 1,
          userId: targetUser.id,
          amount: order.amount,
          type: "credit",
          description: `استرداد قيمة طلب #${order.id} - ${order.productNameAr || order.productName}`,
          createdAt: now()
        }, ...transactions];
      }
    }
  }
  
  const notes = req.body.notes;
  if (notes !== undefined) {
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only admin can edit order notes" });
    }
    order.notes = notes;
  }
  
  return res.json(order);
});


app.get("/api/ranks/progress", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  updateRank(user);
  const ranks = getRanks();
  const currentIndex = Math.max(0, ranks.findIndex((rank) => rank.name === user.rank || rank.nameAr === user.rank));
  const current = ranks[currentIndex] ?? ranks[0];
  const nextRank = ranks[Math.min(currentIndex + 1, ranks.length - 1)];
  return res.json({ currentRank: current, nextRank, points: user.points, progress: nextRank.minPoints ? Math.min(100, (user.points / nextRank.minPoints) * 100) : 100 });
});
app.get("/api/ranks", (_req, res) => res.json(getRanks()));
app.post("/api/ranks", (req, res) => res.status(201).json({ id: getRanks().length + 1, ...req.body }));

app.get("/api/ads", (_req, res) => res.json(ads));
app.get("/api/activity", (_req, res) => {
  const fakeNames = [
    "أحمد",
    "سارة",
    "ليان",
    "QA User",
    "Fortune Tester",
    "Discount Buyer",
    "Spin Tester",
    "@test.local"
  ];

  const cleaned = activities
    .map((item) => {
      const messageAr = cleanTickerTextSafe(item.messageAr);
      const message = cleanTickerTextSafe(item.message);
      if (!messageAr) return null;

      const userName = String(item.userName || "");
      const userEmail = String((item as any).userEmail || "");
      if (fakeNames.some((name) => messageAr.includes(name) || message.includes(name) || userName.includes(name) || userEmail.includes(name))) {
        return null;
      }

      const rank = item.userRank === "Nega" || item.userRank === "نيقا" ? "Niga" : item.userRank;
      const isNiga = rank === "Niga";
      const isAdminTicker = item.type === "ticker" || item.type === "admin" || item.type === "event";

      return {
        ...item,
        message: message || messageAr,
        messageAr,
        userRank: rank,
        type: isAdminTicker ? "ticker" : item.type,
        textColor: isAdminTicker ? (item.textColor || "#ffffff") : isNiga ? "#22c55e" : "#ffffff",
        imageUrl: isAdminTicker ? (item.imageUrl || "") : isNiga ? "/chargre-badge.png" : "",
        highlightText: isAdminTicker ? messageAr : "",
        isAdminTicker,
        isNiga,
      };
    })
    .filter(Boolean);

  if (cleaned.length === 0) {
    return res.json([
      {
        id: 1,
        message: "Welcome to Grove Street",
        messageAr: "أهلا وسهلا بكم في Grove Street",
        type: "fallback",
        textColor: "#ffffff",
        imageUrl: "",
        highlightText: "",
        isAdminTicker: false,
        isNiga: false,
        createdAt: now(),
      },
      {
        id: 2,
        message: "Top up your wallet and order easily",
        messageAr: "اشحن محفظتك واطلب خدمتك بسهولة",
        type: "fallback",
        textColor: "#ffffff",
        imageUrl: "",
        highlightText: "",
        isAdminTicker: false,
        isNiga: false,
        createdAt: now(),
      },
      {
        id: 3,
        message: "Grove Street for games and digital subscriptions",
        messageAr: "Grove Street لخدمات الألعاب والاشتراكات الرقمية",
        type: "fallback",
        textColor: "#ffffff",
        imageUrl: "",
        highlightText: "",
        isAdminTicker: false,
        isNiga: false,
        createdAt: now(),
      }
    ]);
  }

  return res.json(cleaned);
});

app.get("/api/support/tickets/all", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  return res.json(tickets.map(ticketWithMessages));
});

app.get("/api/support/tickets", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  return res.json(tickets.filter((ticket) => ticket.userId === user.id && ticket.status !== "closed").map(ticketWithMessages));
});

function getSmartAIResponse(title: string, message: string): string {
  let cleanMessage = message;
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
      cleanMessage = parsed.text;
    }
  } catch {}

  const text = `${title} ${cleanMessage}`.toLowerCase();
  if (/wallet|balance|محفظ|رصيد/.test(text)) {
    return "يمكنك متابعة المحفظة من صفحة المحفظة، وأي شحن يحتاج مراجعة إثبات الدفع من الإدارة قبل إضافة الرصيد.";
  }
  if (/order|طلب|شراء|شحن/.test(text)) {
    return "تم استلام طلبك. ستظهر الحالة في صفحة طلباتي، وسيتم تحديثها عند بدء التنفيذ أو اكتمال الخدمة.";
  }
  if (/verification|توثيق|هوية/.test(text)) {
    return "طلبات التوثيق تحتاج صورا واضحة، وستراجعها الإدارة قبل القبول أو الرفض.";
  }
  if (/market|account|حساب|بيع/.test(text)) {
    return "سوق الحسابات يعمل بوساطة Grove Street. لا تضع وسائل تواصل خارجية، وسيتم نشر الإعلان بعد مراجعة الإدارة فقط.";
  }
  return "وصلت رسالتك للدعم. سيقوم الفريق بمراجعتها والرد عليك في أقرب وقت.";
}
app.post("/api/support/tickets", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;

  const title = req.body?.title || req.body?.subject || "طلب دعم";
  const message = req.body?.message || "";

  // Create mock ticket
  const ticket = { 
    id: tickets.length + 1, 
    userId: user.id, 
    userName: user.name, 
    title, 
    status: "open", 
    priority: "normal", 
    createdAt: now(), 
    updatedAt: now() 
  };
  
  tickets = [ticket, ...tickets];

  // 1. Store User Message
  ticketMessages.push({
    id: ticketMessages.length + 1,
    ticketId: ticket.id,
    senderId: user.id,
    senderName: user.name,
    senderRole: user.role,
    message,
    isAdmin: false,
    createdAt: now()
  });

  // 2. Perform AI Assistant scans and insert response automatically
  const aiAnswer = getSmartAIResponse(title, message);
  let aiMessage = "";

  if (aiAnswer) {
    aiMessage = `أهلاً بك! أنا مساعد جروف الذكي. بناءً على تذكرتك، إليك الإجابة المباشرة المخصصة:\n\n${aiAnswer}\n\n(تنبيه: تذكرتك تظل مفتوحة وتحت المراجعة وسيقوم الأدمن بمتابعتها والرد البشري أيضاً في حال لم يتم حل استفسارك بالكامل).`;
  } else {
    aiMessage = `أهلاً بك! تم استلام تذكرتك بنجاح وبشكل تلقائي. لم أتمكن من إيجاد إجابة مباشرة لسؤالك، لذلك قمت بتحويلها فوراً وتنبيه الأدمن لمراجعة تفاصيل مشكلتك وحلها يدوياً بأسرع وقت ممكن. يرجى الانتظار.`;
  }

  // Store AI reply
  ticketMessages.push({
    id: ticketMessages.length + 1,
    ticketId: ticket.id,
    senderId: 9999,
    senderName: "مساعد جروف / GC Assistant",
    message: aiMessage,
    isAdmin: true,
    createdAt: now()
  });

  res.status(201).json(ticketWithMessages(ticket));
});
app.get("/api/support/tickets/:id", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;

  const ticket = tickets.find((item) => item.id === Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const isAdmin = user.role === "admin" || user.role === "owner";
  if (ticket.userId !== user.id && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: You are not authorized to view this ticket" });
  }

  return res.json(ticketWithMessages(ticket));
});

app.post("/api/support/tickets/:id/reply", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;

  const ticket = tickets.find((item) => item.id === Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const isAdmin = user.role === "admin" || user.role === "owner";
  if (ticket.userId !== user.id && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: You are not authorized to reply to this ticket" });
  }

  if (user.role === "user") {
    ticket.status = "open";
  }
  ticket.updatedAt = now();
  const message = { 
    id: ticketMessages.length + 1, 
    ticketId: ticket.id, 
    senderId: user.id, 
    senderName: user.name, 
    senderRole: user.role, 
    message: req.body?.message || "", 
    images: req.body?.images ?? [], 
    isAdmin, 
    createdAt: now() 
  };
  ticketMessages.push(message);
  return res.status(201).json(message);
});

app.post("/api/support/tickets/:id/status", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;

  const ticket = tickets.find((item) => item.id === Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Missing status" });

  ticket.status = status;
  ticket.updatedAt = now();
  return res.json(ticketWithMessages(ticket));
});

app.post("/api/support/tickets/:id/close", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;

  const ticket = tickets.find((item) => item.id === Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const isAdmin = user.role === "admin" || user.role === "owner";
  if (ticket.userId !== user.id && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: You cannot close this ticket" });
  }

  ticket.status = "closed";
  ticket.updatedAt = now();
  return res.json(ticketWithMessages(ticket));
});


let verifications: any[] = [];

app.get("/api/verification/all", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  res.json(verifications);
});

app.get("/api/verification", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  const v = verifications.find((item) => item.userId === user.id);
  if (!v) return res.status(404).json({ error: "No verification request" });
  return res.json(v);
});

app.post("/api/verification", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  
  const { fullName, phone, idImageUrl, backImageUrl, selfieUrl, documentType, userNotes } = req.body;
  if (!fullName || !phone) return res.status(400).json({ error: "Missing required fields" });

  // Simple size and type checking for mock base64 strings
  const checkImage = (dataUri: string | undefined, name: string) => {
    if (!dataUri || !dataUri.startsWith("data:")) return true;
    const match = dataUri.match(/^data:(.*?);base64,/);
    if (!match) return false;
    const mime = match[1] || "";
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"].includes(mime)) return false;
    const base64 = dataUri.replace(/^data:.*?;base64,/, "");
    const size = Math.ceil((base64.length * 3) / 4);
    if (size > 10 * 1024 * 1024) return false; // 10MB limit
    return true;
  };

  if (!checkImage(idImageUrl, "ID Front") || !checkImage(backImageUrl, "ID Back") || !checkImage(selfieUrl, "Selfie")) {
    return res.status(400).json({ error: "Invalid image upload. Allowed types: PNG, JPEG, JPG, WEBP, GIF. Max size: 10MB." });
  }
  
  let v = verifications.find((item) => item.userId === user.id);
  if (v) {
    v.fullName = fullName;
    v.phone = phone;
    v.idImageUrl = idImageUrl ?? "";
    v.backImageUrl = backImageUrl ?? "";
    v.selfieUrl = selfieUrl ?? "";
    v.documentType = documentType ?? "national_id";
    v.userNotes = userNotes ?? "";
    v.status = "pending";
    v.adminNotes = "";
    v.createdAt = now();
  } else {
    v = {
      id: verifications.length + 1,
      userId: user.id,
      userName: user.name,
      fullName,
      phone,
      idImageUrl: idImageUrl ?? "",
      backImageUrl: backImageUrl ?? "",
      selfieUrl: selfieUrl ?? "",
      documentType: documentType ?? "national_id",
      userNotes: userNotes ?? "",
      status: "pending",
      adminNotes: "",
      createdAt: now()
    };
    verifications.push(v);
  }
  
  user.isVerified = false;
  return res.status(201).json(v);
});

app.post("/api/verification/:id/approve", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;

  const v = verifications.find((item) => item.id === Number(req.params.id));
  if (!v) return res.status(404).json({ error: "Verification not found" });
  v.status = "approved";
  const user = users.find((item) => item.id === v.userId);
  if (user) {
    user.isVerified = true;
    activities = [{ id: activities.length + 1, message: `${user.name}'s identity is verified`, messageAr: `تم توثيق هوية المستخدم ${user.name} بنجاح`, type: "system", userName: user.name, userRank: user.rank, createdAt: now() }, ...activities];
  }
  return res.json(v);
});

app.post("/api/verification/:id/reject", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;

  const v = verifications.find((item) => item.id === Number(req.params.id));
  if (!v) return res.status(404).json({ error: "Verification not found" });
  const { adminNotes } = req.body;
  v.status = "rejected";
  v.adminNotes = adminNotes ?? "لم يتم إرسال صور واضحة";
  const user = users.find((item) => item.id === v.userId);
  if (user) {
    user.isVerified = false;
  }
  return res.json(v);
});


const getUsersHandler = (req: express.Request, res: express.Response) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  res.json(users.map(publicUser));
};

app.get("/api/admin/users", getUsersHandler);
app.get("/api/users", getUsersHandler);

app.get("/api/users/:id", (req, res) => {
  const currentUser = requireUser(req, res);
  if (!currentUser) return res;

  const rawId = Number(req.params.id);
  const user = users.find((item) => item.id === rawId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
  if (currentUser.id !== rawId && !isAdmin) {
    return res.status(403).json({ error: "Forbidden: You can only view your own profile" });
  }

  return res.json(publicUser(user));
});


const patchUserHandler = (req: express.Request, res: express.Response) => {
  const user = users.find((item) => item.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  const requester = requireUser(req, res);
  if (!requester) return res;

  const isAdminRoute = req.path.startsWith("/api/admin/");
  const requesterIsAdmin = requester.role === "admin" || requester.role === "owner";
  const requesterIsOwner = requester.role === "owner";
  const targetIsProtected = user.email === "tthhaaeeeerr@gmail.com" || user.email === "qtybhrbas774@gmail.com";
  if (isAdminRoute && !requesterIsAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  // Administrative-only fields check
  const hasAdminFields = req.body.role !== undefined || req.body.walletBalance !== undefined || req.body.points !== undefined || req.body.rank !== undefined || req.body.isVerified !== undefined || req.body.isBanned !== undefined;
  if (hasAdminFields && !requesterIsAdmin) {
    return res.status(403).json({ error: "Forbidden: Only admins can modify system properties, balances, or roles" });
  }

  if (!isAdminRoute && !requesterIsAdmin) {
    if (requester.id !== user.id) return res.status(403).json({ message: "لا تملك صلاحية تعديل هذا المستخدم" });
    const allowed = ["name", "username", "phone", "gender", "avatar"];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) sanitized[key] = req.body[key];
    }
    Object.assign(user, sanitized);
    return res.json(publicUser(user));
  }

  if (req.body.role === "owner" && !requesterIsOwner) {
    return res.status(403).json({ message: "لا يمكن تعيين مالك إلا من حساب مالك" });
  }

  if (!requesterIsOwner) {
    if (targetIsProtected) {
      return res.status(403).json({ message: "لا يمكن تعديل حساب إدارة محمي إلا من المالك" });
    }
    if (user.role !== "user") {
      return res.status(403).json({ message: "الأدمن يستطيع تعديل المستخدمين العاديين فقط" });
    }
    if (req.body.role === "admin") {
      return res.status(403).json({ message: "لا يمكن ترقية المستخدمين إلى أدمن إلا من المالك" });
    }
  }

  // Record action if balance or points change
  const oldBalance = user.walletBalance;
  const oldPoints = user.points;

  Object.assign(user, req.body);
  
  if (typeof req.body?.password === "string" && req.body.password.length >= 6) {
    passwords.set(user.id, req.body.password);
  }

  // Adjust rank if points changed
  if (req.body.points !== undefined && req.body.points !== oldPoints && req.body.rank === undefined) {
    updateRank(user);
  }

  // Log admin actions
  if (req.body.walletBalance !== undefined && Number(req.body.walletBalance) !== oldBalance) {
    const diff = Number(req.body.walletBalance) - oldBalance;
    const actionDesc = diff > 0 ? `إضافة رصيد بقيمة ${diff.toFixed(2)} د.أ` : `خصم رصيد بقيمة ${Math.abs(diff).toFixed(2)} د.أ`;
    activities = [{
      id: activities.length + 1,
      message: `Admin adjusted balance for ${user.name}`,
      messageAr: `قام الأدمن بـ ${actionDesc} للمستخدم ${user.name}`,
      type: "wallet",
      userName: user.name,
      userRank: user.rank,
      createdAt: now()
    }, ...activities];
  }

  return res.json(publicUser(user));
};

app.patch("/api/admin/users/:id", patchUserHandler);
app.patch("/api/users/:id", patchUserHandler);

app.post("/api/users/:id/ban", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;

  const id = Number(req.params.id);
  const user = users.find((item) => item.id === id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.role === "owner" || user.email === "tthhaaeeeerr@gmail.com" || user.email === "qtybhrbas774@gmail.com") {
    return res.status(403).json({ error: "Cannot ban owner or super admin" });
  }

  user.isBanned = true;
  return res.json({ message: "User banned" });
});

let mockSettings = {
  siteName: "Grove Street",
  siteDescription: "شارعك الرقمي لشحن الألعاب والخدمات",
  maintenanceMode: false,
  boysMaintenanceMode: false,
  girlsMaintenanceMode: false,
  contactEmail: "support@grovestreet.gg",
  contactPhone: "0791517855",
  socialLinks: "",
};

function loadMockState() {
  const store = readLocalStore();
  const saved = store["mockApi"] as {
    users?: User[];
    passwords?: Record<string, string>;
    deposits?: any[];
    transactions?: any[];
    orders?: any[];
    tickets?: any[];
    ticketMessages?: any[];
    fortuneLastSpins?: Record<string, number>;
    activities?: any[];
    verifications?: any[];
    suggestions?: any[];
    tickerSettings?: any;
    mockSettings?: Record<string, unknown>;
  } | undefined;

  if (!saved || typeof saved !== "object") return;
  if (Array.isArray(saved.users)) users.splice(0, users.length, ...saved.users);
  if (saved.passwords && typeof saved.passwords === "object") {
    passwords.clear();
    for (const [userId, password] of Object.entries(saved.passwords)) {
      passwords.set(Number(userId), String(password));
    }
  }
  if (Array.isArray(saved.deposits)) deposits = saved.deposits;
  if (Array.isArray(saved.transactions)) transactions = saved.transactions;
  if (Array.isArray(saved.orders)) orders = saved.orders;
  if (Array.isArray(saved.tickets)) tickets = saved.tickets;
  if (Array.isArray(saved.ticketMessages)) ticketMessages = saved.ticketMessages;
  if (saved.fortuneLastSpins && typeof saved.fortuneLastSpins === "object") fortuneLastSpins = saved.fortuneLastSpins;
  if (Array.isArray(saved.activities)) activities = saved.activities;
  if (Array.isArray(saved.verifications)) verifications = saved.verifications;
  if (Array.isArray(saved.suggestions)) suggestions = saved.suggestions;
  if (saved.tickerSettings && typeof saved.tickerSettings === "object") tickerSettings = { ...tickerSettings, ...saved.tickerSettings };
  if (saved.mockSettings && typeof saved.mockSettings === "object") Object.assign(mockSettings, saved.mockSettings);
  if (Array.isArray((saved as any).marketplaceListings)) marketplaceListings = (saved as any).marketplaceListings;
  if (Array.isArray((saved as any).adminNotifications)) adminNotifications = (saved as any).adminNotifications;
}

function saveMockState() {
  updateLocalStore("mockApi", {
    users,
    passwords: Object.fromEntries(passwords.entries()),
    deposits,
    transactions,
    orders,
    tickets,
    ticketMessages,
    fortuneLastSpins,
    activities,
    verifications,
    suggestions,
    tickerSettings,
    mockSettings,
    marketplaceListings,
    adminNotifications,
  });
}

loadMockState();
applyFinalCatalogFixes();
mockSettings.siteDescription = "شارعك الرقمي لشحن الألعاب والخدمات";

app.get("/api/admin/settings", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  return res.json(mockSettings);
});

app.patch("/api/admin/settings", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;

  const { contactPhone, maintenanceMode, boysMaintenanceMode, girlsMaintenanceMode, socialLinks } = req.body;
  const isChangingMaintenance = maintenanceMode !== undefined || boysMaintenanceMode !== undefined || girlsMaintenanceMode !== undefined;
  const isChangingPaymentNumber = contactPhone !== undefined;
  const isChangingSecurityOptions = socialLinks !== undefined;

  if (isChangingMaintenance || isChangingPaymentNumber || isChangingSecurityOptions) {
    if (admin.role !== "owner") {
      return res.status(403).json({ error: "Forbidden: Only the owner can modify sensitive settings" });
    }
  }

  Object.assign(mockSettings, req.body);
  return res.json(mockSettings);
});

app.get("/api/suggestions", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  const isAdmin = user.role === "admin" || user.role === "owner";
  return res.json(isAdmin ? suggestions : suggestions.filter((item) => item.userId === user.id));
});

app.post("/api/suggestions", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  const title = String(req.body?.title ?? "").trim();
  const message = String(req.body?.message ?? "").trim();
  if (!title || !message) return res.status(400).json({ error: "Title and message are required" });
  const suggestion = {
    id: suggestions.length + 1,
    userId: user.id,
    userName: user.name,
    type: String(req.body?.type ?? "suggestion"),
    priority: String(req.body?.priority ?? "medium"),
    title,
    message,
    attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [],
    status: "new",
    adminReply: "",
    createdAt: now(),
    updatedAt: now(),
  };
  suggestions = [suggestion, ...suggestions];
  makeActivity({ message: `${user.name} sent a suggestion`, messageAr: `${user.name} أرسل اقتراحا أو شكوى`, type: "suggestion", user });
  return res.status(201).json(suggestion);
});

app.patch("/api/suggestions/:id", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  const suggestion = suggestions.find((item) => item.id === Number(req.params.id));
  if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });
  const allowedStatuses = new Set(["new", "reviewing", "responded", "closed", "done", "rejected"]);
  if (req.body?.status !== undefined) {
    const nextStatus = String(req.body.status);
    if (!allowedStatuses.has(nextStatus)) return res.status(400).json({ error: "Invalid status" });
    suggestion.status = nextStatus;
  }
  if (req.body?.adminReply !== undefined) suggestion.adminReply = String(req.body.adminReply);
  suggestion.updatedAt = now();
  return res.json(suggestion);
});

app.get("/api/ticker", (_req, res) => {
  return res.json(tickerSettings);
});

app.patch("/api/ticker", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  const text = String(req.body?.text ?? "").slice(0, 300);
  tickerSettings = {
    ...tickerSettings,
    ...req.body,
    text,
    imageUrl: req.body?.imageUrl && req.body.imageUrl !== "/chargre-badge.png" ? String(req.body.imageUrl) : "",
    textColor: /^#[0-9a-f]{6}$/i.test(String(req.body?.textColor ?? "")) ? String(req.body.textColor) : tickerSettings.textColor,
    updatedAt: now(),
  };
  activities = [{
    id: activities.length + 1,
    message: text || "Grove Street update",
    messageAr: text || "تحديث من Grove Street",
    type: "ticker",
    imageUrl: tickerSettings.imageUrl,
    textColor: tickerSettings.textColor,
    createdAt: now(),
  }, ...activities.filter((item) => item.type !== "ticker")];
  return res.json(tickerSettings);
});

app.get("/api/admin/stats", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  
  return res.json({
    totalUsers: users.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + Number(order.amount ?? 0), 0),
    pendingDeposits: deposits.filter((deposit) => deposit.status === "pending").length,
    pendingVerifications: verifications.filter((v) => v.status === "pending").length,
    openTickets: tickets.filter((ticket) => ticket.status !== "closed").length,
    totalProducts: products.length,
    recentOrders: orders.slice(0, 5),
  });
});

// ============================================================
// MARKETPLACE ROUTES
// ============================================================
app.get("/api/marketplace", (_req, res) => {
  return res.json(marketplaceListings.filter((listing: any) => listing.status === "approved"));
});

app.get("/api/marketplace/all", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  return res.json(marketplaceListings);
});

app.get("/api/marketplace/my", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  return res.json(marketplaceListings.filter((listing: any) => listing.sellerId === user.id));
});

app.get("/api/marketplace/:id", (req, res) => {
  const listing = marketplaceListings.find((item: any) => item.id === Number(req.params.id));
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  return res.json(listing);
});

app.post("/api/marketplace", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return res;
  const { platform, title, description, price, gameId, rank, level, region, imageUrls, sellerNotes, sensitiveData } = req.body?.data ?? req.body ?? {};
  if (!title || !price) return res.status(400).json({ error: "Title and price are required" });
  if (Number(price) <= 0) return res.status(400).json({ error: "Price must be greater than zero" });
  const listing = {
    id: marketplaceListings.length + 1,
    sellerId: user.id,
    sellerName: user.name,
    sellerRank: user.rank,
    isSellerVerified: user.isVerified,
    platform: String(platform ?? ""),
    title: String(title),
    description: String(description ?? ""),
    price: Number(price),
    gameId: gameId ? Number(gameId) : 0,
    rank: rank ?? "",
    level: level ? Number(level) : null,
    region: region ?? "",
    imageUrls: imageUrls ?? "",
    sellerNotes: sellerNotes ?? "",
    sensitiveData: sensitiveData ?? {},
    status: "pending",
    adminNotes: "",
    createdAt: now(),
    updatedAt: now(),
  };
  marketplaceListings = [listing, ...marketplaceListings];
  makeActivity({ message: `${user.name} submitted a marketplace listing`, messageAr: `${user.name} أرسل إعلان بيع حساب للمراجعة`, type: "marketplace", user });
  // Create admin notification for new listing
  adminNotifications = [{ id: adminNotifications.length + 1, type: "marketplace", titleAr: "إعلان بيع جديد بانتظار المراجعة", messageAr: `${user.name} أرسل إعلان بيع حساب جديد`, link: "/admin/marketplace", isRead: false, createdAt: now() }, ...adminNotifications];
  saveMockState();
  return res.status(201).json(listing);
});

app.patch("/api/marketplace/:id", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  const listing = marketplaceListings.find((item: any) => item.id === Number(req.params.id));
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  const allowedStatuses = new Set(["pending", "approved", "rejected", "sold", "closed"]);
  if (req.body?.status !== undefined) {
    const nextStatus = String(req.body.status);
    if (!allowedStatuses.has(nextStatus)) return res.status(400).json({ error: "Invalid status" });
    listing.status = nextStatus;
  }
  if (req.body?.adminNotes !== undefined) listing.adminNotes = String(req.body.adminNotes);
  listing.updatedAt = now();
  saveMockState();
  return res.json(listing);
});

app.delete("/api/marketplace/:id", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  const index = marketplaceListings.findIndex((item: any) => item.id === Number(req.params.id));
  if (index >= 0) marketplaceListings.splice(index, 1);
  saveMockState();
  return res.status(204).end();
});
app.post("/api/marketplace/:id/approve", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  const listing = marketplaceListings.find((item: any) => item.id === Number(req.params.id));
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  listing.status = "approved";
  if (req.body?.adminNotes !== undefined) listing.adminNotes = String(req.body.adminNotes);
  listing.updatedAt = now();
  saveMockState();
  return res.json(listing);
});

app.post("/api/marketplace/:id/reject", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  const listing = marketplaceListings.find((item: any) => item.id === Number(req.params.id));
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  listing.status = "rejected";
  if (req.body?.adminNotes !== undefined) listing.adminNotes = String(req.body.adminNotes);
  listing.updatedAt = now();
  saveMockState();
  return res.json(listing);
});

// ============================================================
// ADS ADMIN ROUTES (missing /api/ads/all)
// ============================================================
app.get("/api/ads/all", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  return res.json(ads);
});

// ============================================================
// ADMIN NOTIFICATIONS ROUTES
// ============================================================
app.get("/api/admin/notifications", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  return res.json(adminNotifications);
});

app.post("/api/admin/notifications", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  const { titleAr, messageAr, type, link } = req.body;
  if (!titleAr && !messageAr) return res.status(400).json({ error: "titleAr or messageAr is required" });
  const notification = {
    id: adminNotifications.length + 1,
    type: String(type ?? "system"),
    titleAr: String(titleAr ?? ""),
    messageAr: String(messageAr ?? ""),
    link: String(link ?? ""),
    isRead: false,
    createdAt: now(),
  };
  adminNotifications = [notification, ...adminNotifications];
  saveMockState();
  return res.status(201).json(notification);
});

app.patch("/api/admin/notifications/:id/read", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  const notification = adminNotifications.find((item: any) => item.id === Number(req.params.id));
  if (!notification) return res.status(404).json({ error: "Notification not found" });
  notification.isRead = true;
  saveMockState();
  return res.json(notification);
});

app.post("/api/admin/notifications/read-all", (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return res;
  adminNotifications.forEach((item: any) => { item.isRead = true; });
  saveMockState();
  return res.json({ ok: true });
});

app.post("/api/auth/google", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: "Missing ID token" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID is not configured in environment");
    return res.status(500).json({ error: "Google authentication is not configured on the server" });
  }

  try {
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyRes.ok) {
      logSecurityEvent({ userId: 0, action: "google login failed: invalid token", ip: req.ip, userAgent: req.headers["user-agent"] });
      return res.status(401).json({ error: "Invalid Google ID Token" });
    }

    const payload = await verifyRes.json() as any;

    const aud = payload.aud;
    const iss = payload.iss;
    const exp = Number(payload.exp);
    const emailVerified = payload.email_verified === true || payload.email_verified === "true";
    const sub = payload.sub;
    const email = payload.email;

    if (!sub || !email) {
      logSecurityEvent({ userId: 0, action: "google login failed: missing claims", ip: req.ip, userAgent: req.headers["user-agent"] });
      return res.status(401).json({ error: "Invalid Google token payload" });
    }

    if (aud !== clientId) {
      console.warn("Google login failed: client ID mismatch");
      logSecurityEvent({ userId: 0, action: "google login failed: client ID mismatch", ip: req.ip, userAgent: req.headers["user-agent"] });
      return res.status(401).json({ error: "Google ID Token client mismatch" });
    }

    if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
      console.warn("Google login failed: issuer mismatch");
      logSecurityEvent({ userId: 0, action: "google login failed: issuer mismatch", ip: req.ip, userAgent: req.headers["user-agent"] });
      return res.status(401).json({ error: "Google ID Token issuer mismatch" });
    }

    if (exp * 1000 < Date.now()) {
      console.warn("Google login failed: token expired");
      logSecurityEvent({ userId: 0, action: "google login failed: token expired", ip: req.ip, userAgent: req.headers["user-agent"] });
      return res.status(401).json({ error: "Google ID Token expired" });
    }

    if (!emailVerified) {
      console.warn("Google login failed: email not verified");
      logSecurityEvent({ userId: 0, action: "google login failed: email not verified", ip: req.ip, userAgent: req.headers["user-agent"] });
      return res.status(403).json({ error: "Google email is not verified" });
    }

    // Process user lookup/creation
    let user = users.find((u) => u.googleSub === sub);

    if (!user) {
      const existingUserByEmail = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existingUserByEmail) {
        const authProv = existingUserByEmail.authProvider === "password" || !existingUserByEmail.authProvider ? "both" : existingUserByEmail.authProvider;
        existingUserByEmail.googleSub = sub;
        existingUserByEmail.googleEmail = email;
        existingUserByEmail.avatarUrl = payload.picture || null;
        existingUserByEmail.authProvider = authProv as any;
        
        user = existingUserByEmail;
        logSecurityEvent({ userId: user.id, action: "google account linked", ip: req.ip, userAgent: req.headers["user-agent"] });
      } else {
        const username = email.split("@")[0] || `user_${Date.now()}`;
        const name = payload.name || "مستخدم Google";
        const randomPass = crypto.randomBytes(32).toString("hex");

        const createdUser: User = {
          id: users.length + 1,
          name,
          username,
          email,
          role: "user",
          walletBalance: 0,
          points: 0,
          rank: "Bronze",
          isVerified: false,
          isBanned: false,
          gender: "male",
          createdAt: now(),
          twoFactorEnabled: false,
          twoFactorRequired: false,
          googleSub: sub,
          googleEmail: email,
          avatarUrl: payload.picture || null,
          authProvider: "google" as any
        };

        users.push(createdUser);
        passwords.set(createdUser.id, randomPass);
        user = createdUser;
        logSecurityEvent({ userId: user.id, action: "new google user created", ip: req.ip, userAgent: req.headers["user-agent"] });
      }
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Account is banned" });
    }

    const requires2FA = user.twoFactorEnabled;
    const requiresSetup = !user.twoFactorEnabled && (
      user.twoFactorRequired ||
      user.role === "admin" ||
      user.role === "owner" ||
      user.email.toLowerCase() === "tthhaaeeeerr@gmail.com" ||
      user.email.toLowerCase() === "qtybhrbas774@gmail.com"
    );

    if (requires2FA) {
      const challengeToken = generateChallengeToken(user.id, "login");
      logSecurityEvent({ userId: user.id, action: "2FA login challenge issued", ip: req.ip, userAgent: req.headers["user-agent"] });
      return res.json({
        requires2FA: true,
        challengeToken,
        expiresIn: 300
      });
    }

    if (requiresSetup) {
      const secret = generateBase32Secret();
      user.twoFactorSecret = encrypt(secret);
      
      const otpauthUrl = `otpauth://totp/Grove%20Street:${user.email}?secret=${secret}&issuer=Grove%20Street`;
      
      const qr = qrcodeLib(0, "M");
      qr.addData(otpauthUrl);
      qr.make();
      const qrCodeSvg = qr.createSvgTag({ cellSize: 4, margin: 4 });
      
      const challengeToken = generateChallengeToken(user.id, "setup");
      pendingTwoFactorSetups.set(challengeToken, { userId: user.id, secret, expiresAt: Date.now() + 5 * 60 * 1000 });
      logSecurityEvent({ userId: user.id, action: "2FA setup started", ip: req.ip, userAgent: req.headers["user-agent"] });
      
      return res.json({
        requiresSetup2FA: true,
        challengeToken,
        secret,
        qrCode: qrCodeSvg,
        expiresIn: 300
      });
    }

    logSecurityEvent({ userId: user.id, action: "google login success", ip: req.ip, userAgent: req.headers["user-agent"] });
    return res.json({ user: publicUser(user), token: signToken(user.id) });
  } catch (err: any) {
    console.error("Google authentication internal error");
    logSecurityEvent({ userId: 0, action: "google login failed: internal error", ip: req.ip, userAgent: req.headers["user-agent"] });
    return res.status(500).json({ error: "Internal server error during Google login" });
  }
});

export default app;
