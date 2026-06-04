import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Star, Globe, Shield, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListGames, useListProducts } from "@workspace/api-client-react";
import { getLanguage } from "@/lib/language";

const SERVICE_IMAGE_BY_GAME_ID: Record<number, string> = {
  1: "/images/services/games/free-fire.png",
  2: "/images/services/games/mobile-legends.png",
  3: "/images/services/games/pubg-mobile.png",
  5: "/images/services/games/call-of-duty-mobile.png",
  6: "/images/services/games/brawl-stars.png",
  7: "/images/services/games/jawaker.png",
  8: "/images/services/games/where-windos-meet.png",
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

const imageForGame = (game: any) =>
  SERVICE_IMAGE_BY_GAME_ID[Number(game?.id)] || game?.imageUrl || "/images/logo/logo.png";

const imageForProduct = (product: any) =>
  product?.imageUrl || SERVICE_IMAGE_BY_GAME_ID[Number(product?.gameId)] || "/images/logo/logo.png";

const onImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget;
  if (!image.src.endsWith("/images/logo/logo.png")) {
    image.src = "/images/logo/logo.png";
  }
};

const CATEGORIES = [
  { id: "topups", labelAr: "شحن الألعاب", labelEn: "Game Topups" },
  { id: "gift_cards", labelAr: "بطاقات الهدايا", labelEn: "Gift Cards" },
  { id: "subscriptions", labelAr: "الاشتراكات الرقمية", labelEn: "Digital Subscriptions" },
  { id: "social", labelAr: "خدمات التواصل", labelEn: "Social Media Services" },
];

const MOCK_GAMES = [
  { id: 1, name: "Free Fire", nameAr: "فري فاير", imageUrl: SERVICE_IMAGE_BY_GAME_ID[1], category: "topups" },
  { id: 2, name: "Mobile Legends", nameAr: "موبايل ليجندز", imageUrl: SERVICE_IMAGE_BY_GAME_ID[2], category: "topups" },
  { id: 3, name: "PUBG Mobile", nameAr: "ببجي موبايل", imageUrl: SERVICE_IMAGE_BY_GAME_ID[3], category: "topups" },
  { id: 5, name: "Call of Duty Mobile", nameAr: "كول اوف ديوتي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[5], category: "topups" },
  { id: 6, name: "Brawl Stars", nameAr: "براول ستارز", imageUrl: SERVICE_IMAGE_BY_GAME_ID[6], category: "topups" },
  { id: 7, name: "Jawaker", nameAr: "جواكر", imageUrl: SERVICE_IMAGE_BY_GAME_ID[7], category: "topups" },
  { id: 8, name: "Where Winds Meet", nameAr: "وير ويندوز ميت", imageUrl: SERVICE_IMAGE_BY_GAME_ID[8], category: "topups" },
  { id: 9, name: "Roblox", nameAr: "روبلوكس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[9], category: "topups" },
  { id: 10, name: "Lords Mobile", nameAr: "لوردز موبايل", imageUrl: SERVICE_IMAGE_BY_GAME_ID[10], category: "topups" },
  { id: 11, name: "Delta Force", nameAr: "دلتا فورس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[11], category: "topups" },
  { id: 12, name: "Hay Day", nameAr: "هاي داي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[12], category: "topups" },
  { id: 17, name: "Clash of Clans", nameAr: "كلاش اوف كلانس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[17], category: "topups" },
  { id: 18, name: "Clash Royale", nameAr: "كلاش رويال", imageUrl: SERVICE_IMAGE_BY_GAME_ID[18], category: "topups" },
  { id: 19, name: "EA FC Mobile", nameAr: "EA FC موبايل", imageUrl: SERVICE_IMAGE_BY_GAME_ID[19], category: "topups" },
  { id: 20, name: "Blood Strike", nameAr: "بلود سترايك", imageUrl: SERVICE_IMAGE_BY_GAME_ID[20], category: "topups" },
  { id: 21, name: "Fortnite", nameAr: "فورتنايت", imageUrl: SERVICE_IMAGE_BY_GAME_ID[21], category: "topups" },
  { id: 13, name: "Steam Gift Cards", nameAr: "بطاقات ستيم", imageUrl: SERVICE_IMAGE_BY_GAME_ID[13], category: "gift_cards" },
  { id: 14, name: "Google Play", nameAr: "بطاقات جوجل بلاي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[14], category: "gift_cards" },
  { id: 15, name: "PlayStation", nameAr: "بطاقات بلايستيشن", imageUrl: SERVICE_IMAGE_BY_GAME_ID[15], category: "gift_cards" },
  { id: 16, name: "Xbox", nameAr: "بطاقات اكس بوكس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[16], category: "gift_cards" },
  { id: 22, name: "US iTunes Gift Card", nameAr: "بطاقات آيتونز أمريكي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[22], category: "gift_cards" },
  { id: 23, name: "Spotify Gift Card", nameAr: "بطاقات سبوتيفاي", imageUrl: SERVICE_IMAGE_BY_GAME_ID[23], category: "gift_cards" },
  { id: 24, name: "Discord Nitro", nameAr: "ديسكورد نيترو", imageUrl: SERVICE_IMAGE_BY_GAME_ID[24], category: "gift_cards" },
  { id: 101, name: "ChatGPT", nameAr: "ChatGPT", imageUrl: SERVICE_IMAGE_BY_GAME_ID[101], category: "subscriptions" },
  { id: 102, name: "Shahid", nameAr: "شاهد VIP", imageUrl: SERVICE_IMAGE_BY_GAME_ID[102], category: "subscriptions" },
  { id: 103, name: "Netflix", nameAr: "نتفليكس Premium", imageUrl: SERVICE_IMAGE_BY_GAME_ID[103], category: "subscriptions" },
  { id: 104, name: "YouTube Premium", nameAr: "يوتيوب بريميوم", imageUrl: SERVICE_IMAGE_BY_GAME_ID[104], category: "subscriptions" },
  { id: 105, name: "Snapchat Plus", nameAr: "سناب شات بلس", imageUrl: SERVICE_IMAGE_BY_GAME_ID[105], category: "subscriptions" },
  { id: 106, name: "Gemini", nameAr: "Gemini", imageUrl: SERVICE_IMAGE_BY_GAME_ID[106], category: "subscriptions" },
  { id: 201, name: "WhatsApp", nameAr: "واتساب", imageUrl: SERVICE_IMAGE_BY_GAME_ID[201], category: "social" },
  { id: 202, name: "Instagram", nameAr: "انستغرام", imageUrl: SERVICE_IMAGE_BY_GAME_ID[202], category: "social" },
  { id: 203, name: "TikTok", nameAr: "تيك توك", imageUrl: SERVICE_IMAGE_BY_GAME_ID[203], category: "social" },
  { id: 204, name: "Facebook", nameAr: "فيسبوك", imageUrl: SERVICE_IMAGE_BY_GAME_ID[204], category: "social" },
  { id: 205, name: "YouTube", nameAr: "يوتيوب", imageUrl: SERVICE_IMAGE_BY_GAME_ID[205], category: "social" },
];

const MOCK_PRODUCTS = [
  // 1. Free Fire (gameId: 1)
  {
    id: 1, gameId: 1, gameName: "Free Fire", name: "Free Fire 100 Diamonds", nameAr: "100 جوهرة فري فاير", category: "topups", description: "شحن جواهر فري فاير عبر المعرف فقط", price: 1.00, pointsEarned: 0, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-id-topup", amount: "100 Diamonds", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 2, gameId: 1, gameName: "Free Fire", name: "Free Fire 210 Diamonds", nameAr: "210 جواهر فري فاير", category: "topups", description: "شحن جواهر فري فاير عبر المعرف فقط", price: 2.00, pointsEarned: 1, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-id-topup", amount: "210 Diamonds", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 3, gameId: 1, gameName: "Free Fire", name: "Free Fire 520 Diamonds", nameAr: "520 جوهرة فري فاير", category: "topups", description: "شحن جواهر فري فاير عبر المعرف فقط", price: 4.80, pointsEarned: 2, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: true, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-id-topup", amount: "520 Diamonds", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 4, gameId: 1, gameName: "Free Fire", name: "Free Fire Account Topup", nameAr: "شحن جواهر عبر الحساب (يدوي)", category: "topups", description: "شحن يدوي آمن عبر الحساب بالكامل", price: 10.00, pointsEarned: 5, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "manual",
    inputFields: JSON.stringify([
      { name: "email", label: "البريد الإلكتروني أو رقم الهاتف", type: "text", required: true },
      { name: "password", label: "كلمة المرور للحساب", type: "password", required: true },
      { name: "notes", label: "ملاحظات إضافية (أكواد الأمان إن وجدت)", type: "text", required: false }
    ]),
    serviceGroupId: "ff-account-topup", amount: "1000 Diamonds", region: "any", server: "any", deliveryType: "manual"
  },
  {
    id: 5, gameId: 1, gameName: "Free Fire", name: "Free Fire Weekly Membership", nameAr: "عضوية فري فاير الأسبوعية (Weekly)", category: "topups", description: "شحن العضوية الأسبوعية فورياً", price: 2.10, pointsEarned: 1, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: true, isTrending: true, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-membership", amount: "Weekly Membership", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 6, gameId: 1, gameName: "Free Fire", name: "Free Fire Monthly Membership", nameAr: "عضوية فري فاير الشهرية (Monthly)", category: "topups", description: "تفعيل العضوية الشهرية فورياً", price: 8.50, pointsEarned: 4, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-membership", amount: "Monthly Membership", region: "any", server: "any", deliveryType: "direct_topup"
  },
  {
    id: 7, gameId: 1, gameName: "Free Fire", name: "Free Fire Global 100 Diamonds", nameAr: "شحن Free Fire Global 100 Diamonds", category: "topups", description: "شحن عالمي فوري", price: 1.20, pointsEarned: 0, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-global", amount: "100 Diamonds", region: "Global", server: "Global", deliveryType: "direct_topup"
  },
  {
    id: 8, gameId: 1, gameName: "Free Fire", name: "Free Fire MENA 310 Diamonds", nameAr: "شحن Free Fire MENA 310 Diamonds", category: "topups", description: "شحن فوري سيرفر الشرق الأوسط", price: 3.00, pointsEarned: 1, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-mena", amount: "310 Diamonds", region: "MENA", server: "MENA", deliveryType: "direct_topup"
  },
  {
    id: 9, gameId: 1, gameName: "Free Fire", name: "Free Fire Europe Server 100 Diamonds", nameAr: "شحن Free Fire Europe 100 Diamonds", category: "topups", description: "شحن فوري سيرفر أوروبا", price: 1.30, pointsEarned: 0, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
    inputFields: JSON.stringify([{ name: "player_id", label: "رقم اللاعب (Player ID)", type: "text", required: true }]),
    serviceGroupId: "ff-server", amount: "100 Diamonds", region: "Europe", server: "Europe", deliveryType: "direct_topup"
  },
  {
    id: 10, gameId: 1, gameName: "Free Fire", name: "Free Fire Brazil Server 100 Diamonds", nameAr: "شحن Free Fire Brazil 100 Diamonds", category: "topups", description: "شحن فوري سيرفر البرازيل", price: 1.25, pointsEarned: 0, stock: 9999, imageUrl: "/sh7nfreefireicon.png", isActive: true, isFeatured: false, isTrending: false, fulfillmentType: "api",
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

// Service Groups for Games/Services
const GAME_GROUPS: Record<number, { id: string; titleAr: string; filter: (p: any) => boolean }[]> = {
  // Free Fire (gameId: 1)
  1: [
    { id: "ff-id", titleAr: "شحن جواهر عبر ID", filter: (p) => p.serviceGroupId === "ff-id-topup" || ((p.fulfillmentType === "api" || !p.fulfillmentType) && !p.nameAr.includes("عضوية") && !p.nameAr.includes("سيرفر") && !p.nameAr.includes("حساب") && !p.nameAr.includes("عالمي") && !p.nameAr.includes("MENA") && !p.nameAr.includes("الشرق الأوسط")) },
    { id: "ff-account", titleAr: "شحن جواهر عبر الحساب", filter: (p) => p.serviceGroupId === "ff-account-topup" || p.fulfillmentType === "manual" || p.nameAr.includes("حساب") },
    { id: "ff-membership", titleAr: "عضويات Free Fire", filter: (p) => p.serviceGroupId === "ff-membership" || p.nameAr.includes("عضوية") || p.nameAr.includes("Membership") || p.nameAr.includes("باس") },
    { id: "ff-global", titleAr: "شحن Global", filter: (p) => p.serviceGroupId === "ff-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("عالمي") || p.nameAr.includes("Global") },
    { id: "ff-mena", titleAr: "شحن الشرق الأوسط", filter: (p) => p.serviceGroupId === "ff-mena" || p.region?.toLowerCase() === "mena" || p.nameAr.includes("شرق أوسط") || p.nameAr.includes("MENA") || p.nameAr.includes("الشرق الأوسط") },
    { id: "ff-server", titleAr: "شحن حسب السيرفر", filter: (p) => p.serviceGroupId === "ff-server" || p.nameAr.includes("سيرفر") || p.nameAr.includes("Server") }
  ],
  // PUBG Mobile (gameId: 3)
  3: [
    { id: "pubg-id", titleAr: "شحن UC عبر ID", filter: (p) => p.serviceGroupId === "pubg-id-topup" || ((p.fulfillmentType === "api" || !p.fulfillmentType) && !p.nameAr.includes("عالمي") && !p.nameAr.includes("Global") && !p.nameAr.includes("بطاقة") && !p.nameAr.includes("باس") && !p.nameAr.includes("Pass") && !p.nameAr.includes("حزمة") && !p.nameAr.includes("باقة خاصة")) },
    { id: "pubg-global", titleAr: "شحن UC Global", filter: (p) => p.serviceGroupId === "pubg-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("عالمي") || p.nameAr.includes("Global") },
    { id: "pubg-mena", titleAr: "شحن UC Middle East", filter: (p) => p.serviceGroupId === "pubg-mena" || p.region?.toLowerCase() === "mena" || p.nameAr.includes("شرق أوسط") || p.nameAr.includes("MENA") || p.nameAr.includes("الشرق الأوسط") || p.nameAr.includes("Middle East") },
    { id: "pubg-pass", titleAr: "Elite Pass", filter: (p) => p.serviceGroupId === "pubg-pass" || p.nameAr.includes("باس") || p.nameAr.includes("Pass") || p.nameAr.includes("Elite") },
    { id: "pubg-special", titleAr: "باقات خاصة", filter: (p) => p.serviceGroupId === "pubg-special" || p.nameAr.includes("حزمة") || p.nameAr.includes("باقة خاصة") || p.nameAr.includes("شحن شدات") },
    { id: "pubg-gift-cards", titleAr: "Gift Cards", filter: (p) => p.serviceGroupId === "pubg-gift-cards" || p.nameAr.includes("بطاقة") || p.nameAr.includes("Gift Card") || p.nameAr.includes("كود") || p.nameAr.includes("Code") }
  ],
  // Mobile Legends (gameId: 2)
  2: [
    { id: "ml-id", titleAr: "Diamonds عبر ID", filter: (p) => p.serviceGroupId === "ml-diamonds-id" || ((p.fulfillmentType === "api" || !p.fulfillmentType) && !p.nameAr.includes("عضوية") && !p.nameAr.includes("Pass") && !p.nameAr.includes("تركيا") && !p.nameAr.includes("إندونيسيا") && !p.nameAr.includes("الفلبين") && !p.nameAr.includes("ماليزيا") && !p.nameAr.includes("البرازيل") && !p.nameAr.includes("سنغافورة") && !p.nameAr.includes("تايلاند")) },
    { id: "ml-pass", titleAr: "Weekly Diamond Pass", filter: (p) => p.serviceGroupId === "ml-weekly-pass" || p.nameAr.includes("عضوية") || p.nameAr.includes("Pass") || p.nameAr.includes("Weekly") },
    { id: "ml-twilight", titleAr: "Twilight Pass", filter: (p) => p.serviceGroupId === "ml-twilight-pass" || p.nameAr.includes("Twilight") },
    { id: "ml-global", titleAr: "Global", filter: (p) => p.serviceGroupId === "ml-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("عالمي") || p.nameAr.includes("Global") },
    { id: "ml-turkey", titleAr: "Turkey", filter: (p) => p.region?.toLowerCase() === "turkey" || p.nameAr.includes("تركيا") || p.nameAr.includes("Turkey") || p.nameAr.includes("TR") },
    { id: "ml-indonesia", titleAr: "Indonesia", filter: (p) => p.region?.toLowerCase() === "indonesia" || p.nameAr.includes("إندونيسيا") || p.nameAr.includes("Indonesia") || p.nameAr.includes("ID") },
    { id: "ml-philippines", titleAr: "Philippines", filter: (p) => p.region?.toLowerCase() === "philippines" || p.nameAr.includes("الفلبين") || p.nameAr.includes("Philippines") || p.nameAr.includes("PH") },
    { id: "ml-malaysia", titleAr: "Malaysia", filter: (p) => p.region?.toLowerCase() === "malaysia" || p.nameAr.includes("ماليزيا") || p.nameAr.includes("Malaysia") || p.nameAr.includes("MY") },
    { id: "ml-brazil", titleAr: "Brazil", filter: (p) => p.region?.toLowerCase() === "brazil" || p.nameAr.includes("البرازيل") || p.nameAr.includes("Brazil") || p.nameAr.includes("BR") },
    { id: "ml-singapore", titleAr: "Singapore", filter: (p) => p.region?.toLowerCase() === "singapore" || p.nameAr.includes("سنغافورة") || p.nameAr.includes("Singapore") || p.nameAr.includes("SG") },
    { id: "ml-thailand", titleAr: "Thailand", filter: (p) => p.region?.toLowerCase() === "thailand" || p.nameAr.includes("تايلاند") || p.nameAr.includes("Thailand") || p.nameAr.includes("TH") }
  ],
  // Call of Duty Mobile (gameId: 5)
  5: [
    { id: "cod-cp", titleAr: "CP عبر ID", filter: (p) => p.serviceGroupId === "cod-cp-id" || ((p.fulfillmentType === "api" || !p.fulfillmentType) && !p.nameAr.includes("باس") && !p.nameAr.includes("Pass") && !p.nameAr.includes("عضوية")) },
    { id: "cod-battle-pass", titleAr: "Battle Pass", filter: (p) => p.serviceGroupId === "cod-battle-pass" || p.nameAr.includes("Battle") || p.nameAr.includes("رويال باس") },
    { id: "cod-weekly-pass", titleAr: "Weekly Pass", filter: (p) => p.serviceGroupId === "cod-weekly-pass" || p.nameAr.includes("أسبوعية") || p.nameAr.includes("Weekly") },
    { id: "cod-monthly-pass", titleAr: "Monthly Pass", filter: (p) => p.serviceGroupId === "cod-monthly-pass" || p.nameAr.includes("شهرية") || p.nameAr.includes("Monthly") },
    { id: "cod-global", titleAr: "Global / Region", filter: (p) => p.serviceGroupId === "cod-global-region" || p.nameAr.includes("عالمي") || p.nameAr.includes("Global") || p.region?.toLowerCase() === "global" }
  ],
  // Steam Gift Cards (gameId: 13)
  13: [
    { id: "steam-global", titleAr: "Steam Global", filter: (p) => p.serviceGroupId === "steam-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("عالمي") || p.nameAr.includes("Global") },
    { id: "steam-usa", titleAr: "Steam USA", filter: (p) => p.serviceGroupId === "steam-usa" || p.region?.toLowerCase() === "usa" || p.nameAr.includes("أمريكي") || p.nameAr.includes("USA") || p.nameAr.includes("US") },
    { id: "steam-turkey", titleAr: "Steam Turkey", filter: (p) => p.serviceGroupId === "steam-turkey" || p.region?.toLowerCase() === "turkey" || p.nameAr.includes("تركي") || p.nameAr.includes("Turkey") || p.nameAr.includes("TL") || p.nameAr.includes("TRY") },
    { id: "steam-jordan", titleAr: "Steam Jordan", filter: (p) => p.serviceGroupId === "steam-jordan" || p.region?.toLowerCase() === "jordan" || p.nameAr.includes("أردني") || p.nameAr.includes("Jordan") || p.nameAr.includes("JOD") },
    { id: "steam-saudi", titleAr: "Steam Saudi", filter: (p) => p.serviceGroupId === "steam-saudi" || p.region?.toLowerCase() === "saudi" || p.nameAr.includes("سعودي") || p.nameAr.includes("Saudi") || p.nameAr.includes("SAR") },
    { id: "steam-uae", titleAr: "Steam UAE", filter: (p) => p.serviceGroupId === "steam-uae" || p.region?.toLowerCase() === "uae" || p.nameAr.includes("إماراتي") || p.nameAr.includes("UAE") || p.nameAr.includes("AED") },
    { id: "steam-europe", titleAr: "Steam Europe", filter: (p) => p.serviceGroupId === "steam-europe" || p.region?.toLowerCase() === "europe" || p.nameAr.includes("أوروبي") || p.nameAr.includes("Europe") || p.nameAr.includes("EUR") }
  ],
  // Google Play (gameId: 14)
  14: [
    { id: "google-usa", titleAr: "Google Play USA", filter: (p) => p.serviceGroupId === "google-usa" || p.region?.toLowerCase() === "usa" || p.nameAr.includes("أمريكي") || p.nameAr.includes("USA") || p.nameAr.includes("US") },
    { id: "google-saudi", titleAr: "Google Play Saudi", filter: (p) => p.serviceGroupId === "google-saudi" || p.region?.toLowerCase() === "saudi" || p.nameAr.includes("سعودي") || p.nameAr.includes("Saudi") || p.nameAr.includes("SAR") },
    { id: "google-uae", titleAr: "Google Play UAE", filter: (p) => p.serviceGroupId === "google-uae" || p.region?.toLowerCase() === "uae" || p.nameAr.includes("إماراتي") || p.nameAr.includes("UAE") || p.nameAr.includes("AED") },
    { id: "google-turkey", titleAr: "Google Play Turkey", filter: (p) => p.serviceGroupId === "google-turkey" || p.region?.toLowerCase() === "turkey" || p.nameAr.includes("تركي") || p.nameAr.includes("Turkey") || p.nameAr.includes("TL") || p.nameAr.includes("TRY") },
    { id: "google-global", titleAr: "Google Play Global", filter: (p) => p.serviceGroupId === "google-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("Global") || p.nameAr.includes("عالمي") }
  ],
  // PlayStation (gameId: 15)
  15: [
    { id: "psn-usa", titleAr: "PSN USA", filter: (p) => p.serviceGroupId === "psn-usa" || p.region?.toLowerCase() === "usa" || p.nameAr.includes("أمريكي") || p.nameAr.includes("USA") || p.nameAr.includes("US") },
    { id: "psn-uae", titleAr: "PSN UAE", filter: (p) => p.serviceGroupId === "psn-uae" || p.region?.toLowerCase() === "uae" || p.nameAr.includes("إماراتي") || p.nameAr.includes("UAE") || p.nameAr.includes("AED") },
    { id: "psn-saudi", titleAr: "PSN Saudi", filter: (p) => p.serviceGroupId === "psn-saudi" || p.region?.toLowerCase() === "saudi" || p.nameAr.includes("سعودي") || p.nameAr.includes("Saudi") || p.nameAr.includes("SAR") },
    { id: "psn-uk", titleAr: "PSN UK", filter: (p) => p.serviceGroupId === "psn-uk" || p.region?.toLowerCase() === "uk" || p.nameAr.includes("بريطاني") || p.nameAr.includes("UK") || p.nameAr.includes("GBP") },
    { id: "psn-turkey", titleAr: "PSN Turkey", filter: (p) => p.serviceGroupId === "psn-turkey" || p.region?.toLowerCase() === "turkey" || p.nameAr.includes("تركي") || p.nameAr.includes("Turkey") || p.nameAr.includes("TL") || p.nameAr.includes("TRY") }
  ],
  // Xbox (gameId: 16)
  16: [
    { id: "xbox-global", titleAr: "Xbox Global", filter: (p) => p.serviceGroupId === "xbox-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("Global") || p.nameAr.includes("عالمي") },
    { id: "xbox-usa", titleAr: "Xbox USA", filter: (p) => p.serviceGroupId === "xbox-usa" || p.region?.toLowerCase() === "usa" || p.nameAr.includes("أمريكي") || p.nameAr.includes("USA") || p.nameAr.includes("US") },
    { id: "xbox-turkey", titleAr: "Xbox Turkey", filter: (p) => p.serviceGroupId === "xbox-turkey" || p.region?.toLowerCase() === "turkey" || p.nameAr.includes("تركي") || p.nameAr.includes("Turkey") || p.nameAr.includes("TL") || p.nameAr.includes("TRY") },
    { id: "xbox-europe", titleAr: "Xbox Europe", filter: (p) => p.serviceGroupId === "xbox-europe" || p.region?.toLowerCase() === "europe" || p.nameAr.includes("أوروبي") || p.nameAr.includes("Europe") || p.nameAr.includes("EUR") }
  ],
  // Roblox (gameId: 9)
  9: [
    { id: "roblox-robux", titleAr: "شحن Robux", filter: (p) => p.serviceGroupId === "roblox-robux" || p.nameAr.includes("روبوكس") || p.nameAr.includes("Robux") },
    { id: "roblox-gift", titleAr: "Gift Cards", filter: (p) => p.serviceGroupId === "roblox-gift" || p.nameAr.includes("بطاقة") || p.nameAr.includes("Gift Card") }
  ],
  // ChatGPT (gameId: 101)
  101: [
    { id: "chatgpt-monthly", titleAr: "اشتراكات شهرية", filter: (p) => p.serviceGroupId === "chatgpt-monthly" || p.nameAr.includes("شهر") || p.nameAr.includes("Month") },
    { id: "chatgpt-yearly", titleAr: "اشتراكات سنوية", filter: (p) => p.serviceGroupId === "chatgpt-yearly" || p.nameAr.includes("سنة") || p.nameAr.includes("Year") }
  ],
  // Shahid VIP (gameId: 102)
  102: [
    { id: "shahid-sports", titleAr: "شاهد VIP الرياضية", filter: (p) => p.serviceGroupId === "shahid-sports" || p.nameAr.includes("رياضة") || p.nameAr.includes("الرياضية") || p.nameAr.includes("Sports") },
    { id: "shahid-vip", titleAr: "شاهد VIP مسلسلات", filter: (p) => p.serviceGroupId === "shahid-vip" || (!p.nameAr.includes("رياضة") && !p.nameAr.includes("الرياضية") && !p.nameAr.includes("Sports")) }
  ],
  // Netflix (gameId: 103)
  103: [
    { id: "netflix-screen", titleAr: "شاشة مشتركة", filter: (p) => p.serviceGroupId === "netflix-screen" || p.nameAr.includes("شاشة") || p.nameAr.includes("Screen") },
    { id: "netflix-full", titleAr: "حساب كامل", filter: (p) => p.serviceGroupId === "netflix-full" || p.nameAr.includes("كامل") || p.nameAr.includes("Full") }
  ],
  // YouTube Premium (gameId: 104)
  104: [
    { id: "youtube-individual", titleAr: "يوتيوب فردي", filter: (p) => p.serviceGroupId === "youtube-individual" || p.nameAr.includes("فردي") || p.nameAr.includes("Individual") || !p.nameAr.includes("عائلي") },
    { id: "youtube-family", titleAr: "يوتيوب عائلي", filter: (p) => p.serviceGroupId === "youtube-family" || p.nameAr.includes("عائلي") || p.nameAr.includes("Family") }
  ],
  // Social media services
  201: [
    { id: "whatsapp-channel-members", titleAr: "أعضاء القناة", filter: (p) => p.serviceGroupId === "whatsapp-channel-members" },
    { id: "whatsapp-post-reactions", titleAr: "تفاعلات منشور", filter: (p) => p.serviceGroupId === "whatsapp-post-reactions" },
    { id: "whatsapp-random-reactions", titleAr: "تفاعلات عشوائية", filter: (p) => p.serviceGroupId === "whatsapp-random-reactions" },
    { id: "whatsapp-custom-reactions", titleAr: "تفاعلات مخصصة", filter: (p) => p.serviceGroupId === "whatsapp-custom-reactions" }
  ],
  202: [
    { id: "instagram-followers", titleAr: "متابعين", filter: (p) => p.serviceGroupId === "instagram-followers" },
    { id: "instagram-likes", titleAr: "لايكات", filter: (p) => p.serviceGroupId === "instagram-likes" },
    { id: "instagram-views", titleAr: "مشاهدات", filter: (p) => p.serviceGroupId === "instagram-views" }
  ],
  203: [
    { id: "tiktok-followers", titleAr: "متابعين", filter: (p) => p.serviceGroupId === "tiktok-followers" },
    { id: "tiktok-likes", titleAr: "لايكات", filter: (p) => p.serviceGroupId === "tiktok-likes" },
    { id: "tiktok-views", titleAr: "مشاهدات", filter: (p) => p.serviceGroupId === "tiktok-views" }
  ],
  204: [
    { id: "facebook-profile-followers", titleAr: "متابعين بروفايل", filter: (p) => p.serviceGroupId === "facebook-profile-followers" },
    { id: "facebook-page-followers", titleAr: "متابعين صفحة", filter: (p) => p.serviceGroupId === "facebook-page-followers" },
    { id: "facebook-post-likes", titleAr: "لايكات منشور", filter: (p) => p.serviceGroupId === "facebook-post-likes" },
    { id: "facebook-views", titleAr: "مشاهدات", filter: (p) => p.serviceGroupId === "facebook-views" }
  ],
  205: [
    { id: "youtube-views", titleAr: "مشاهدات", filter: (p) => p.serviceGroupId === "youtube-views" },
    { id: "youtube-likes", titleAr: "لايكات", filter: (p) => p.serviceGroupId === "youtube-likes" },
    { id: "youtube-subscribers", titleAr: "مشتركين", filter: (p) => p.serviceGroupId === "youtube-subscribers" }
  ]
};

export default function GamesPage() {
  const lang = getLanguage();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const defaultGameId = params.get("gameId") ? parseInt(params.get("gameId")!) : 0;

  const [category, setCategory] = useState("topups");
  const [selectedGame, setSelectedGame] = useState(defaultGameId);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("");
  const [selectedServer, setSelectedServer] = useState("Global");

  const { data: gamesData } = useListGames();
  const { data: productsData } = useListProducts({ 
    category, 
    gameId: selectedGame || undefined 
  });

  const gamesList = (gamesData?.length ? gamesData : MOCK_GAMES).map((game: any) => {
    const name = String(game.name || "").toLowerCase();
    if (Number(game.id) === 8 || name.includes("wolvesville")) {
      return {
        ...game,
        name: "Where Winds Meet",
        nameAr: "وير ويندوز ميت",
        imageUrl: SERVICE_IMAGE_BY_GAME_ID[8],
      };
    }
    return { ...game, imageUrl: imageForGame(game) };
  });
  const products = (productsData?.length ? productsData : MOCK_PRODUCTS).map((product: any) => ({ ...product, imageUrl: imageForProduct(product) }));

  // Filter main games list based on category
  const displayedGames = gamesList.filter(g => {
    // If the game fits the category or fallback mock lists
    if (category === "topups") return g.category === "topups" || !g.category;
    if (category === "gift_cards") return g.category === "gift_cards";
    if (category === "subscriptions") return g.category === "subscriptions";
    if (category === "social") return g.category === "social";
    return true;
  });

  // Local Search matching for Stage 1 Directory
  const searchedGamesList = displayedGames.filter(g => {
    if (!searchQuery || selectedGame) return true; // stages have different search inputs
    const query = searchQuery.toLowerCase();
    return g.nameAr.toLowerCase().includes(query) || g.name.toLowerCase().includes(query);
  });

  const activeGame = gamesList.find(g => g.id === selectedGame);

  // Determine active groups/tabs inside a selected Game details
  const activeGameGroups = (() => {
    if (!selectedGame) return [];
    
    // Check by ID or Game Name matching
    if (GAME_GROUPS[selectedGame]) return GAME_GROUPS[selectedGame];
    
    // Robust name-based match fallbacks (for custom user database games)
    const gameName = (activeGame?.name || "").toLowerCase();
    const gameNameAr = (activeGame?.nameAr || "");
    
    if (gameName.includes("free fire") || gameNameAr.includes("فري فاير")) return GAME_GROUPS[1];
    if (gameName.includes("pubg") || gameNameAr.includes("ببجي")) return GAME_GROUPS[3];
    if (gameName.includes("mobile legends") || gameNameAr.includes("موبايل ليجيند")) return GAME_GROUPS[2];
    if (gameName.includes("call of duty") || gameNameAr.includes("كول أوف ديوتي") || gameName.includes("cod")) return GAME_GROUPS[5];
    
    if (gameName.includes("steam") || gameNameAr.includes("ستيم")) return GAME_GROUPS[13];
    if (gameName.includes("google") || gameNameAr.includes("جوجل")) return GAME_GROUPS[14];
    if (gameName.includes("playstation") || gameNameAr.includes("بلايستيشن") || gameName.includes("psn")) return GAME_GROUPS[15];
    if (gameName.includes("xbox") || gameNameAr.includes("إكس بوكس")) return GAME_GROUPS[16];
    if (gameName.includes("roblox") || gameNameAr.includes("روبلوكس")) return GAME_GROUPS[9];

    if (gameName.includes("chatgpt")) return GAME_GROUPS[101];
    if (gameName.includes("shahid") || gameNameAr.includes("شاهد")) return GAME_GROUPS[102];
    if (gameName.includes("netflix") || gameNameAr.includes("نتفليكس")) return GAME_GROUPS[103];
    if (gameName.includes("youtube") || gameNameAr.includes("يوتيوب")) return GAME_GROUPS[104];
    
    // Basic division
    return [
      { id: "all-prod", titleAr: "جميع الباقات", filter: () => true }
    ];
  })();

  // Set default group when selectedGame changes
  useEffect(() => {
    if (activeGameGroups.length > 0) {
      setActiveGroup(activeGameGroups[0].id);
    } else {
      setActiveGroup("");
    }
  }, [selectedGame]);

  // Filtered products list inside the specific game details
  const filteredProducts = products.filter(p => {
    // Map database dynamic products that have gameId === 0 or null to their respective virtual games
    let mappedGameId = p.gameId;
    if (!mappedGameId || mappedGameId === 0) {
      const name = (p.nameAr || p.name || "").toLowerCase();
      if (name.includes("chatgpt")) mappedGameId = 101;
      else if (name.includes("shahid") || name.includes("شاهد")) mappedGameId = 102;
      else if (name.includes("netflix") || name.includes("نتفليكس")) mappedGameId = 103;
      else if (name.includes("youtube") || name.includes("يوتيوب")) mappedGameId = 104;
      else if (name.includes("steam") || name.includes("ستيم")) mappedGameId = 13;
      else if (name.includes("google") || name.includes("جوجل")) mappedGameId = 14;
      else if (name.includes("playstation") || name.includes("بلايستيشن") || name.includes("psn")) mappedGameId = 15;
      else if (name.includes("xbox") || name.includes("إكس بوكس")) mappedGameId = 16;
      else if (name.includes("roblox") || name.includes("روبلوكس")) mappedGameId = 9;
      else if (name.includes("free fire") || name.includes("فري فاير")) mappedGameId = 1;
      else if (name.includes("pubg") || name.includes("ببجي")) mappedGameId = 3;
      else if (name.includes("mobile legends") || name.includes("موبايل ليجيند")) mappedGameId = 2;
      else if (name.includes("call of duty") || name.includes("كول أوف ديوتي") || name.includes("cod")) mappedGameId = 5;
    }
    
    if (selectedGame && mappedGameId !== selectedGame) return false;
    
    // Search query matching inside Stage 2
    if (selectedGame && searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!p.nameAr.toLowerCase().includes(query) && !p.name?.toLowerCase().includes(query)) return false;
    }

    // Group/Tab matching inside Stage 2
    if (selectedGame && activeGroup) {
      const activeGrp = activeGameGroups.find(g => g.id === activeGroup);
      if (activeGrp && !activeGrp.filter(p)) return false;
    }

    return true;
  });

  // Jordan dinar currency helper
  const formatJod = (val: number) => `${val.toFixed(2)} د.أ`;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto min-h-screen">
      <AnimatePresence mode="wait">
        {!selectedGame ? (
          // ----------------------------------------------------
          // STAGE 1: MAIN GAMES DIRECTORY GRID
          // ----------------------------------------------------
          <motion.div
            key="directory"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 animate-fade-in"
          >
            <div>
              <h1 className="text-3xl font-black text-white mb-2">الألعاب والخدمات الرقمية</h1>
              <p className="text-muted-foreground">اختر الخدمة أو اللعبة التي ترغب بشحنها</p>
            </div>

            {/* Categories filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <Button
                  key={cat.id}
                  variant={category === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCategory(cat.id);
                    setSearchQuery(""); // Clear search on category toggle
                  }}
                  className="flex-shrink-0 font-bold px-5"
                  data-testid={`button-category-${cat.id}`}
                >
                  {lang === "en" ? cat.labelEn : cat.labelAr}
                </Button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث عن لعبة أو بطاقة هدايا..."
                className="pr-10 text-right h-11 bg-card/60"
                data-testid="input-search"
              />
            </div>

            {/* Games Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {searchedGamesList.map((game, i) => (
                <motion.div
                  key={game.id}
                  onClick={() => {
                    setSelectedGame(game.id);
                    setSearchQuery(""); // Reset local search query when opening details
                  }}
                  className="rounded-xl p-3 sm:p-4 cursor-pointer text-center relative overflow-hidden transition-all border border-border/40 flex flex-col justify-between items-center group min-h-[190px] sm:min-h-[215px]"
                  style={{ background: "hsl(var(--card))" }}
                  whileHover={{ scale: 1.03, borderColor: "hsl(142 70% 35% / 0.5)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  data-testid={`card-game-${game.id}`}
                >
                  <div className="w-full aspect-[4/3] max-h-32 sm:max-h-40 rounded-xl mx-auto mb-3 bg-primary/10 flex items-center justify-center overflow-hidden transition-all group-hover:bg-primary/20">
                    <img src={game.imageUrl || "/images/logo/logo.png"} onError={onImageError} alt={game.nameAr} className="h-full w-full object-contain p-1.5 sm:p-2 transition-transform group-hover:scale-105" />
                  </div>
                  <h3 className="text-white font-bold text-sm sm:text-base mb-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center max-w-full">{lang === "en" ? (game.nameEn || game.name) : (game.nameAr || game.name)}</h3>
                  <span className="text-[11px] sm:text-xs text-muted-foreground truncate max-w-full">{game.name}</span>
                </motion.div>
              ))}
            </div>

            {searchedGamesList.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <LayoutGrid size={48} className="mx-auto mb-4 opacity-40" />
                <p className="text-lg">لا توجد خدمات متاحة في هذا القسم حالياً</p>
              </div>
            )}
          </motion.div>
        ) : (
          // ----------------------------------------------------
          // STAGE 2: ORGANIZED DETAILED GAME PAGE
          // ----------------------------------------------------
          <motion.div
            key="game-detail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 animate-fade-in"
          >
            {/* Header / Navigation back */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedGame(0)}
                  className="p-2.5 rounded-xl bg-card border border-border hover:bg-card/85 transition-all text-white"
                  data-testid="button-back-to-games"
                >
                  <ArrowRight size={18} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/20 overflow-hidden">
                    <img src={activeGame?.imageUrl || "/images/logo/logo.png"} onError={onImageError} alt="" className="h-full w-full object-contain p-1.5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-white">{lang === "en" ? (activeGame?.nameEn || activeGame?.name) : (activeGame?.nameAr || activeGame?.name)}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">اختر طريقة الشحن المناسبة لك ثم اختر الباقة المطلوبة</p>
                  </div>
                </div>
              </div>

              {/* Local Search inside Game Details */}
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث داخل الباقات..."
                  className="pr-9 text-right h-9 text-xs bg-card/60"
                />
              </div>
            </div>

            {/* Service groups Sub-tabs */}
            {activeGameGroups.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-white/[0.04] p-1">
                {activeGameGroups.map(grp => (
                  <Button
                    key={grp.id}
                    variant={activeGroup === grp.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveGroup(grp.id)}
                    className={`flex-shrink-0 text-xs font-bold rounded-lg px-4 h-9 ${
                      activeGroup === grp.id 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    {grp.titleAr}
                  </Button>
                ))}
              </div>
            )}

            {/* Server filter: if Server Tab is selected */}
            {activeGroup === "ff-server" && (
              <div className="flex items-center gap-3 bg-card/40 p-4 rounded-2xl border border-border/40">
                <Globe size={18} className="text-primary animate-pulse" />
                <Label className="text-white text-sm shrink-0">اختر السيرفر أولاً لتصفية الباقات المتاحة:</Label>
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger className="w-48 text-right text-xs bg-black/25">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Global", "MENA", "Europe", "Brazil", "Indonesia", "Thailand", "Vietnam", "Singapore", "Malaysia", "LATAM"].map(srv => (
                      <SelectItem key={srv} value={srv}>{srv}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sensitive account-data warning */}
            {(activeGroup?.includes("account") || activeGroup?.includes("monthly") || activeGroup?.includes("sports") || activeGroup?.includes("screen") || activeGroup?.includes("individual")) && (
              <div className="rounded-2xl p-4 text-xs leading-relaxed text-right animate-fade-in" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <p className="font-bold text-amber-400 mb-1 flex items-center gap-1.5 justify-end">
                  <Shield size={14} className="text-amber-400" />
                  {lang === "en" ? "Important account safety notice" : "تنبيه أمان مهم"}
                </p>
                <p className="text-white/75">
                  {lang === "en"
                    ? "Use temporary account details whenever possible, and change your password after the order is completed."
                    : "استخدم بيانات حساب مؤقتة قدر الإمكان، وغيّر كلمة المرور بعد اكتمال الطلب لحماية حسابك."}
                </p>
              </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts
                .filter(p => {
                  // Filter further based on selected server if Server tab is active
                  if (activeGroup === "ff-server") {
                    const name = (p.nameAr || p.name || "").toLowerCase();
                    const srv = selectedServer.toLowerCase();
                    return name.includes(srv) || p.server?.toLowerCase() === srv;
                  }
                  return true;
                })
                .map((product, i) => {
                  // Calculate dynamic points on the fly: 10 points per 1 JOD
                  const pointsEarned = Math.floor(product.price) * 10;
                  const productName = lang === "en" ? (product.nameEn || product.name) : (product.nameAr || product.name);

                  return (
                    <Link key={product.id} href={`/products/${product.id}`}>
                      <motion.div
                        className="rounded-xl p-3 sm:p-4 cursor-pointer h-full min-h-[230px] flex flex-col justify-between group transition-all"
                        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        whileHover={{ scale: 1.02, borderColor: "hsl(142 70% 35% / 0.4)", boxShadow: "0 4px 15px rgba(0,0,0,0.3)" }}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        data-testid={`card-product-${product.id}`}
                      >
                        <div className="w-full aspect-[4/3] max-h-36 rounded-lg mb-3 flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 overflow-hidden transition-all">
                          <img src={product.imageUrl || "/images/logo/logo.png"} onError={onImageError} alt="" className="h-full w-full object-contain p-1.5 sm:p-2 transition-transform group-hover:scale-105" />
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-white font-bold text-sm leading-snug group-hover:text-primary transition-colors">{productName}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] mt-auto">
                          <span className="text-primary font-black text-sm">{formatJod(product.price)}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Star size={8} className="text-primary fill-primary" />
                            +{pointsEarned}
                          </span>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-20 text-muted-foreground">
                  <LayoutGrid size={36} className="mx-auto mb-3 opacity-40 animate-pulse" />
                  <p className="text-sm">لا توجد باقات متوفرة في هذا القسم حالياً</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
