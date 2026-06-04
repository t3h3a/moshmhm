import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CheckCircle, XCircle, FileText, Calendar, MessageSquare, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useListAllVerifications, useApproveVerification, useRejectVerification, getListAllVerificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getToken, isAdmin } from "@/lib/auth";
import ImagePreviewModal from "@/components/ImagePreviewModal";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق قيد المراجعة", color: "#fbbf24" },
  approved: { label: "مقبول وموثق", color: "#22c55e" },
  rejected: { label: "مرفوض", color: "#ef4444" },
};

const DOC_TYPES: Record<string, string> = {
  national_id: "هوية شخصية (National ID)",
  passport: "جواز سفر (Passport)",
  other: "وثيقة رسمية أخرى",
};

function cleanImageSrc(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default function AdminVerificationPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: verifications = [], isLoading } = useListAllVerifications();
  
  const approveMutation = useApproveVerification();
  const rejectMutation = useRejectVerification();

  // Image Modal state
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Rejection logic state
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function openPreview(images: string[], index: number) {
    setModalImages(images);
    setModalIndex(index);
    setIsModalOpen(true);
  }

  async function handleApprove(id: number) {
    try {
      await approveMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListAllVerificationsQueryKey() });
      toast({ title: "تم قبول التوثيق بنجاح", description: "تم تحديث حالة المستخدم إلى موثق" });
    } catch { 
      toast({ title: "خطأ", description: "فشل إتمام التوثيق", variant: "destructive" }); 
    }
  }

  async function handleRejectConfirm() {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      toast({ title: "بيانات ناقصة", description: "يرجى كتابة سبب الرفض الموجه للمستخدم", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/verification/${rejectId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ adminNotes: rejectReason }),
      });
      if (!response.ok) throw new Error("Failed to reject verification");
      queryClient.invalidateQueries({ queryKey: getListAllVerificationsQueryKey() });
      setRejectId(null);
      setRejectReason("");
      toast({ title: "تم رفض طلب التوثيق", description: "تم إرسال سبب الرفض للمستخدم بنجاح" });
    } catch { 
      toast({ title: "خطأ", description: "فشل رفض طلب التوثيق", variant: "destructive" }); 
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <ShieldCheck size={28} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">إدارة طلبات التوثيق</h1>
          <p className="text-muted-foreground text-sm">مراجعة وثائق الهوية، التحقق من سيلفي التطابق وقبول أو رفض طلبات الأعضاء</p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 rounded-xl animate-pulse bg-muted/40" />)}</div>
      ) : verifications.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-white/5 rounded-2xl">
          <p className="text-sm">لا توجد طلبات توثيق مقدمة حالياً.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {verifications.map((v: any, i) => {
            const status = STATUS_LABELS[v.status] ?? { label: v.status, color: "#9ca3af" };
            const frontImage = cleanImageSrc(v.idImageUrl);
            const backImage = cleanImageSrc(v.backImageUrl);
            const selfieImage = cleanImageSrc(v.selfieUrl);
            const docImages = [frontImage, backImage, selfieImage].filter(Boolean);
            
            return (
              <motion.div
                key={v.id}
                className="rounded-xl p-5 space-y-4 text-right flex flex-col justify-between"
                style={{ background: "hsl(var(--card))", border: `1px solid ${v.status === "pending" ? "#fbbf2444" : "hsl(var(--border))"}` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                data-testid={`card-verification-${v.id}`}
              >
                {/* Meta details */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-3">
                  <div className="space-y-1">
                    <h3 className="text-white font-bold text-base leading-none">{v.fullName || v.userName}</h3>
                    <p className="text-xs text-muted-foreground">رقم الجوال: <span className="font-mono">{v.phone}</span> · رقم العضو: #{v.userId}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 md:self-center">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: `${status.color}22`, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Substantive Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-black/10 flex items-start gap-2">
                    <FileText size={16} className="text-primary mt-0.5" />
                    <div>
                      <span className="text-muted-foreground block mb-0.5">نوع الوثيقة المقدمة:</span>
                      <strong className="text-white">{DOC_TYPES[v.documentType] || v.documentType || "هوية شخصية"}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-black/10 flex items-start gap-2">
                    <Calendar size={16} className="text-primary mt-0.5" />
                    <div>
                      <span className="text-muted-foreground block mb-0.5">تاريخ التقديم:</span>
                      <strong className="text-white">{new Date(v.createdAt).toLocaleString("ar-SA")}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-black/10 flex items-start gap-2 col-span-1 md:col-span-1">
                    <MessageSquare size={16} className="text-primary mt-0.5" />
                    <div>
                      <span className="text-muted-foreground block mb-0.5">ملاحظات العضو:</span>
                      <strong className="text-white break-all">{v.userNotes || "لا توجد ملاحظات"}</strong>
                    </div>
                  </div>
                </div>

                {/* Interactive Thumbnails */}
                {docImages.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">مستندات الهوية (اضغط للتكبير والتصفح بالكامل):</p>
                    <div className="flex flex-wrap gap-3">
                      {frontImage && (
                        <div 
                          onClick={() => openPreview(docImages, 0)}
                          className="cursor-pointer overflow-hidden rounded-xl border border-white/10 hover:border-primary/50 bg-black/30 h-20 w-28 relative group flex items-center justify-center"
                        >
                          <img src={frontImage} alt="الهوية من الأمام" className="h-full w-full object-contain bg-black/40 group-hover:scale-105 transition-transform" loading="lazy" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold text-xs gap-1">
                            <Eye size={12} /> معاينة الأمام
                          </div>
                        </div>
                      )}

                      {backImage && (
                        <div 
                          onClick={() => openPreview(docImages, frontImage ? 1 : 0)}
                          className="cursor-pointer overflow-hidden rounded-xl border border-white/10 hover:border-primary/50 bg-black/30 h-20 w-28 relative group flex items-center justify-center"
                        >
                          <img src={backImage} alt="الهوية من الخلف" className="h-full w-full object-contain bg-black/40 group-hover:scale-105 transition-transform" loading="lazy" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold text-xs gap-1">
                            <Eye size={12} /> معاينة الخلف
                          </div>
                        </div>
                      )}

                      {selfieImage && (
                        <div 
                          onClick={() => openPreview(docImages, docImages.length - 1)}
                          className="cursor-pointer overflow-hidden rounded-xl border border-white/10 hover:border-primary/50 bg-black/30 h-20 w-28 relative group flex items-center justify-center"
                        >
                          <img src={selfieImage} alt="سيلفي المطابقة" className="h-full w-full object-contain bg-black/40 group-hover:scale-105 transition-transform" loading="lazy" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold text-xs gap-1">
                            <Eye size={12} /> صورة السيلفي
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reject Cause Note (if rejected) */}
                {v.status === "rejected" && v.adminNotes && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-1.5">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p><strong>سبب الرفض الإداري:</strong> {v.adminNotes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {v.status === "pending" && (
                  <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(v.id)}
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-xs font-bold text-white px-4"
                      data-testid={`button-approve-${v.id}`}
                    >
                      <CheckCircle size={14} className="ml-1.5" /> قبول وتوثيق العضو
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectId(v.id)}
                      disabled={rejectMutation.isPending}
                      className="text-xs font-bold px-4"
                      data-testid={`button-reject-${v.id}`}
                    >
                      <XCircle size={14} className="ml-1.5" /> رفض الطلب
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reject Dialog overlay */}
      <AnimatePresence>
        {rejectId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              className="w-full max-w-md rounded-2xl p-6 text-right space-y-4"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center gap-2 justify-end text-red-400 font-bold border-b border-white/5 pb-2">
                <span>رفض طلب التحقق من الهوية</span>
                <XCircle size={18} />
              </div>

              <div className="space-y-1.5">
                <label className="text-white text-xs block">اكتب سبب الرفض بوضوح (سيظهر للمستخدم في حسابه): *</label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: صورة السيلفي غير واضحة، يرجى إعادة التقاطها"
                  className="text-right text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="destructive" onClick={handleRejectConfirm} className="text-xs font-bold">
                  تأكيد الرفض
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectReason(""); }} className="text-xs">
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
