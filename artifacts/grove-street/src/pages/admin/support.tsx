import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { HeadphonesIcon, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getListAllTicketsQueryKey, getListTicketsQueryKey, useCloseTicket, useListAllTickets } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { isAdmin } from "@/lib/auth";

export default function AdminSupportPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tickets = [], isLoading } = useListAllTickets({ query: { queryKey: getListAllTicketsQueryKey(), refetchInterval: 5000 } });
  const closeMutation = useCloseTicket();

  async function handleClose(id: number) {
    try {
      await closeMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListAllTicketsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
      toast({ title: "تم الإغلاق", description: "تم إغلاق المحادثة وإخفاؤها من المستخدم" });
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    }
  }

  const openTickets = tickets.filter((ticket) => ticket.status !== "closed");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <HeadphonesIcon size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">تذاكر الدعم</h1>
        <span className="text-muted-foreground">({openTickets.length} مفتوح)</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse bg-muted" />)}</div>
      ) : openTickets.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><MessageSquare size={48} className="mx-auto mb-4" /><p>لا توجد تذاكر مفتوحة</p></div>
      ) : (
        <div className="space-y-3">
          {openTickets.map((ticket, i) => (
            <motion.div key={ticket.id} className="rounded-xl p-5 flex items-center justify-between gap-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(142 70% 35% / 0.3)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} data-testid={`card-ticket-${ticket.id}`}>
              <div>
                <p className="text-white font-bold">{ticket.title}</p>
                <p className="text-muted-foreground text-sm">{ticket.userName || `مستخدم #${ticket.userId}`} · #{ticket.id} · {new Date(ticket.createdAt).toLocaleDateString("ar-SA")}</p>
                <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: "hsl(142 70% 35% / 0.2)", color: "hsl(142 70% 35%)" }}>مفتوح</span>
              </div>
              <div className="flex gap-2">
                <Link href={`/support/${ticket.id}`}>
                  <Button size="sm" variant="outline" data-testid={`button-view-ticket-${ticket.id}`}>رد</Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => handleClose(ticket.id)} className="text-muted-foreground" data-testid={`button-close-ticket-${ticket.id}`}>إغلاق</Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
