import { KNOWLEDGE_BASE } from "./assistantKnowledge";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?؟،]/g, " ")
    .replace(/\s+/g, " ");
}

export interface EngineResult {
  text: string;
  escalate: boolean;
}

const OFF_TOPIC_WORDS = [
  "سياسه", "سياسي", "دين", "اسلام", "مسيح", "طبي", "دكتور", "علاج",
  "برمجه", "كود", "هكر", "اختراق", "python", "javascript", "code",
  "programming", "hack", "bypass", "api key", "secret", "password admin",
  "owner password", "تكويد",
];

const ESCALATION_TRIGGERS_AR = [
  "بدي دعم", "احكي مع الادمن", "كلم شخص", "المشكله ما انحلت",
  "طلبي تاخر", "شكوي", "شكوى", "بدي اشتكي", "بدي اكلم الادمن",
  "تواصل مع الادمن", "الادمن البشري", "افتح تذكره", "تذكره دعم",
];

const ESCALATION_TRIGGERS_EN = [
  "contact support", "talk to admin", "human support", "my order is delayed",
  "problem not solved", "complaint", "open ticket", "chat with human",
];

function includesNormalized(message: string, phrase: string): boolean {
  const normalizedPhrase = normalizeText(phrase);
  return message.includes(normalizedPhrase) || normalizedPhrase.includes(message);
}

export function getAssistantResponse(message: string, lang: "ar" | "en"): EngineResult {
  const normalized = normalizeText(message);

  const isOffTopic = OFF_TOPIC_WORDS.some(word => includesNormalized(normalized, word));
  if (isOffTopic) {
    return {
      text: lang === "ar"
        ? "أنا مساعد Grove Street، أقدر أساعدك فقط بأمور الموقع مثل الشحن، الطلبات، المحفظة، النقاط، الرتب، التوثيق، السوق، والدعم."
        : "I am the Grove Street assistant. I can only help with site topics like top-ups, orders, wallet, points, ranks, verification, marketplace, and support.",
      escalate: false,
    };
  }

  const needsEscalation =
    ESCALATION_TRIGGERS_AR.some(trigger => includesNormalized(normalized, trigger)) ||
    ESCALATION_TRIGGERS_EN.some(trigger => includesNormalized(normalized, trigger)) ||
    ["دعم", "support", "ticket", "تذكره", "تذكرة"].includes(normalized);

  if (needsEscalation) {
    return {
      text: lang === "ar"
        ? "إذا الموضوع يحتاج مراجعة من شخص، أقدر أحولك للدعم. اضغط زر تحويل إلى الدعم وسيتم إنشاء تذكرة تحتوي على سؤالك وآخر المحادثة حتى يراجعها فريق Grove Street."
        : "If this needs human review, I can escalate it to support. Press Transfer to Support and a ticket will be created with your question and recent chat.",
      escalate: true,
    };
  }

  const isGreeting = KNOWLEDGE_BASE.greetings.keywords.some(keyword => includesNormalized(normalized, keyword));
  if (isGreeting) {
    if (lang === "ar") {
      if (normalized.includes("كيف") || normalized.includes("شلون") || normalized.includes("اخبار")) {
        return { text: "تمام الحمد لله، احكيلي شو بدك تعرف عن Grove Street؟", escalate: false };
      }
      if (normalized.includes("يعطيك") || normalized.includes("عافيه")) {
        return { text: "الله يعافيك ويسعدك. كيف أقدر أساعدك اليوم بخصوص الشحن، الطلبات، المحفظة، أو الدعم؟", escalate: false };
      }
      return { text: KNOWLEDGE_BASE.greetings.responseAr, escalate: false };
    }
    return { text: KNOWLEDGE_BASE.greetings.responseEn, escalate: false };
  }

  for (const key of Object.keys(KNOWLEDGE_BASE)) {
    if (key === "greetings" || key === "fallback") continue;

    const item = KNOWLEDGE_BASE[key]!;
    const matched = item.keywords.some(keyword => includesNormalized(normalized, keyword));
    if (matched) {
      return {
        text: lang === "ar" ? item.responseAr : item.responseEn,
        escalate: item.escalate || false,
      };
    }
  }

  const fallbackNode = KNOWLEDGE_BASE.fallback;
  return {
    text: lang === "ar" ? fallbackNode.responseAr : fallbackNode.responseEn,
    escalate: true,
  };
}
