import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Send } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getLanguage } from "@/lib/language";

type Suggestion = {
  id: number;
  type: string;
  priority: string;
  title: string;
  message: string;
  status: string;
  adminReply?: string;
  createdAt: string;
};

const text = {
  ar: {
    title: "الاقتراحات والشكاوي",
    subtitle: "أرسل اقتراحا، شكوى، مشكلة، أو طلب إضافة خدمة جديدة.",
    type: "النوع",
    priority: "الأهمية",
    subject: "العنوان",
    message: "الرسالة",
    send: "إرسال",
    sending: "جار الإرسال...",
    history: "رسائلي السابقة",
    empty: "لا توجد رسائل بعد.",
    success: "تم الإرسال",
    successDesc: "وصلت رسالتك للإدارة.",
    error: "خطأ",
    required: "العنوان والرسالة مطلوبان.",
    reply: "رد الإدارة",
  },
  en: {
    title: "Suggestions and Complaints",
    subtitle: "Send a suggestion, complaint, issue, or request for a new service.",
    type: "Type",
    priority: "Priority",
    subject: "Title",
    message: "Message",
    send: "Send",
    sending: "Sending...",
    history: "My previous messages",
    empty: "No messages yet.",
    success: "Sent",
    successDesc: "Your message reached the admin team.",
    error: "Error",
    required: "Title and message are required.",
    reply: "Admin reply",
  },
};

export default function SuggestionsPage() {
  const lang = getLanguage() === "en" ? "en" : "ar";
  const t = text[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ type: "suggestion", priority: "medium", title: "", message: "" });
  const [isSending, setIsSending] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["my-suggestions"],
    queryFn: async () => customFetch<Suggestion[]>("/api/suggestions"),
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: t.error, description: t.required, variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await customFetch("/api/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm({ type: "suggestion", priority: "medium", title: "", message: "" });
      await queryClient.invalidateQueries({ queryKey: ["my-suggestions"] });
      toast({ title: t.success, description: t.successDesc });
    } catch (error: any) {
      toast({ title: t.error, description: error?.response?.data?.error ?? t.error, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">{t.title}</h1>
          <p className="text-white/55 mt-2">{t.subtitle}</p>
        </div>
        <Lightbulb className="text-primary" size={34} />
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-primary/20 bg-card/80 p-5 md:p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>{t.type}</Label>
            <Select value={form.type} onValueChange={(type) => setForm((prev) => ({ ...prev, type }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="suggestion">{lang === "en" ? "Suggestion" : "اقتراح"}</SelectItem>
                <SelectItem value="complaint">{lang === "en" ? "Complaint" : "شكوى"}</SelectItem>
                <SelectItem value="issue">{lang === "en" ? "Issue" : "مشكلة"}</SelectItem>
                <SelectItem value="game_request">{lang === "en" ? "Add game" : "طلب إضافة لعبة"}</SelectItem>
                <SelectItem value="card_request">{lang === "en" ? "Add card" : "طلب إضافة بطاقة"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t.priority}</Label>
            <Select value={form.priority} onValueChange={(priority) => setForm((prev) => ({ ...prev, priority }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{lang === "en" ? "Low" : "منخفض"}</SelectItem>
                <SelectItem value="medium">{lang === "en" ? "Medium" : "متوسط"}</SelectItem>
                <SelectItem value="high">{lang === "en" ? "High" : "عالي"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>{t.subject}</Label>
          <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
        </div>
        <div>
          <Label>{t.message}</Label>
          <Textarea value={form.message} onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))} className="min-h-36" />
        </div>
        <Button className="w-full md:w-auto" type="submit" disabled={isSending}>
          <Send size={16} className="mx-2" />
          {isSending ? t.sending : t.send}
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-2xl font-black text-white">{t.history}</h2>
        {data.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-white/60">{t.empty}</div>
        ) : (
          data.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-white">{item.title}</h3>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">{item.status}</span>
              </div>
              <p className="text-white/65 mt-2 whitespace-pre-wrap">{item.message}</p>
              {item.adminReply && <p className="mt-3 rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-white/75"><strong className="text-primary">{t.reply}:</strong> {item.adminReply}</p>}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
