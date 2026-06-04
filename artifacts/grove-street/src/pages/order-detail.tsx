import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "قيد الانتظار", color: "#fbbf24", icon: Clock },
  pending_review: { label: "قيد المراجعة", color: "#fbbf24", icon: Clock },
  awaiting_execution: { label: "بانتظار التنفيذ", color: "#f59e0b", icon: Clock },
  processing: { label: "قيد التنفيذ", color: "#60a5fa", icon: Clock },
  completed: { label: "تم التنفيذ", color: "#22c55e", icon: CheckCircle },
  cancelled: { label: "ملغي", color: "#6b7280", icon: XCircle },
  rejected: { label: "مرفوض", color: "#ef4444", icon: XCircle },
  refunded: { label: "مسترد", color: "#a78bfa", icon: XCircle },
};

export default function OrderDetailPage() {
  const [, params] = useRoute("/orders/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id ?? "0");

  const { data: order, isLoading } = useGetOrder(id, { query: { queryKey: getGetOrderQueryKey(id), enabled: !!id } });

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-muted" />
          <div className="h-40 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!order) {
    return <div className="p-6 text-center text-muted-foreground">الطلب غير موجود</div>;
  }

  const status = STATUS_MAP[order.status] ?? { label: order.status, color: "#9ca3af", icon: Clock };
  const StatusIcon = status.icon;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => setLocation("/orders")} className="flex items-center gap-2 text-muted-foreground hover:text-white mb-6 transition-colors" data-testid="button-back">
        <ArrowRight size={18} />
        <span>الطلبات</span>
      </button>

      <motion.div className="space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Status header */}
        <div className="rounded-2xl p-6 text-center"
          style={{ background: `${status.color}11`, border: `1px solid ${status.color}33` }}>
          <StatusIcon size={40} className="mx-auto mb-3" style={{ color: status.color }} />
          <h2 className="text-xl font-black" style={{ color: status.color }}>{status.label}</h2>
        </div>

        {/* Order details */}
        <div className="rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <h1 className="text-xl font-black text-white mb-4">تفاصيل الطلب #{order.id}</h1>
          <div className="space-y-3">
            {[
              { label: "المنتج", value: order.productNameAr || order.productName },
              { label: "المبلغ", value: `${order.price} د.أ` },
              { label: "النقاط المكتسبة", value: `+${order.pointsEarned} نقطة` },
              { label: "التاريخ", value: new Date(order.createdAt).toLocaleString("ar-SA") },
              ...(order.userInputData ? [{ 
                label: "بيانات الشحن", 
                value: (() => { 
                  try { 
                    const d = JSON.parse(order.userInputData); 
                    const cleaned = Object.entries(d).map(([k, v]) => {
                      const lowerKey = k.toLowerCase();
                      if (lowerKey.includes("password") || lowerKey.includes("pass") || lowerKey.includes("كلمة") || lowerKey.includes("سر")) {
                        return `${k}: ********`;
                      }
                      return `${k}: ${v}`;
                    });
                    return cleaned.join(" · "); 
                  } catch { 
                    return order.userInputData; 
                  } 
                })() 
              }] : []),
              ...(order.notes ? [{ label: "ملاحظات", value: order.notes }] : []),
            ].map(row => (
              <div key={row.label} className="flex justify-between items-start py-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-white font-medium text-right max-w-xs">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reassurance/Security Warning */}
        {order.userInputData && (order.userInputData.toLowerCase().includes("pass") || order.userInputData.toLowerCase().includes("password") || order.userInputData.includes("كلمة")) && (
          <div className="rounded-xl p-4 text-xs leading-relaxed text-right mt-3 animate-fade-in" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="font-bold text-red-400 mb-1">🛡️ حماية أمان الحساب</p>
            <p className="text-white/75">تم إخفاء كلمة المرور الخاصة بك تلقائياً لحمايتك. نوصي بتغيير كلمة المرور الخاصة بك إلى كلمة مرور جديدة فور اكتمال الخدمة.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

