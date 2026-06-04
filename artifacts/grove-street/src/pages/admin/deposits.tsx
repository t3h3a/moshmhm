import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, CheckCircle, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useListAllDeposits,
  useApproveDeposit,
  useRejectDeposit,
  getGetAdminStatsQueryKey,
  getGetWalletQueryKey,
  getListAllDepositsQueryKey,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/auth";
import ImagePreviewModal from "@/components/ImagePreviewModal";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "#fbbf24" },
  approved: { label: "مقبول", color: "#22c55e" },
  rejected: { label: "مرفوض", color: "#ef4444" },
};

const METHOD_LABELS: Record<string, string> = {
  orange_money: "Orange Money", bank_transfer: "تحويل بنكي", paypal: "باي بال", stc: "رصيد STC", kari: "كريم باي"
};

function parseReceiptImages(receiptUrl?: string) {
  if (!receiptUrl) return [];
  try {
    const parsed = JSON.parse(receiptUrl);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return receiptUrl.startsWith("data:image") || receiptUrl.startsWith("blob:") || receiptUrl.startsWith("http") ? [receiptUrl] : [];
  }
}

export default function AdminDepositsPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: deposits = [], isLoading } = useListAllDeposits();
  
  const approveMutation = useApproveDeposit();
  const rejectMutation = useRejectDeposit();

  // Image Preview Modal states
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function openPreview(images: string[], index: number) {
    setModalImages(images);
    setModalIndex(index);
    setIsModalOpen(true);
  }

  async function handleApprove(id: number) {
    try {
      await approveMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListAllDepositsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      toast({ title: "تم القبول", description: "تم إضافة الرصيد للمستخدم بنجاح" });
    } catch { toast({ title: "خطأ", description: "فشل قبول عملية الإيداع", variant: "destructive" }); }
  }

  async function handleReject(id: number) {
    try {
      await rejectMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListAllDepositsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      toast({ title: "تم الرفض", description: "تم رفض عملية الإيداع بنجاح" });
    } catch { toast({ title: "خطأ", description: "فشل رفض عملية الإيداع", variant: "destructive" }); }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <Wallet size={28} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">إدارة إيداعات المحفظة</h1>
          <p className="text-muted-foreground text-sm">مراجعة إثباتات شحن المحفظة، تدقيق إيصالات التحويل وإضافة الرصيد للأعضاء</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-muted/40" />)}</div>
      ) : (
        <div className="space-y-3">
          {deposits.map((d: any, i) => {
            const status = STATUS_MAP[d.status] ?? { label: d.status, color: "#9ca3af" };
            const receiptImages = parseReceiptImages(d.receiptUrl);
            
            return (
              <motion.div
                key={d.id}
                className="rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-right"
                style={{ background: "hsl(var(--card))", border: `1px solid ${d.status === "pending" ? "#fbbf2444" : "hsl(var(--border))"}` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                data-testid={`row-deposit-${d.id}`}
              >
                <div className="space-y-2 flex-1">
                  <p className="text-white font-bold text-base leading-none">{d.userName || `مستخدم #${d.userId}`}</p>
                  <p className="text-muted-foreground text-xs">{METHOD_LABELS[d.method] ?? d.method} · {new Date(d.createdAt).toLocaleString("ar-SA")}</p>
                  {d.notes && <p className="text-xs text-white/70 bg-black/20 p-2 rounded-lg max-w-lg mt-1">{d.notes}</p>}
                  
                  {receiptImages.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {receiptImages.map((src, index) => (
                        <div
                          key={index}
                          onClick={() => openPreview(receiptImages, index)}
                          className="cursor-pointer overflow-hidden rounded-lg border border-primary/25 hover:border-primary bg-black/30 h-16 w-16 relative group flex items-center justify-center"
                        >
                          <img src={src} alt={`إثبات تحويل ${index + 1}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye size={16} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black text-white leading-none">{d.amount} د.أ</p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block" style={{ background: `${status.color}22`, color: status.color }}>
                      {status.label}
                    </span>
                  </div>

                  {d.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(d.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-xs font-bold text-white px-3"
                        data-testid={`button-approve-${d.id}`}
                      >
                        قبول
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(d.id)}
                        disabled={rejectMutation.isPending}
                        className="text-xs font-bold px-3"
                        data-testid={`button-reject-${d.id}`}
                      >
                        رفض
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          {deposits.length === 0 && <p className="text-center text-muted-foreground py-12">لا توجد إيداعات</p>}
        </div>
      )}

      {/* Image Preview Modal Component */}
      <ImagePreviewModal
        images={modalImages}
        initialIndex={modalIndex}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
