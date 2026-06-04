import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useListRanks, useGetPoints } from "@workspace/api-client-react";

const DEFAULT_RANKS = [
  { id: 1, name: "Bronze", nameAr: "برونزي", minPoints: 0, color: "#cd7f32", icon: "B", benefits: "دخول أساسي لكل الخدمات وجمع نقاط من الطلبات المكتملة." },
  { id: 2, name: "Silver", nameAr: "فضي", minPoints: 500, color: "#9ca3af", icon: "S", benefits: "شارة رتبة وأولوية خفيفة في المتابعة." },
  { id: 3, name: "Gold", nameAr: "ذهبي", minPoints: 1500, color: "#fbbf24", icon: "G", benefits: "أولوية دعم أفضل وظهور أوضح للطلبات." },
  { id: 4, name: "Platinum", nameAr: "بلاتيني", minPoints: 4000, color: "#22d3ee", icon: "P", benefits: "معاملة مميزة ومراجعة أسرع لبعض الطلبات." },
  { id: 5, name: "Diamond", nameAr: "دايموند", minPoints: 10000, color: "#60a5fa", icon: "D", benefits: "أولوية تنفيذ خاصة وشارة واضحة في الحساب." },
  { id: 6, name: "Legend", nameAr: "أسطوري", minPoints: 30000, color: "#a855f7", icon: "L", benefits: "أولوية قوية وميزة سعر بسيطة على المنتجات المؤهلة فقط." },
  { id: 7, name: "Niga", nameAr: "نيقا", minPoints: 50000, color: "#22c55e", icon: "/chargre-badge.png", benefits: "رتبة سرية بميزات خاصة تظهر عند الوصول إليها." },
];

function isNega(rank: any) {
  return rank?.name === "Niga";
}

function rankIcon(rank: any) {
  if (isNega(rank)) {
    return <img src="/chargre-badge.png" alt="Niga" className="h-14 w-14 rounded-full object-cover shadow-[0_0_24px_rgba(34,197,94,0.45)]" />;
  }

  const icon = typeof rank.icon === "string" && !rank.icon.startsWith("/") ? rank.icon : (rank.name?.[0] ?? "R");
  return (
    <div className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl font-black" style={{ color: rank.color, background: `${rank.color}1f`, border: `1px solid ${rank.color}55` }}>
      {icon}
    </div>
  );
}

export default function RanksPage() {
  const { data: ranksData } = useListRanks();
  const { data: pointsData } = useGetPoints();

  const ranks = (Array.isArray(ranksData) && ranksData.length ? ranksData : DEFAULT_RANKS)
    .map((rank: any, index: number) => ({ ...DEFAULT_RANKS[index], ...rank }))
    .sort((a: any, b: any) => a.minPoints - b.minPoints);
  const currentPoints = pointsData?.points ?? 0;
  const currentRankName = pointsData?.rank ?? "";

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Trophy size={28} className="text-primary" />
        <div>
          <h1 className="text-3xl font-black text-white">نظام الرتب</h1>
          <p className="text-sm text-muted-foreground mt-1">كل رتبة لها حد نقاط وميزات بسيطة. بعض تفاصيل Niga تبقى سرية حتى الوصول إليها.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {ranks.map((rank: any, i: number) => {
          const isCurrentRank = currentRankName
            ? rank.name === currentRankName || rank.nameAr === currentRankName
            : currentPoints >= rank.minPoints && (i === ranks.length - 1 || currentPoints < ranks[i + 1]!.minPoints);
          const isUnlocked = currentPoints >= rank.minPoints;

          return (
            <motion.div
              key={`${rank.id}-${rank.name}`}
              className="relative overflow-hidden rounded-2xl p-5"
              style={{
                background: isCurrentRank ? `${rank.color}16` : "hsl(var(--card))",
                border: `1px solid ${isCurrentRank ? rank.color : "hsl(var(--border))"}`,
                opacity: isUnlocked ? 1 : 0.72,
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: isUnlocked ? 1 : 0.72, y: 0 }}
              transition={{ delay: i * 0.05 }}
              data-testid={`card-rank-${rank.id}`}
            >
              {isNega(rank) && <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,197,94,0.22),transparent_34%)]" />}
              {isCurrentRank && (
                <span className="absolute top-4 left-4 rounded-full px-2.5 py-1 text-xs font-black" style={{ background: rank.color, color: "#06110a" }}>
                  رتبتك الحالية
                </span>
              )}
              <div className="relative flex gap-4">
                {rankIcon(rank)}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black" style={{ color: rank.color }}>{rank.nameAr}</h2>
                    <span className="text-sm text-muted-foreground">{rank.name}</span>
                  </div>
                  <p className="mt-2 text-white/80 leading-7">{isNega(rank) && !isUnlocked ? "رتبة سرية بميزات خاصة تظهر عند الوصول إليها" : rank.benefits}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-muted-foreground">الحد الأدنى</span>
                    <span className="rounded-full px-3 py-1 font-black" style={{ color: rank.color, background: `${rank.color}18` }}>{rank.minPoints.toLocaleString()} نقطة</span>
                  </div>
                  {!isUnlocked && !isNega(rank) && (
                    <div className="mt-4">
                      <p className="mb-1 text-sm text-muted-foreground">ينقصك {(rank.minPoints - currentPoints).toLocaleString()} نقطة</p>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (currentPoints / Math.max(rank.minPoints, 1)) * 100)}%`, background: rank.color }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

