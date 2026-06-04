import { motion } from "framer-motion";
import { LayoutDashboard, Users, ShoppingCart, Wallet, Package, Clock } from "lucide-react";
import { useGetAdminStats } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/auth";

const MOCK_STATS = { totalUsers: 5, totalOrders: 12, totalRevenue: 486, pendingDeposits: 2, pendingVerifications: 1, openTickets: 3, totalProducts: 14, recentOrders: [] };

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { data: stats } = useGetAdminStats();
  const s = {
    ...MOCK_STATS,
    ...(stats ?? {}),
    totalRevenue: (stats as any)?.totalRevenue ?? (stats as any)?.revenue ?? MOCK_STATS.totalRevenue,
    recentOrders: Array.isArray((stats as any)?.recentOrders) ? (stats as any).recentOrders : [],
  };

  const cards = [
    { label: "إجمالي المستخدمين", value: s.totalUsers, icon: Users, color: "#60a5fa" },
    { label: "إجمالي الطلبات", value: s.totalOrders, icon: ShoppingCart, color: "#22c55e" },
    { label: "إجمالي الإيرادات", value: `${s.totalRevenue} د.أ`, icon: Wallet, color: "#fbbf24" },
    { label: "إيداعات معلقة", value: s.pendingDeposits, icon: Clock, color: "#f97316" },
    { label: "المنتجات", value: s.totalProducts, icon: Package, color: "#a78bfa" },
    { label: "تذاكر مفتوحة", value: s.openTickets, icon: LayoutDashboard, color: "#ef4444" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">لوحة التحكم</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              className="rounded-xl p-5"
              style={{ background: "hsl(var(--card))", border: `1px solid ${card.color}33` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              data-testid={`stat-card-${i}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg" style={{ background: `${card.color}22` }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <span className="text-muted-foreground text-sm">{card.label}</span>
              </div>
              <p className="text-2xl font-black" style={{ color: card.color }}>{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      {s.recentOrders.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <h2 className="text-lg font-bold text-white mb-4">آخر الطلبات</h2>
          <div className="space-y-2">
            {s.recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                <div>
                  <p className="text-white text-sm font-medium">{o.productNameAr || o.productName}</p>
                  <p className="text-xs text-muted-foreground">#{o.id}</p>
                </div>
                <span className="text-primary font-bold">{o.price} د.أ</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

