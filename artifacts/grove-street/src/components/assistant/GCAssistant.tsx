import { useEffect, useRef, useState } from "react";
import { HeadphonesIcon, Send, ShieldAlert, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateTicket, getListAllTicketsQueryKey, getListTicketsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAssistantResponse } from "@/lib/assistantEngine";
import { getUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Message {
  sender: "user" | "assistant";
  text: string;
  escalate?: boolean;
}

interface GCAssistantProps {
  onClose: () => void;
  lang: "ar" | "en";
}

const QUICK_QUESTIONS_AR = [
  "كيف أشحن محفظتي؟",
  "كيف أتابع طلبي؟",
  "كيف أستبدل النقاط؟",
  "كيف أبيع حسابي؟",
  "كيف أوثق حسابي؟",
  "كيف أتواصل مع الدعم؟",
];

const QUICK_QUESTIONS_EN = [
  "How to top up my wallet?",
  "How to track my order?",
  "How to redeem points?",
  "How to sell an account?",
  "How to verify my account?",
  "How to contact support?",
];

export default function GCAssistant({ onClose, lang }: GCAssistantProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const createTicketMutation = useCreateTicket();
  const isFemale = user?.gender === "female";
  const [hasAvatarImg, setHasAvatarImg] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const assistantAvatar = isFemale ? "/assets/female/characters/zomoroda-character.png" : "/assets/male/characters/gc-character.png";
  const quickQuestions = lang === "ar" ? QUICK_QUESTIONS_AR : QUICK_QUESTIONS_EN;

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "assistant",
      text: lang === "ar"
        ? "أهلاً بك في Grove Street. أنا مساعد GC الذكي. كيف أقدر أساعدك اليوم بخصوص الشحن، الطلبات، المحفظة، النقاط، التوثيق، السوق، أو الدعم؟"
        : "Welcome to Grove Street. I can help with top-ups, orders, wallet, points, verification, marketplace, and support.",
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend(textToSend: string) {
    const cleanText = textToSend.trim();
    if (!cleanText || isTyping) return;

    setMessages(prev => [...prev, { sender: "user", text: cleanText }]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getAssistantResponse(cleanText, lang);
      setMessages(prev => [...prev, { sender: "assistant", text: response.text, escalate: response.escalate }]);
      setIsTyping(false);
    }, 650);
  }

  async function handleEscalation(lastUserMsg: string) {
    if (!user) {
      toast({
        title: lang === "ar" ? "تسجيل الدخول مطلوب" : "Authentication Required",
        description: lang === "ar" ? "يرجى تسجيل الدخول أولاً حتى تتمكن من فتح تذكرة دعم." : "Please log in first to open a support ticket.",
        variant: "destructive",
      });
      return;
    }

    try {
      setMessages(prev => [...prev, {
        sender: "assistant",
        text: lang === "ar" ? "جارٍ تحويل المحادثة وفتح تذكرة دعم للفريق..." : "Opening a support ticket...",
      }]);

      const transcript = messages
        .map(m => `${m.sender === "user" ? "المستخدم" : "المساعد"}: ${m.text}`)
        .join("\n");

      const ticket = await createTicketMutation.mutateAsync({
        data: {
          title: lang === "ar" ? `مساعد GC: تحويل محادثة - ${user.name}` : `GC Assistant: Escalated - ${user.name}`,
          message: JSON.stringify({
            text: `تم تحويل هذه التذكرة من مساعد GC الذكي.
السؤال غير المحلول: ${lastUserMsg}
بريد المستخدم: ${user.email}

سجل المحادثة:
${transcript}`,
            attachments: [],
          }),
        } as any,
      });

      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAllTicketsQueryKey() });
      setEscalated(true);
      setMessages(prev => [...prev, {
        sender: "assistant",
        text: lang === "ar"
          ? `تم فتح تذكرة دعم برقم #${ticket.id}. سيرد عليك فريق الدعم عبر صفحة الدعم.`
          : `Support ticket #${ticket.id} was opened. The support team will reply on the Support page.`,
      }]);
    } catch {
      toast({
        title: lang === "ar" ? "خطأ" : "Error",
        description: lang === "ar" ? "فشل فتح تذكرة الدعم، يرجى المحاولة لاحقاً." : "Failed to open support ticket. Please try again.",
        variant: "destructive",
      });
    }
  }

  const lastUserMsg = [...messages].reverse().find(m => m.sender === "user")?.text ?? "";
  const lastMsgEscalate = Boolean(messages[messages.length - 1]?.escalate && !escalated);

  return (
    <motion.div
      className="fixed z-50 flex flex-col bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xl bottom-[85px] left-4 right-4 h-[65vh] md:bottom-6 md:right-6 md:left-auto md:w-[380px] md:h-[520px]"
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 30 }}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="p-4 border-b border-border/60 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 overflow-hidden">
            {hasAvatarImg ? (
              <img src={assistantAvatar} onError={() => setHasAvatarImg(false)} alt="" className="w-8 h-8 object-cover scale-110" />
            ) : (
              <span className={`text-[10px] font-black ${isFemale ? "text-pink-400" : "text-primary"}`}>{isFemale ? "GG" : "GC"}</span>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border border-card animate-pulse" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm leading-tight flex items-center gap-1">
              {lang === "ar" ? "مساعد جروف" : "GC Assistant"}
              <Sparkles size={12} className="text-primary" />
            </h3>
            <span className="text-[10px] text-primary font-medium">
              {lang === "ar" ? "متصل - جاهز للمساعدة" : "Online - Ready to Help"}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-hide bg-black/10">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-right ${
                msg.sender === "user"
                  ? "bg-primary text-white rounded-br-none shadow-md shadow-primary/10"
                  : "bg-white/5 text-white/95 rounded-bl-none border border-white/[0.04]"
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-2xl rounded-bl-none px-4 py-3 border border-white/[0.04] flex gap-1 items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {lastMsgEscalate && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-b border-amber-500/20 flex flex-col items-center gap-2 text-center animate-fade-in">
          <p className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
            <ShieldAlert size={12} />
            {lang === "ar" ? "هل ترغب في التواصل مع فريق الدعم؟" : "Would you like to connect with support?"}
          </p>
          <Button size="sm" onClick={() => handleEscalation(lastUserMsg)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-8 text-xs flex items-center gap-1.5 px-4">
            <HeadphonesIcon size={12} />
            {lang === "ar" ? "تحويل إلى الدعم" : "Escalate to Support"}
          </Button>
        </div>
      )}

      {!isTyping && !lastMsgEscalate && (
        <div className="px-4 py-2 border-t border-white/[0.03] overflow-x-auto flex gap-2 scrollbar-hide shrink-0 bg-black/5">
          {quickQuestions.map((q, i) => (
            <button key={i} onClick={() => handleSend(q)} className="text-[11px] bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-full border border-white/[0.04] transition-all whitespace-nowrap">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-border/60 bg-black/40 flex items-center gap-2">
        <Input
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend(inputText)}
          placeholder={lang === "ar" ? "اكتب سؤالك هنا..." : "Type your question here..."}
          className="flex-1 text-right bg-black/20 text-xs h-9 border-border/50"
          disabled={isTyping}
        />
        <Button
          onClick={() => handleSend(inputText)}
          className="bg-primary hover:bg-primary/90 p-2 h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
          disabled={isTyping || !inputText.trim()}
        >
          <Send size={14} className={lang === "ar" ? "scale-x-[-1]" : ""} />
        </Button>
      </div>
    </motion.div>
  );
}
