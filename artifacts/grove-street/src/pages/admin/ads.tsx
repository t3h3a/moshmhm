import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useListAllAds, useCreateAd, useDeleteAd, getListAllAdsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/auth";

export default function AdminAdsPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: ads = [], isLoading } = useListAllAds();
  const createMutation = useCreateAd();
  const deleteMutation = useDeleteAd();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", titleAr: "", descriptionAr: "", imageUrl: "", linkUrl: "", buttonTextAr: "" });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) { toast({ title: "خطأ", description: "العنوان مطلوب", variant: "destructive" }); return; }
    try {
      await createMutation.mutateAsync({ data: { title: form.title, titleAr: form.titleAr, descriptionAr: form.descriptionAr, imageUrl: form.imageUrl, linkUrl: form.linkUrl, buttonTextAr: form.buttonTextAr } });
      queryClient.invalidateQueries({ queryKey: getListAllAdsQueryKey() });
      toast({ title: "تم إضافة الإعلان" });
      setShowForm(false);
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListAllAdsQueryKey() });
      toast({ title: "تم الحذف" });
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Megaphone size={28} className="text-primary" />
          <h1 className="text-3xl font-black text-white">إدارة الإعلانات</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90 font-bold" data-testid="button-add-ad">
          <Plus size={18} className="ml-2" />إضافة إعلان
        </Button>
      </div>

      {showForm && (
        <motion.div className="rounded-2xl p-6 mb-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-lg font-bold text-white mb-4">إعلان جديد</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            {[
              { field: "title", label: "العنوان (EN)", placeholder: "Ad Title" },
              { field: "titleAr", label: "العنوان (AR)", placeholder: "عنوان الإعلان" },
              { field: "descriptionAr", label: "الوصف (AR)", placeholder: "وصف الإعلان" },
              { field: "imageUrl", label: "رابط الصورة", placeholder: "https://..." },
              { field: "linkUrl", label: "رابط الزر", placeholder: "/games" },
              { field: "buttonTextAr", label: "نص الزر (AR)", placeholder: "تسوق الآن" },
            ].map(f => (
              <div key={f.field}>
                <Label className="text-white mb-1.5 block text-sm">{f.label}</Label>
                <Input value={form[f.field as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))} placeholder={f.placeholder} className="text-right" data-testid={`input-${f.field}`} />
              </div>
            ))}
            <div className="col-span-2 flex gap-3">
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending} data-testid="button-submit-ad">إضافة</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            </div>
          </form>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-muted" />)}</div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad, i) => (
            <motion.div key={ad.id} className="rounded-xl p-5 flex items-center justify-between" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} data-testid={`card-ad-${ad.id}`}>
              <div>
                <p className="text-white font-bold">{ad.titleAr || ad.title}</p>
                <p className="text-muted-foreground text-sm">{ad.descriptionAr || ""} · {ad.linkUrl || ""}</p>
                <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: ad.isActive ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)", color: ad.isActive ? "#22c55e" : "#9ca3af" }}>
                  {ad.isActive ? "نشط" : "مخفي"}
                </span>
              </div>
              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(ad.id)} data-testid={`button-delete-ad-${ad.id}`}>
                <Trash2 size={16} />
              </Button>
            </motion.div>
          ))}
          {ads.length === 0 && <p className="text-center text-muted-foreground py-12">لا توجد إعلانات</p>}
        </div>
      )}
    </div>
  );
}
