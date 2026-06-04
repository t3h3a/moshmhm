import {
  db,
  usersTable,
  gamesTable,
  productsTable,
  ranksTable,
  rewardsTable,
  adsTable,
  activityTable,
  siteSettingsTable,
} from "@workspace/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "grove_salt_2024").digest("hex");
}

async function seed() {
  console.log("🌱 Seeding Grove Street database...");

  // Admin users
  await db
    .insert(usersTable)
    .values([
      {
        name: "ثائر",
        username: "thaer_owner",
        email: "tthhaaeeeerr@gmail.com",
        passwordHash: hashPassword("Thaermoh@@1234562008"),
        role: "owner",
        walletBalance: "1000",
        points: 25000,
        rank: "Legend",
      },
      {
        name: "مدير النظام",
        username: "admin_grove",
        email: "qtybhrbas774@gmail.com",
        passwordHash: hashPassword("admin123"),
        role: "admin",
        walletBalance: "500",
        points: 5000,
        rank: "Diamond",
      },
      {
        name: "أحمد العمري",
        username: "ahmed_al",
        email: "ahmed@example.com",
        passwordHash: hashPassword("user123"),
        role: "user",
        walletBalance: "250",
        points: 3200,
        rank: "Platinum",
        isVerified: true,
      },
      {
        name: "سارة المطيري",
        username: "sara_m",
        email: "sara@example.com",
        passwordHash: hashPassword("user123"),
        role: "user",
        walletBalance: "120",
        points: 1800,
        rank: "Gold",
      },
      {
        name: "خالد الشهري",
        username: "khalid_sh",
        email: "khalid@example.com",
        passwordHash: hashPassword("user123"),
        role: "user",
        walletBalance: "75",
        points: 650,
        rank: "Silver",
      },
    ])
    .onConflictDoNothing();

  // Games
  const [freefire, pubg, roblox, fcMobile, minecraft, clashRoyale, mobileLegends, genshin] =
    await db
      .insert(gamesTable)
      .values([
        {
          name: "Free Fire",
          nameAr: "فري فاير",
          imageUrl: "https://placehold.co/200x200/1a472a/ffffff?text=FF",
        },
        {
          name: "PUBG Mobile",
          nameAr: "ببجي موبايل",
          imageUrl: "https://placehold.co/200x200/1b3a5c/ffffff?text=PUBG",
        },
        {
          name: "Roblox",
          nameAr: "روبلوكس",
          imageUrl: "https://placehold.co/200x200/cc0000/ffffff?text=ROB",
        },
        {
          name: "FC Mobile",
          nameAr: "إف سي موبايل",
          imageUrl: "https://placehold.co/200x200/004c97/ffffff?text=FC",
        },
        {
          name: "Minecraft",
          nameAr: "ماين كرافت",
          imageUrl: "https://placehold.co/200x200/5c4033/ffffff?text=MC",
        },
        {
          name: "Clash Royale",
          nameAr: "كلاش رويال",
          imageUrl: "https://placehold.co/200x200/2c4a7c/ffffff?text=CR",
        },
        {
          name: "Mobile Legends",
          nameAr: "موبايل ليجيندز",
          imageUrl: "https://placehold.co/200x200/8b0000/ffffff?text=ML",
        },
        {
          name: "Genshin Impact",
          nameAr: "جنشن إمباكت",
          imageUrl: "https://placehold.co/200x200/1a237e/ffffff?text=GI",
        },
      ])
      .returning();

  // Products
  await db
    .insert(productsTable)
    .values([
      // Free Fire
      {
        name: "100 Free Fire Diamonds",
        nameAr: "100 جوهرة فري فاير",
        price: "5",
        category: "games",
        gameId: freefire!.id,
        imageUrl: "https://placehold.co/300x200/1a472a/ffffff?text=100+💎",
        isFeatured: true,
        pointsEarned: 5,
        inputFields: '[{"name":"player_id","label":"رقم اللاعب","type":"text","required":true}]',
        descriptionAr: "100 جوهرة فري فاير - أسرع شحن وأفضل سعر",
      },
      {
        name: "310 Free Fire Diamonds",
        nameAr: "310 جوهرة فري فاير",
        price: "14",
        category: "games",
        gameId: freefire!.id,
        imageUrl: "https://placehold.co/300x200/1a472a/ffffff?text=310+💎",
        isFeatured: true,
        pointsEarned: 14,
        inputFields: '[{"name":"player_id","label":"رقم اللاعب","type":"text","required":true}]',
        descriptionAr: "310 جوهرة فري فاير",
      },
      {
        name: "520 Free Fire Diamonds",
        nameAr: "520 جوهرة فري فاير",
        price: "22",
        category: "games",
        gameId: freefire!.id,
        imageUrl: "https://placehold.co/300x200/1a472a/ffffff?text=520+💎",
        pointsEarned: 22,
        inputFields: '[{"name":"player_id","label":"رقم اللاعب","type":"text","required":true}]',
        descriptionAr: "520 جوهرة فري فاير",
      },
      // PUBG
      {
        name: "60 UC PUBG",
        nameAr: "60 شدة ببجي",
        price: "6",
        category: "games",
        gameId: pubg!.id,
        imageUrl: "https://placehold.co/300x200/1b3a5c/ffffff?text=60+UC",
        isFeatured: true,
        pointsEarned: 6,
        inputFields: '[{"name":"player_id","label":"رقم اللاعب","type":"text","required":true}]',
        descriptionAr: "60 شدة ببجي موبايل",
      },
      {
        name: "325 UC PUBG",
        nameAr: "325 شدة ببجي",
        price: "29",
        category: "games",
        gameId: pubg!.id,
        imageUrl: "https://placehold.co/300x200/1b3a5c/ffffff?text=325+UC",
        isFeatured: true,
        pointsEarned: 29,
        inputFields: '[{"name":"player_id","label":"رقم اللاعب","type":"text","required":true}]',
        descriptionAr: "325 شدة ببجي موبايل",
      },
      {
        name: "660 UC PUBG",
        nameAr: "660 شدة ببجي",
        price: "55",
        category: "games",
        gameId: pubg!.id,
        imageUrl: "https://placehold.co/300x200/1b3a5c/ffffff?text=660+UC",
        pointsEarned: 55,
        inputFields: '[{"name":"player_id","label":"رقم اللاعب","type":"text","required":true}]',
        descriptionAr: "660 شدة ببجي موبايل",
      },
      // Roblox
      {
        name: "400 Robux",
        nameAr: "400 روبوكس",
        price: "16",
        category: "games",
        gameId: roblox!.id,
        imageUrl: "https://placehold.co/300x200/cc0000/ffffff?text=400+R$",
        isFeatured: true,
        pointsEarned: 16,
        inputFields: '[{"name":"username","label":"اسم المستخدم","type":"text","required":true}]',
        descriptionAr: "400 روبوكس",
      },
      {
        name: "1000 Robux",
        nameAr: "1000 روبوكس",
        price: "40",
        category: "games",
        gameId: roblox!.id,
        imageUrl: "https://placehold.co/300x200/cc0000/ffffff?text=1000+R$",
        pointsEarned: 40,
        inputFields: '[{"name":"username","label":"اسم المستخدم","type":"text","required":true}]',
        descriptionAr: "1000 روبوكس",
      },
      // Subscriptions
      {
        name: "YouTube Premium 1 Month",
        nameAr: "يوتيوب بريميوم شهر",
        price: "25",
        category: "subscriptions",
        imageUrl: "https://placehold.co/300x200/cc0000/ffffff?text=YT+Premium",
        isFeatured: true,
        pointsEarned: 25,
        inputFields: '[{"name":"email","label":"البريد الإلكتروني","type":"email","required":true}]',
        descriptionAr: "اشتراك يوتيوب بريميوم شهر كامل بدون إعلانات",
      },
      {
        name: "Netflix 1 Month",
        nameAr: "نتفليكس شهر",
        price: "45",
        category: "subscriptions",
        imageUrl: "https://placehold.co/300x200/8b0000/ffffff?text=Netflix",
        isFeatured: true,
        pointsEarned: 45,
        inputFields: '[{"name":"email","label":"البريد الإلكتروني","type":"email","required":true}]',
        descriptionAr: "اشتراك نتفليكس شهر كامل - الباقة الأساسية",
      },
      {
        name: "Spotify Premium 1 Month",
        nameAr: "سبوتيفاي بريميوم شهر",
        price: "20",
        category: "subscriptions",
        imageUrl: "https://placehold.co/300x200/1DB954/ffffff?text=Spotify",
        pointsEarned: 20,
        inputFields: '[{"name":"email","label":"البريد الإلكتروني","type":"email","required":true}]',
        descriptionAr: "اشتراك سبوتيفاي بريميوم",
      },
      {
        name: "IPTV 1 Year",
        nameAr: "IPTV سنة كاملة",
        price: "99",
        category: "subscriptions",
        imageUrl: "https://placehold.co/300x200/222222/ffffff?text=IPTV",
        pointsEarned: 100,
        descriptionAr: "اشتراك IPTV سنة كاملة - أكثر من 10,000 قناة",
      },
      // Social
      {
        name: "1000 Instagram Followers",
        nameAr: "1000 متابع إنستغرام",
        price: "35",
        category: "social",
        imageUrl: "https://placehold.co/300x200/833ab4/ffffff?text=IG+Follow",
        isFeatured: true,
        pointsEarned: 35,
        inputFields: '[{"name":"username","label":"اسم الحساب","type":"text","required":true}]',
        descriptionAr: "1000 متابع حقيقي لحسابك على إنستغرام",
      },
      {
        name: "5000 TikTok Followers",
        nameAr: "5000 متابع تيك توك",
        price: "50",
        category: "social",
        imageUrl: "https://placehold.co/300x200/010101/ffffff?text=TT+Follow",
        pointsEarned: 50,
        inputFields: '[{"name":"username","label":"اسم الحساب","type":"text","required":true}]',
        descriptionAr: "5000 متابع لحسابك على تيك توك",
      },
    ])
    .onConflictDoNothing();

  // Ranks
  await db
    .insert(ranksTable)
    .values([
      { name: "Bronze", nameAr: "برونزي", minPoints: 0, color: "amber", icon: "🥉", benefits: "وصول أساسي لجميع الخدمات" },
      { name: "Silver", nameAr: "فضي", minPoints: 500, color: "gray", icon: "🥈", benefits: "خصم 2% على جميع الطلبات" },
      { name: "Gold", nameAr: "ذهبي", minPoints: 1500, color: "yellow", icon: "🥇", benefits: "خصم 5% على جميع الطلبات + أولوية الدعم" },
      { name: "Platinum", nameAr: "بلاتيني", minPoints: 3000, color: "cyan", icon: "💎", benefits: "خصم 8% + دعم مميز + مكافآت حصرية" },
      { name: "Diamond", nameAr: "دايموند", minPoints: 5000, color: "blue", icon: "💠", benefits: "خصم 12% + مكافآت مضاعفة + وصول VIP" },
      { name: "Legend", nameAr: "أسطوري", minPoints: 10000, color: "gold", icon: "⭐", benefits: "خصم 15% + نقاط مضاعفة + شارة خاصة + عروض حصرية" },
    ])
    .onConflictDoNothing();

  // Rewards
  await db
    .insert(rewardsTable)
    .values([
      { nameAr: "100 جوهرة فري فاير مجاناً", description: "Free 100 FF diamonds", pointsCost: 2000, imageUrl: "https://placehold.co/100x100/1a472a/ffffff?text=FF" },
      { nameAr: "60 شدة ببجي مجاناً", description: "Free 60 UC PUBG", pointsCost: 2500, imageUrl: "https://placehold.co/100x100/1b3a5c/ffffff?text=UC" },
      { nameAr: "310 جوهرة فري فاير مجاناً", description: "Free 310 FF diamonds", pointsCost: 4000, imageUrl: "https://placehold.co/100x100/1a472a/ffffff?text=FF" },
      { nameAr: "خصم 10% على طلبك القادم", description: "10% discount on next order", pointsCost: 6000 },
      { nameAr: "20 ريال رصيد في المحفظة", description: "20 SAR wallet credit", pointsCost: 8000 },
      { nameAr: "اشتراك يوتيوب بريميوم شهر", description: "1 month YouTube Premium", pointsCost: 10000, imageUrl: "https://placehold.co/100x100/cc0000/ffffff?text=YT" },
      { nameAr: "50 ريال رصيد في المحفظة", description: "50 SAR wallet credit", pointsCost: 15000 },
    ])
    .onConflictDoNothing();

  // Ads
  await db
    .insert(adsTable)
    .values([
      {
        title: "Free Fire Mega Sale",
        titleAr: "تخفيضات ضخمة على فري فاير",
        description: "Get double diamonds this weekend",
        descriptionAr: "احصل على ضعف الجواهر هذا الأسبوع",
        imageUrl: "https://placehold.co/800x400/1a472a/ffffff?text=🔥+عروض+فري+فاير",
        linkUrl: "/products",
        buttonText: "Shop Now",
        buttonTextAr: "تسوق الآن",
        order: 1,
      },
      {
        title: "PUBG Season Pass",
        titleAr: "باس موسم ببجي الجديد",
        description: "Exclusive season pass bundles",
        descriptionAr: "باقات باس الموسم الحصرية بأفضل الأسعار",
        imageUrl: "https://placehold.co/800x400/1b3a5c/ffffff?text=🎮+باس+موسم+ببجي",
        linkUrl: "/products",
        buttonText: "Get Now",
        buttonTextAr: "احصل عليه الآن",
        order: 2,
      },
      {
        title: "Marketplace Launch",
        titleAr: "سوق الحسابات أصبح متاحاً",
        description: "Buy and sell game accounts safely",
        descriptionAr: "اشتري وبع حسابات الألعاب بأمان تام",
        imageUrl: "https://placehold.co/800x400/0a2a1a/22c55e?text=🏪+سوق+الحسابات",
        linkUrl: "/marketplace",
        buttonText: "Explore",
        buttonTextAr: "استعرض الآن",
        order: 3,
      },
      {
        title: "Earn Points Rewards",
        titleAr: "اكسب نقاط واحصل على مكافآت",
        description: "Every purchase earns you points toward free rewards",
        descriptionAr: "كل عملية شراء تكسبك نقاط للمكافآت المجانية",
        imageUrl: "https://placehold.co/800x400/1a1a2e/ffd700?text=⭐+نقاط+ومكافآت",
        linkUrl: "/points",
        buttonText: "Learn More",
        buttonTextAr: "اعرف المزيد",
        order: 4,
      },
    ])
    .onConflictDoNothing();

  // Activity feed
  await db
    .insert(activityTable)
    .values([
      { message: "Ahmed bought 310 FF diamonds", messageAr: "أحمد اشترى 310 جوهرة فري فاير", type: "purchase" },
      { message: "Sara charged 325 UC PUBG", messageAr: "سارة شحنت 325 شدة ببجي", type: "purchase" },
      { message: "Mohammed bought 1000 Instagram followers", messageAr: "محمد اشترى 1000 متابع إنستغرام", type: "purchase" },
      { message: "Liyan reached Diamond rank", messageAr: "ليان وصلت إلى رتبة دايموند", type: "rank_up" },
      { message: "Thaer redeemed 4000 points for a reward", messageAr: "ثائر استبدل 4000 نقطة بمكافأة", type: "reward" },
      { message: "Khalid bought a premium PUBG account", messageAr: "خالد اشترى حساب ببجي مميز", type: "purchase" },
      { message: "Omar successfully charged his wallet", messageAr: "عمر شحن محفظته بنجاح", type: "wallet" },
      { message: "Nour bought today's offer", messageAr: "نور اشترت عرض اليوم", type: "purchase" },
      { message: "Fahad reached Gold rank", messageAr: "فهد وصل إلى رتبة ذهبي", type: "rank_up" },
      { message: "Reem bought 1000 Robux", messageAr: "ريم اشترت 1000 روبوكس", type: "purchase" },
      { message: "Abdullah bought Netflix subscription", messageAr: "عبدالله اشترى اشتراك نتفليكس", type: "purchase" },
      { message: "Dana redeemed wallet credit reward", messageAr: "دانة استبدلت مكافأة رصيد المحفظة", type: "reward" },
    ])
    .onConflictDoNothing();

  // Site settings
  await db
    .insert(siteSettingsTable)
    .values({
      siteName: "Grove Street",
      siteDescription: "شارعك الرقمي لشحن الألعاب والخدمات الرقمية",
      maintenanceMode: "false",
      contactEmail: "support@grovestreet.gg",
      contactPhone: "+966500000000",
      socialLinks: '{"twitter":"","instagram":"","snapchat":""}',
    })
    .onConflictDoNothing();

  console.log("✅ Seed complete!");
}

seed().catch(console.error);
