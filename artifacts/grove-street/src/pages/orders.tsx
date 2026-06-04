import { Link } from "wouter";
import { motion } from "framer-motion";
import { ClipboardList } from "lucide-react";
import { useListOrders } from "@workspace/api-client-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "#fbbf24" },
  pending_review: { label: "قيد المراجعة", color: "#fbbf24" },
  awaiting_execution: { label: "بانتظار التنفيذ", color: "#f59e0b" },
  processing: { label: "قيد التنفيذ", color: "#60a5fa" },
  completed: { label: "تم التنفيذ", color: "#22c55e" },
  cancelled: { label: "ملغي", color: "#6b7280" },
  rejected: { label: "مرفوض", color: "#ef4444" },
  refunded: { label: "مسترد", color: "#a78bfa" },
};

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useListOrders();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ClipboardList size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">طلباتي</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse bg-muted" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-white text-lg font-bold mb-2">لا توجد طلبات بعد</p>
          <p className="text-muted-foreground mb-6">ابدأ بتصفح الخدمات وإجراء أول طلب</p>
          <Link href="/games">
            <button className="px-6 py-2 rounded-lg bg-primary text-white font-bold" data-testid="button-go-shop">
              تصفح الخدمات
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => {
            const status = STATUS_MAP[order.status] ?? { label: order.status, color: "#9ca3af" };
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <motion.div
                  className="rounded-xl p-5 cursor-pointer"
                  style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  whileHover={{ borderColor: "hsl(142 70% 35% / 0.4)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  data-testid={`card-order-${order.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">{order.productNameAr || order.productName}</p>
                      <p className="text-muted-foreground text-sm mt-1">
                        رقم الطلب: #{order.id} · {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-black text-lg">{order.price} د.أ</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${status.color}22`, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

