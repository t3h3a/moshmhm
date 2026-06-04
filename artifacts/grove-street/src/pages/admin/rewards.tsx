import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useListRewards, useCreateReward, useListRanks, useCreateRank, getListRewardsQueryKey, getListRanksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/auth";

export default function AdminRewardsPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rewards = [] } = useListRewards();
  const { data: ranks = [] } = useListRanks();
  const createRewardMutation = useCreateReward();
  const createRankMutation = useCreateRank();

  const [rewardForm, setRewardForm] = useState({ nameAr: "", pointsCost: "", description: "" });
  const [rankForm, setRankForm] = useState({ name: "", nameAr: "", minPoints: "", color: "#22c55e", icon: "⭐", benefits: "" });

  async function handleCreateReward(e: React.FormEvent) {
    e.preventDefault();
    if (!rewardForm.nameAr || !rewardForm.pointsCost) { toast({ title: "خطأ", variant: "destructive" }); return; }
    try {
      await createRewardMutation.mutateAsync({ data: { nameAr: rewardForm.nameAr, pointsCost: parseInt(rewardForm.pointsCost), description: rewardForm.description } });
      queryClient.invalidateQueries({ queryKey: getListRewardsQueryKey() });
      toast({ title: "تمت الإضافة" });
      setRewardForm({ nameAr: "", pointsCost: "", description: "" });
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  }

  async function handleCreateRank(e: React.FormEvent) {
    e.preventDefault();
    if (!rankForm.name || !rankForm.nameAr || !rankForm.minPoints) { toast({ title: "خطأ", variant: "destructive" }); return; }
    try {
      await createRankMutation.mutateAsync({ data: { name: rankForm.name, nameAr: rankForm.nameAr, minPoints: parseInt(rankForm.minPoints), color: rankForm.color, icon: rankForm.icon, benefits: rankForm.benefits } });
      queryClient.invalidateQueries({ queryKey: getListRanksQueryKey() });
      toast({ title: "تمت الإضافة" });
      setRankForm({ name: "", nameAr: "", minPoints: "", color: "#22c55e", icon: "⭐", benefits: "" });
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Trophy size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">المكافآت والرتب</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rewards */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">المكافآت ({rewards.length})</h2>
          <div className="rounded-2xl p-5 mb-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="text-sm font-bold text-white mb-3">إضافة مكافأة</h3>
            <form onSubmit={handleCreateReward} className="space-y-3">
              {[
                { field: "nameAr", label: "الاسم (AR)", placeholder: "اسم المكافأة" },
                { field: "pointsCost", label: "تكلفة النقاط", placeholder: "5000", type: "number" },
                { field: "description", label: "الوصف", placeholder: "وصف المكافأة" },
              ].map(f => (
                <div key={f.field}>
                  <Label className="text-muted-foreground text-xs mb-1 block">{f.label}</Label>
                  <Input type={f.type ?? "text"} value={rewardForm[f.field as keyof typeof rewardForm]} onChange={e => setRewardForm(prev => ({ ...prev, [f.field]: e.target.value }))} placeholder={f.placeholder} className="text-right h-8 text-sm" data-testid={`input-reward-${f.field}`} />
                </div>
              ))}
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 w-full" disabled={createRewardMutation.isPending} data-testid="button-submit-reward">إضافة</Button>
            </form>
          </div>
          <div className="space-y-2">
            {rewards.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} data-testid={`card-reward-${r.id}`}>
                <div>
                  <p className="text-white text-sm font-medium">{r.nameAr}</p>
                  <p className="text-primary text-xs">{r.pointsCost.toLocaleString()} نقطة</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranks */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">الرتب ({ranks.length})</h2>
          <div className="rounded-2xl p-5 mb-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="text-sm font-bold text-white mb-3">إضافة رتبة</h3>
            <form onSubmit={handleCreateRank} className="space-y-3">
              {[
                { field: "name", label: "الاسم (EN)", placeholder: "Bronze" },
                { field: "nameAr", label: "الاسم (AR)", placeholder: "برونزي" },
                { field: "minPoints", label: "الحد الأدنى للنقاط", placeholder: "0", type: "number" },
                { field: "icon", label: "الأيقونة", placeholder: "🥉" },
                { field: "benefits", label: "المزايا", placeholder: "وصف المزايا" },
              ].map(f => (
                <div key={f.field}>
                  <Label className="text-muted-foreground text-xs mb-1 block">{f.label}</Label>
                  <Input type={f.type ?? "text"} value={rankForm[f.field as keyof typeof rankForm]} onChange={e => setRankForm(prev => ({ ...prev, [f.field]: e.target.value }))} placeholder={f.placeholder} className="text-right h-8 text-sm" data-testid={`input-rank-${f.field}`} />
                </div>
              ))}
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 w-full" disabled={createRankMutation.isPending} data-testid="button-submit-rank">إضافة</Button>
            </form>
          </div>
          <div className="space-y-2">
            {ranks.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} data-testid={`card-rank-${r.id}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{r.icon}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{r.nameAr}</p>
                    <p className="text-muted-foreground text-xs">{r.minPoints.toLocaleString()} نقطة</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
