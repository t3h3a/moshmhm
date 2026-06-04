import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ImagePlus, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCreateTicket, useListTickets, getListAllTicketsQueryKey, getListTicketsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getUser } from "@/lib/auth";

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SupportPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = getUser();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [notifyConsent, setNotifyConsent] = useState(false);

  const { data: tickets = [], isLoading } = useListTickets();
  const createMutation = useCreateTicket();

  if (!user) { setLocation("/login"); return null; }

  async function handleNotifyConsentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    setNotifyConsent(checked);
    if (checked && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast({
            title: "تنبيه الإشعارات",
            description: "يرجى تفعيل الإشعارات من إعدادات متصفحك لتلقي تنبيهات الردود فوراً.",
            variant: "destructive"
          });
        }
      } catch (err) {}
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء العنوان والرسالة", variant: "destructive" });
      return;
    }
    if (!notifyConsent) {
      toast({
        title: "تفعيل الإشعارات مطلوب",
        description: "يرجى الموافقة على تفعيل الإشعارات أولاً لتنبيهك فور صدور أي رد في حال حدوث أي تأخير.",
        variant: "destructive"
      });
      return;
    }
    try {
      const attachments = await Promise.all(images.slice(0, 3).map(fileToDataUrl));
      const ticket = await createMutation.mutateAsync({ data: { title, message: JSON.stringify({ text: message, attachments }) } as any });
      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAllTicketsQueryKey() });
      toast({ title: "تم الإرسال", description: "تم فتح التذكرة وستبقى المحادثة مفتوحة حتى يغلقها الدعم" });
      setTitle("");
      setMessage("");
      setImages([]);
      setNotifyConsent(false);
      setShowNew(false);
      setLocation(`/support/${ticket.id}`);
    } catch {
      toast({ title: "خطأ", description: "فشل إرسال التذكرة", variant: "destructive" });
    }
  }

  const openTickets = tickets.filter((ticket) => ticket.status !== "closed");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MessageSquare size={28} className="text-primary" />
          <h1 className="text-3xl font-black text-white">الدعم الفني</h1>
        </div>
        <Button onClick={() => setShowNew(!showNew)} className="bg-primary hover:bg-primary/90 font-bold" data-testid="button-new-ticket">
          <Plus size={18} className="ml-2" />
          تذكرة جديدة
        </Button>
      </div>

      {showNew && (
        <motion.div className="rounded-2xl p-6 mb-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-lg font-bold text-white mb-4">تذكرة دعم جديدة</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-white mb-1.5 block">العنوان</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="موضوع المشكلة" className="text-right" data-testid="input-ticket-title" />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">الرسالة</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اشرح مشكلتك بالتفصيل..." className="text-right min-h-28" data-testid="input-ticket-message" />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">صور اختيارية</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-primary/5 px-4 py-4 text-white hover:bg-primary/10">
                <ImagePlus size={18} className="text-primary" />
                أرفق صور للمشكلة
                <Input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setImages(Array.from(e.target.files ?? []).slice(0, 3))} data-testid="input-ticket-images" />
              </label>
              {images.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{images.map((file) => file.name).join("، ")}</p>}
            </div>
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-primary/5 border border-primary/15">
              <input
                type="checkbox"
                id="notify-consent"
                checked={notifyConsent}
                onChange={handleNotifyConsentChange}
                className="mt-1 accent-primary cursor-pointer w-4 h-4 rounded border-gray-300 flex-shrink-0"
              />
              <label htmlFor="notify-consent" className="text-xs text-white/95 cursor-pointer select-none leading-relaxed text-right">
                أوافق على تفعيل إشعارات المتصفح لتنبيهي فوراً وتلقائياً عند قيام الإدارة أو المساعد الذكي بالرد على تذكرتي في حال حدوث أي تأخير.
              </label>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending} data-testid="button-submit-ticket">
                {createMutation.isPending ? "جار الإرسال..." : "إرسال"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowNew(false)} data-testid="button-cancel-ticket">إلغاء</Button>
            </div>
          </form>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse bg-muted" />)}</div>
      ) : openTickets.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-white text-lg font-bold mb-2">لا توجد محادثات مفتوحة</p>
          <p className="text-muted-foreground">افتح تذكرة جديدة وسنرد عليك من لوحة الدعم</p>
        </div>
      ) : (
        <div className="space-y-3">
          {openTickets.map((ticket, i) => (
            <Link key={ticket.id} href={`/support/${ticket.id}`}>
              <motion.div className="rounded-xl p-5 cursor-pointer" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} whileHover={{ borderColor: "hsl(142 70% 35% / 0.4)" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} data-testid={`card-ticket-${ticket.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="text-primary flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">#{ticket.id} · {new Date(ticket.createdAt).toLocaleDateString("ar-SA")}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "hsl(142 70% 35% / 0.2)", color: "hsl(142 70% 35%)" }}>
                    مفتوح
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
