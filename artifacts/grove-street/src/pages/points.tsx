import { motion } from "framer-motion";
import { Star, Gift, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGetPoints, useListPointsHistory, useListRewards, useRedeemReward, getGetPointsQueryKey, getGetWalletQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { playSfx } from "@/lib/audio";

const RANK_COLORS: Record<string, string> = { Bronze: "#cd7f32", Silver: "#9ca3af", Gold: "#fbbf24", Platinum: "#22d3ee", Diamond: "#60a5fa", Niga: "#22c55e", Nega: "#22c55e" };
const RANK_ICONS: Record<string, string> = { Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "💠", Niga: "N", Nega: "N" };

const MOCK_POINTS = { points: 1800, rank: "Gold", rankAr: "ذهبي", nextRank: "Platinum", nextRankAr: "بلاتيني", progressPercent: 13, pointsToNext: 2200 };
const MOCK_REWARDS = [
  { id: 1, nameAr: "رصيد محفظة 1 د.أ", pointsCost: 3500 },
  { id: 2, nameAr: "رصيد محفظة 3 د.أ", pointsCost: 9500 },
  { id: 3, nameAr: "رصيد محفظة 5 د.أ", pointsCost: 15000 },
];

export default function PointsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pointsData } = useGetPoints();
  const { data: history = [] } = useListPointsHistory();
  const { data: rewards = [] } = useListRewards();
  const redeemMutation = useRedeemReward();

  const pts = pointsData ?? MOCK_POINTS;
  const rewardsList = rewards.length > 0 ? rewards : MOCK_REWARDS;
  const rankColor = RANK_COLORS[pts.rank] ?? "#9ca3af";
  const rankIcon = RANK_ICONS[pts.rank] ?? "🥉";

  async function handleRedeem(rewardId: number, rewardName: string, cost: number) {
    if (pts.points < cost) {
      playSfx("not_enough_balance");
      toast({ title: "نقاط غير كافية", description: `تحتاج ${cost - pts.points} نقطة إضافية`, variant: "destructive" });
      return;
    }
    try {
      await redeemMutation.mutateAsync({ id: rewardId });
      queryClient.invalidateQueries({ queryKey: getGetPointsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      playSfx("reward_redeemed");
      toast({ title: "تم الاستبدال!", description: `تم استبدال "${rewardName}" بنجاح` });
    } catch {
      toast({ title: "خطأ", description: "فشل استبدال المكافأة", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Star size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">النقاط والمكافآت</h1>
      </div>

      {/* Points Card */}
      <motion.div
        className="rounded-2xl p-8 mb-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${rankColor}22, hsl(0 0% 7%))`, border: `1px solid ${rankColor}44` }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-muted-foreground mb-1">نقاطي الحالية</p>
            <p className="text-5xl font-black text-white">{pts.points.toLocaleString()}</p>
            <p className="text-primary mt-1">نقطة</p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-2">{rankIcon}</div>
            <p className="font-black text-lg" style={{ color: rankColor }}>{pts.rankAr}</p>
          </div>
        </div>

        {pts.nextRank && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{pts.pointsToNext} نقطة للرتبة التالية</span>
              <span style={{ color: rankColor }}>{pts.nextRankAr}</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: rankColor }}
                initial={{ width: 0 }}
                animate={{ width: `${pts.progressPercent}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-left">{pts.progressPercent}%</p>
          </div>
        )}
      </motion.div>

      {/* Rewards */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          <Gift size={22} className="text-primary" />
          <h2 className="text-xl font-black text-white">المكافآت المتاحة</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewardsList.map((reward, i) => {
            const canRedeem = pts.points >= reward.pointsCost;
            return (
              <motion.div
                key={reward.id}
                className="rounded-xl p-5"
                style={{ background: "hsl(var(--card))", border: `1px solid ${canRedeem ? "hsl(142 70% 35% / 0.3)" : "hsl(var(--border))"}` }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-testid={`card-reward-${reward.id}`}
              >
                <div className="text-3xl mb-3">🎁</div>
                <h3 className="text-white font-bold mb-2 leading-tight">{reward.nameAr}</h3>
                <p className="text-primary font-bold mb-4">{reward.pointsCost.toLocaleString()} نقطة</p>
                <Button
                  size="sm"
                  onClick={() => handleRedeem(reward.id, reward.nameAr, reward.pointsCost)}
                  disabled={!canRedeem || redeemMutation.isPending}
                  className={`w-full ${canRedeem ? "bg-primary hover:bg-primary/90" : ""}`}
                  variant={canRedeem ? "default" : "outline"}
                  data-testid={`button-redeem-${reward.id}`}
                >
                  {canRedeem ? "استبدال" : `ينقصك ${(reward.pointsCost - pts.points).toLocaleString()} نقطة`}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white">سجل النقاط</h2>
          </div>
          <div className="space-y-3">
            {history.slice(0, 10).map(h => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                <div>
                  <p className="text-white text-sm">{h.reason}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleDateString("ar-SA")}</p>
                </div>
                <span className={`font-bold ${h.points > 0 ? "text-primary" : "text-red-400"}`}>
                  {h.points > 0 ? "+" : ""}{h.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

