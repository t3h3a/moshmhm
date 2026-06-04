import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ImagePlus, Send, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getGetTicketQueryKey, getListAllTicketsQueryKey, getListTicketsQueryKey, useGetTicket, useReplyTicket, customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getUser, isAdmin } from "@/lib/auth";

function parseMessage(message: string) {
  try {
    const parsed = JSON.parse(message);
    return {
      text: String(parsed.text ?? ""),
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments.filter((item: unknown): item is string => typeof item === "string") : [],
    };
  } catch {
    return { text: message, attachments: [] };
  }
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SupportDetailPage() {
  const [, params] = useRoute("/support/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id ?? "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const [reply, setReply] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useGetTicket(id, { query: { queryKey: getGetTicketQueryKey(id), enabled: !!id, refetchInterval: 4000 } });
  const replyMutation = useReplyTicket();

  const prevMessagesCount = useRef<number>(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  // Real-time browser notifications trigger
  useEffect(() => {
    if (ticket && ticket.messages) {
      const messages = ticket.messages;
      if (prevMessagesCount.current > 0 && messages.length > prevMessagesCount.current) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.senderId !== user?.id) {
          if ("Notification" in window && Notification.permission === "granted") {
            const bodyText = lastMsg.message.startsWith("{") ? JSON.parse(lastMsg.message).text : lastMsg.message;
            new Notification(`رد جديد على تذكرة #${ticket.id}`, {
              body: `${lastMsg.senderName}: ${bodyText}`,
              icon: "/favicon.ico"
            });
          }
        }
      }
      prevMessagesCount.current = messages.length;
    }
  }, [ticket?.messages, ticket?.id, user?.id]);

  async function handleStatusChange(newStatus: string) {
    setUpdatingStatus(true);
    try {
      await customFetch(`/api/support/tickets/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus })
      });
      queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAllTicketsQueryKey() });
      toast({
        title: "تم تحديث الحالة",
        description: `تم تغيير حالة التذكرة إلى: ${
          newStatus === "open" ? "مفتوحة" : newStatus === "waiting" ? "قيد الانتظار" : "مغلقة"
        }`
      });
    } catch {
      toast({ title: "خطأ", description: "فشل تغيير حالة التذكرة", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() && images.length === 0) return;
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      const attachments = await Promise.all(images.slice(0, 3).map(fileToDataUrl));
      await replyMutation.mutateAsync({ id, data: { message: JSON.stringify({ text: reply, attachments }) } as any });
      queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAllTicketsQueryKey() });
      setReply("");
      setImages([]);
    } catch {
      toast({ title: "خطأ", description: "فشل إرسال الرسالة", variant: "destructive" });
    }
  }

  if (isLoading) return <div className="p-6"><div className="h-60 rounded-xl animate-pulse bg-muted" /></div>;
  if (!ticket) return <div className="p-6 text-center text-muted-foreground">التذكرة غير موجودة</div>;

  const statusLabel =
    ticket.status === "open"
      ? "مفتوحة"
      : ticket.status === "waiting"
      ? "قيد الانتظار"
      : ticket.status === "answered"
      ? "تم الرد"
      : "مغلقة";

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between mb-6 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation(isAdmin() ? "/admin/support" : "/support")} className="text-muted-foreground hover:text-white" data-testid="button-back">
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">{ticket.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              تذكرة #{ticket.id} · <span className="font-semibold text-primary">{statusLabel}</span>
            </p>
          </div>
        </div>
        {isAdmin() && (
          <div className="flex items-center gap-1.5 bg-black/25 p-1 rounded-xl border border-border/40">
            <span className="text-[10px] text-muted-foreground px-2 font-bold select-none">الحالة:</span>
            <Button
              size="sm"
              variant={ticket.status === "open" ? "default" : "ghost"}
              onClick={() => handleStatusChange("open")}
              disabled={updatingStatus}
              className={`h-7 text-xs px-2.5 font-bold ${ticket.status === "open" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}
            >
              مفتوحة
            </Button>
            <Button
              size="sm"
              variant={ticket.status === "waiting" ? "secondary" : "ghost"}
              onClick={() => handleStatusChange("waiting")}
              disabled={updatingStatus}
              className={`h-7 text-xs px-2.5 font-bold ${
                ticket.status === "waiting" 
                  ? "bg-amber-500/25 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30" 
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              انتظار
            </Button>
            <Button
              size="sm"
              variant={ticket.status === "closed" ? "destructive" : "ghost"}
              onClick={() => handleStatusChange("closed")}
              disabled={updatingStatus}
              className={`h-7 text-xs px-2.5 font-bold ${ticket.status === "closed" ? "bg-destructive text-white" : "text-muted-foreground hover:text-destructive"}`}
            >
              إغلاق
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 rounded-xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        {ticket.messages?.map((msg, i) => {
          const content = parseMessage(msg.message);
          const isMe = msg.senderId === user?.id;
          return (
            <motion.div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl" style={{ background: isMe ? "hsl(142 70% 35%)" : (msg.isAdmin ? "hsl(210 55% 18%)" : "rgba(255,255,255,0.06)"), borderRadius: isMe ? "20px 20px 4px 20px" : "20px 20px 20px 4px" }}>
                {!isMe && <p className="text-xs font-bold mb-1 text-primary">{msg.senderName} {msg.isAdmin ? "· الدعم" : ""}</p>}
                {content.text && <p className="text-white text-sm whitespace-pre-wrap">{content.text}</p>}
                {content.attachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {content.attachments.map((src: string, index: number) => (
                      <div
                        key={index}
                        onClick={() => setActiveImage(src)}
                        className="group relative cursor-zoom-in overflow-hidden rounded-lg border border-white/10"
                      >
                        <img
                          src={src}
                          alt=""
                          className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                          <ZoomIn className="text-white w-5 h-5 scale-90 group-hover:scale-100 transition-transform duration-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs mt-1 opacity-60" style={{ color: isMe ? "rgba(255,255,255,0.8)" : "#9ca3af" }}>
                  {new Date(msg.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {ticket.status !== "closed" && (
        <form onSubmit={handleReply} className="flex gap-2">
          <label className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <ImagePlus size={18} />
            <Input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setImages(Array.from(e.target.files ?? []).slice(0, 3))} data-testid="input-reply-images" />
          </label>
          <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="اكتب ردك..." className="flex-1 text-right" data-testid="input-reply" />
          <Button type="submit" disabled={replyMutation.isPending || (!reply.trim() && images.length === 0)} className="bg-primary hover:bg-primary/90" data-testid="button-send-reply">
            <Send size={18} />
          </Button>
        </form>
      )}
      {images.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{images.map((file) => file.name).join("، ")}</p>}

      <AnimatePresence>
        {activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setActiveImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-xl bg-black/80 cursor-zoom-out"
          >
            {/* Floating Glassmorphic Close Button */}
            <button
              onClick={() => setActiveImage(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all duration-200 z-50 border border-white/10 shadow-xl backdrop-blur-md"
            >
              <X size={20} />
            </button>

            {/* Premium Animated Lightbox Container */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-[95vw] max-h-[85vh] md:max-w-[85vw] md:max-h-[80vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black/20"
            >
              <img
                src={activeImage}
                alt="معاينة الصورة"
                className="w-full h-full max-w-full max-h-[85vh] md:max-h-[80vh] object-contain rounded-2xl select-none"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
