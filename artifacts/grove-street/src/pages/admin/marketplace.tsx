import { motion } from "framer-motion";
import { StoreIcon, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGetAllListings, useApproveListing, useRejectListing, getGetAllListingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/auth";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "#fbbf24" },
  approved: { label: "مقبول", color: "#22c55e" },
  rejected: { label: "مرفوض", color: "#ef4444" },
  sold: { label: "مباع", color: "#9ca3af" },
};

export default function AdminMarketplacePage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: listings = [], isLoading } = useGetAllListings();
  const approveMutation = useApproveListing();
  const rejectMutation = useRejectListing();

  async function handleApprove(id: number) {
    try {
      await approveMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetAllListingsQueryKey() });
      toast({ title: "تم القبول" });
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  }

  async function handleReject(id: number) {
    try {
      await rejectMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetAllListingsQueryKey() });
      toast({ title: "تم الرفض" });
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <StoreIcon size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">إعلانات السوق</h1>
        <span className="text-muted-foreground">({listings.filter(l => l.status === "pending").length} معلق)</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-muted" />)}</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><p>لا توجد إعلانات</p></div>
      ) : (
        <div className="space-y-4">
          {listings.map((l, i) => {
            const status = STATUS_MAP[l.status] ?? { label: l.status, color: "#9ca3af" };
            return (
              <motion.div key={l.id} className="rounded-xl p-5 flex items-start justify-between" style={{ background: "hsl(var(--card))", border: `1px solid ${l.status === "pending" ? "#fbbf2444" : "hsl(var(--border))"}` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} data-testid={`card-listing-${l.id}`}>
                <div>
                  <p className="text-white font-bold">{l.title}</p>
                  <p className="text-muted-foreground text-sm">{l.gameNameAr} · {l.sellerName} · {l.price} د.أ</p>
                  {l.description && <p className="text-white/60 text-sm mt-1">{l.description}</p>}
                  <span className="text-xs px-2 py-0.5 rounded-full mt-2 inline-block" style={{ background: `${status.color}22`, color: status.color }}>
                    {status.label}
                  </span>
                </div>
                {l.status === "pending" && (
                  <div className="flex gap-2 mr-4">
                    <Button size="sm" onClick={() => handleApprove(l.id)} disabled={approveMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white" data-testid={`button-approve-${l.id}`}>
                      <CheckCircle size={14} className="ml-1" />قبول
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(l.id)} disabled={rejectMutation.isPending} data-testid={`button-reject-${l.id}`}>
                      <XCircle size={14} className="ml-1" />رفض
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

