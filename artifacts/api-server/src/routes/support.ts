import { Router, type IRouter } from "express";
import { db, supportTicketsTable, ticketMessagesTable, usersTable } from "@workspace/db";
import { and, eq, desc, ne } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

async function getTicketWithMessages(ticketId: number) {
  const [ticket] = await db.select({
    ticket: supportTicketsTable,
    user: usersTable,
  }).from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .where(eq(supportTicketsTable.id, ticketId));

  if (!ticket) return null;

  const messages = await db.select().from(ticketMessagesTable)
    .where(eq(ticketMessagesTable.ticketId, ticketId))
    .orderBy(ticketMessagesTable.createdAt);

  return {
    id: ticket.ticket.id,
    userId: ticket.ticket.userId,
    userName: ticket.user?.name ?? "",
    title: ticket.ticket.title,
    status: ticket.ticket.status,
    messages: messages.map((m: any) => ({
      id: m.id,
      ticketId: m.ticketId,
      senderId: m.senderId,
      senderName: m.senderName,
      message: m.message,
      isAdmin: m.isAdmin,
      createdAt: m.createdAt.toISOString(),
    })),
    createdAt: ticket.ticket.createdAt.toISOString(),
  };
}

// Smart AI Assistant Topics and logic
function getSmartAIResponse(title: string, message: string): string {
  let cleanMessage = message;
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
      cleanMessage = parsed.text;
    }
  } catch {}

  const text = (title + " " + cleanMessage).toLowerCase();
  
  const normalize = (str: string) => {
    return str
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ًٌٍَُِّّْ]/g, "") 
      .replace(/هسا|هسه/g, "الان")
      .replace(/بدي|ابغي|ابي/g, "اريد")
      .replace(/ايش|شو/g, "ماذا")
      .replace(/شلون|كيفاش/g, "كيف")
      .replace(/قديش|بكم/g, "كم")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?؟]/g, "") 
      .replace(/\s+/g, " ")
      .trim();
  };
  
  const normText = normalize(text);

  const topics = [
    {
      keywords: ["سلام", "مرحبا", "هلا", "اهلا", "اهلين", "هاي", "كيفك", "يعطيك", "salam", "hi", "hello"],
      response: "وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك في متجر Grove Street. أنا مساعد جروف الذكي (GC Assistant)، ومستعد لمساعدتك اليوم في كل ما يخص شحن الألعاب، المحفظة، تتبع الطلبات، النقاط والمكافآت، سوق الحسابات، أو تحويلك للدعم البشري إذا لزم الأمر."
    },
    {
      keywords: ["محفظ", "رصيد", "شحن رصيد", "اشحن", "اورنج", "Orange", "Orange Money", "تحويل", "إيداع", "دفع", "اثبات", "رقم العملية", "0791517855", "دينار", "جود", "jod"],
      response: "لشحن محفظتك الرقمية بالدينار الأردني (د.أ)، يرجى تحويل المبلغ المطلوب عبر Orange Money الأردن إلى رقم الإدارة المعتمد: 0791517855. بعد التحويل، اذهب إلى صفحة 'المحفظة' في حسابك، اكتب المبلغ الذي قمت بتحويله، وأرسل رقم العملية أو ارفع صورة إثبات الدفع. يقوم الأدمن بمراجعة الإيداع وتأكيده يدوياً، لينضاف الرصيد فوراً إلى محفظتك لتتمكن من الشراء."
    },
    {
      keywords: ["فري فاير", "جواهر", "شحن فري", "diamonds", "free fire", "عضوية اسبوعية", "عضوية شهرية", "weekly", "monthly", "سيرفر"],
      response: "نوفر شحن جواهر فري فاير (Free Fire) بعدة طرق تناسبك، منها الشحن عبر المعرّف (Player ID)، الشحن عبر الحساب عند الحاجة، العضوية الأسبوعية أو الشهرية، وباقات السيرفرات المختلفة مثل MENA وGlobal وEurope وBrazil."
    },
    {
      keywords: ["ببجي", "شدات", "يو سي", "uc", "pubg", "رويال باس", "elite pass", "شحن ببجي"],
      response: "يمكنك شحن شدات ببجي (PUBG Mobile UC) فورياً وسهلاً عبر المعرّف الخاص بك (Player ID). نوفر باقات مختلفة تبدأ من 60 شدة وتصل إلى كميات كبيرة، كما نوفر تفعيل باقة النخبة (Elite Pass) مباشرة للرويال باس عبر معرّفك."
    },
    {
      keywords: ["موبايل ليجند", "ليجندز", "روبلوكس", "روبوكس", "robux", "roblox", "mlbb", "weekly diamond pass"],
      response: "نوفر شحن ألماس موبايل ليجيندز (MLBB) فورياً عبر إدخال رقم الحساب (User ID) ورقم الخادم (Zone ID)، بما في ذلك العضوية الأسبوعية المميزة (Weekly Diamond Pass). كما نوفر شحن روبوكس روبلوكس (Robux) فورياً وآمناً بمجرد إدخال اسم المستخدم الخاص بك في Roblox."
    },
    {
      keywords: ["بطاقات", "كرت", "ستيم", "جوجل بلاي", "بلايستيشن", "اكس بوكس", "steam", "google play", "playstation", "xbox", "gift card", "كود"],
      response: "نوفر أكواد شحن وبطاقات هدايا رقمية عالمية وأمريكية وعربية لمختلف المنصات:\n- بطاقات ستيم (Steam) أمريكي وتركي.\n- بطاقات جوجل بلاي (Google Play) أمريكي وسعودي.\n- بطاقات بلايستيشن (PlayStation Network PSN) أمريكي.\n- بطاقات إكس بوكس (Xbox Live) أمريكي.\nيصلك الكود لتفعيله على المنصة المناسبة."
    },
    {
      keywords: ["شات جي بي تي", "chatgpt", "شاهد", "netflix", "نتفلكس", "نتفليكس", "يوتيوب بريميوم", "youtube", "premium", "iptv", "اشتراك", "حساب جاهز", "باسورد"],
      response: "الاشتراكات المميزة مثل ChatGPT Plus، شاهد VIP، نتفليكس Premium، يوتيوب بريميوم، وIPTV يتم تجهيزها حسب بيانات الطلب. بعد طلب الخدمة وإتمام الدفع من محفظتك، يمكنك متابعة حالة الطلب من صفحة طلباتي.\n\n🔒 نصيحة أمان: يرجى تغيير كلمة مرور حسابك بعد اكتمال الطلب للحفاظ على سرية حسابك."
    },
    {
      keywords: ["رتب", "رتبة", "رتبتي", "برونزي", "فضي", "ذهبي", "بلاتيني", "دايموند", "اسطوري", "نيقا", "نيغا", "emerald", "glow", "زمردي", "الشريط"],
      response: "تعتمد الرتب في متجر جروف على تجميع النقاط من الطلبات المكتملة فقط:\n- برونزي (Bronze): 0 نقطة.\n- فضي (Silver): 500 نقطة.\n- ذهبي (Gold): 1500 نقطة.\n- بلاتيني (Platinum): 4000 نقطة.\n- دايموند (Diamond): 10000 نقطة.\n- رتبة Niga الفاخرة والأعلى: 50000 نقطة.\n\nالخصومات المباشرة صغيرة ومحصورة في Diamond وNiga فقط وعلى المنتجات التي تسمح بها الإدارة."
    },
    {
      keywords: ["نقاط", "النقاط", "جمع نقاط", "ليش ما انضافت", "استبدل", "مكافاة", "جوائز", "مكافآت"],
      response: "تُمنح النقاط تلقائياً بعد اكتمال الطلب بنجاح فقط، وليس عند إنشاء الطلب أو شحن المحفظة. النظام مصمم بمنح نقطة واحدة لكل 3 دنانير من الطلبات المكتملة (Math.floor(price / 3)). عند تحديث حالة طلبك إلى مكتمل، ستضاف النقاط إلى رصيدك."
    },
    {
      keywords: ["توثيق", "وثق", "شارة توثيق", "حساب موثق", "هوية", "سيلفي", "الهوية", "شارة خضراء"],
      response: "التوثيق يمنحك شارة توثيق خضراء فارغ بجانب اسمك لزيادة الموثوقية والأمان في المتجر وسوق الحسابات. لطلب التوثيق، اذهب لصفحة 'التوثيق'، أدخل اسمك ورقم جوالك، وارفع صور الهوية (من الأمام والخلف) وصورة سيلفي واضحة وأنت تحمل الهوية بجانب وجهك. سيراجع الأدمن البيانات ويوثق حسابك قريباً."
    },
    {
      keywords: ["بيع حساب", "سوق الحسابات", "اعرض حسابي", "شراء حساب", "بيع حسابي", "سوق الحساب"],
      response: "سوق الحسابات هو بيئة آمنة تتيح لك عرض حسابات ألعابك للبيع أو شراء حسابات موثقة ومضمونة. لعرض حسابك للبيع، اذهب إلى صفحة 'بيع حساب'، أدخل تفاصيل الحساب ومواصفاته كاملة والسعر المطلوب بالدينار الأردني، وارفع صوراً واضحة للحساب. سيقوم الأدمن بمراجعة الحساب وعرضه للجميع فور الموافقة."
    },
    {
      keywords: ["ثائر", "السلامين", "وادي موسى", "صاحب المتجر", "مؤسس الموقع", "من صمم", "الادمن الرئيسي"],
      response: "مؤسس وصاحب متجر Grove Street بالكامل هو الشاب ثائر محمد السلامين، يبلغ من العمر 18 عاماً، من الأردن وتحديداً من مدينة وادي موسى الأثرية (البتراء). يقوم بإدارة المتجر والإشراف على معالجة الطلبات، التوثيق، شحن المحفظة، ودعم العملاء مع فريق العمل المساعد."
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

// 1. Get all tickets (Admin only)
router.get("/support/tickets/all", requireAdmin, async (_req, res): Promise<void> => {
  const tickets = await db.select({
    ticket: supportTicketsTable,
    user: usersTable,
  }).from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .orderBy(desc(supportTicketsTable.createdAt));

  res.json(tickets.map(({ ticket, user }: any) => ({
    id: ticket.id,
    userId: ticket.userId,
    userName: user?.name ?? "",
    title: ticket.title,
    status: ticket.status,
    messages: [],
    createdAt: ticket.createdAt.toISOString(),
  })));
});

// 2. Get own open/active support tickets
router.get("/support/tickets", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const tickets = await db.select().from(supportTicketsTable)
    .where(and(eq(supportTicketsTable.userId, user.id), ne(supportTicketsTable.status, "closed")))
    .orderBy(desc(supportTicketsTable.createdAt));

  res.json(tickets.map((t: any) => ({
    id: t.id,
    userId: t.userId,
    userName: "",
    title: t.title,
    status: t.status,
    messages: [],
    createdAt: t.createdAt.toISOString(),
  })));
});

// 3. Create a new support ticket (Forced to current user)
router.post("/support/tickets", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const userId = user.id;

  const { title, message } = req.body;
  if (!title || !message) { res.status(400).json({ error: "Missing required fields" }); return; }

  const [ticket] = await db.insert(supportTicketsTable).values({ userId, title, status: "open" }).returning();

  // 1. Insert User Message
  await db.insert(ticketMessagesTable).values({
    ticketId: ticket.id,
    senderId: userId,
    senderName: user.name ?? "User",
    message,
    isAdmin: false,
  });

  // 2. Perform AI Assistant scans and insert response automatically
  const aiAnswer = getSmartAIResponse(title, message);
  let aiMessage = "";

  if (aiAnswer) {
    aiMessage = `أهلاً بك! أنا مساعد جروف الذكي. بناءً على تذكرتك، إليك الإجابة المباشرة المخصصة:\n\n${aiAnswer}\n\n(تنبيه: تذكرتك تظل مفتوحة وتحت المراجعة وسيقوم الأدمن بمتابعتها والرد البشري أيضاً في حال لم يتم حل استفسارك بالكامل).`;
  } else {
    aiMessage = `أهلاً بك! تم استلام تذكرتك بنجاح. لم أتمكن من إيجاد إجابة مباشرة لسؤالك، لذلك قمت بتحويلها وتنبيه الأدمن لمراجعة تفاصيل مشكلتك وحلها بأسرع وقت ممكن. يرجى الانتظار.`;
  }

  // Insert AI automatic message
  await db.insert(ticketMessagesTable).values({
    ticketId: ticket.id,
    senderId: 9999,
    senderName: "مساعد جروف / GC Assistant",
    message: aiMessage,
    isAdmin: true,
  });

  const full = await getTicketWithMessages(ticket.id);
  res.status(201).json(full);
});

// 4. View support ticket messages (Owner or Admin only check to prevent IDOR)
router.get("/support/tickets/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUser = req.user!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const ticket = await getTicketWithMessages(id);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
  if (ticket.userId !== currentUser.id && !isAdmin) {
    res.status(403).json({ error: "Forbidden: You are not authorized to view this ticket" });
    return;
  }

  res.json(ticket);
});

// 5. Reply to support ticket (Owner or Admin only check to prevent IDOR)
router.post("/support/tickets/:id/reply", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUser = req.user!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ticketId = parseInt(raw, 10);
  if (isNaN(ticketId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { message } = req.body;
  if (!message) { res.status(400).json({ error: "Missing message" }); return; }

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, ticketId));
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (ticket.status === "closed") { res.status(400).json({ error: "Ticket closed" }); return; }

  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
  if (ticket.userId !== currentUser.id && !isAdmin) {
    res.status(403).json({ error: "Forbidden: You are not authorized to reply to this ticket" });
    return;
  }

  const [msg] = await db.insert(ticketMessagesTable).values({
    ticketId,
    senderId: currentUser.id,
    senderName: currentUser.name ?? "User",
    message,
    isAdmin,
  }).returning();

  // If client replies, reset status to open for admin visibility
  if (!isAdmin && ticket.status !== "open") {
    await db.update(supportTicketsTable).set({ status: "open" }).where(eq(supportTicketsTable.id, ticketId));
  }

  res.status(201).json({
    id: msg.id,
    ticketId: msg.ticketId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    message: msg.message,
    isAdmin: msg.isAdmin,
    createdAt: msg.createdAt.toISOString(),
  });
});

// 6. Change support ticket status (Admin only)
router.post("/support/tickets/:id/status", requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const { status } = req.body;
  if (!status) { res.status(400).json({ error: "Missing status" }); return; }

  await db.update(supportTicketsTable).set({ status }).where(eq(supportTicketsTable.id, id));
  
  const full = await getTicketWithMessages(id);
  res.json(full);
});

// 7. Close support ticket (Owner or Admin only)
router.post("/support/tickets/:id/close", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const currentUser = req.user!;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const isAdmin = currentUser.role === "admin" || currentUser.role === "owner";
  if (ticket.userId !== currentUser.id && !isAdmin) {
    res.status(403).json({ error: "Forbidden: You are not authorized to close this ticket" });
    return;
  }

  await db.update(supportTicketsTable).set({ status: "closed" }).where(eq(supportTicketsTable.id, id));
  res.json({ message: "Ticket closed" });
});

export default router;
