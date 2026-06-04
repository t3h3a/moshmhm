import { useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useListGames, useCreateGame, getListGamesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/auth";

export default function AdminGamesPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: games = [] } = useListGames();
  const createMutation = useCreateGame();
  const [form, setForm] = useState({ name: "", nameAr: "", imageUrl: "" });
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.nameAr || !form.imageUrl) { toast({ title: "خطأ", description: "جميع الحقول مطلوبة", variant: "destructive" }); return; }
    try {
      await createMutation.mutateAsync({ data: { name: form.name, nameAr: form.nameAr, imageUrl: form.imageUrl } });
      queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
      toast({ title: "تمت الإضافة" });
      setForm({ name: "", nameAr: "", imageUrl: "" });
      setShowForm(false);
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Gamepad2 size={28} className="text-primary" />
          <h1 className="text-3xl font-black text-white">إدارة الألعاب</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90 font-bold" data-testid="button-add-game">
          <Plus size={18} className="ml-2" />إضافة لعبة
        </Button>
      </div>

      {showForm && (
        <motion.div className="rounded-2xl p-6 mb-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-lg font-bold text-white mb-4">لعبة جديدة</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            {[
              { field: "name", label: "الاسم (EN)", placeholder: "Free Fire" },
              { field: "nameAr", label: "الاسم (AR)", placeholder: "فري فاير" },
              { field: "imageUrl", label: "رابط الصورة", placeholder: "https://..." },
            ].map(f => (
              <div key={f.field}>
                <Label className="text-white mb-1.5 block text-sm">{f.label}</Label>
                <Input value={form[f.field as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))} placeholder={f.placeholder} className="text-right" data-testid={`input-${f.field}`} />
              </div>
            ))}
            <div className="col-span-2 flex gap-3">
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending} data-testid="button-submit-game">إضافة</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {games.map((game, i) => (
          <motion.div key={game.id} className="rounded-xl p-5 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} data-testid={`card-game-${game.id}`}>
            <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center text-xl font-black text-primary" style={{ background: "hsl(142 70% 35% / 0.1)" }}>
              {game.name.substring(0, 2)}
            </div>
            <p className="text-white font-bold text-sm">{game.nameAr}</p>
            <p className="text-muted-foreground text-xs">{game.name}</p>
          </motion.div>
        ))}
        {games.length === 0 && <p className="col-span-4 text-center text-muted-foreground py-12">لا توجد ألعاب مضافة</p>}
      </div>
    </div>
  );
}
