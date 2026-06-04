import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/auth";
import { parseSharedSocialLinks } from "@/lib/sharedSiteState";

export default function AdminSettingsPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const { data: settingsData } = useGetSettings();
  const updateMutation = useUpdateSettings();
  
  const [form, setForm] = useState({
    siteName: "Grove Street",
    siteDescription: "شارعك الرقمي لشحن الألعاب والخدمات",
    contactEmail: "",
    contactPhone: "",
    contactInstagram: "thaerstore",
    maintenanceMode: false,
    boysMaintenanceMode: false,
    girlsMaintenanceMode: false,
  });

  useEffect(() => {
    if (settingsData) {
      const socialLinks = parseSharedSocialLinks((settingsData as any).socialLinks);
      setForm({
        siteName: settingsData.siteName ?? "Grove Street",
        siteDescription: settingsData.siteDescription ?? "شارعك الرقمي لشحن الألعاب والخدمات",
        contactEmail: settingsData.contactEmail ?? "",
        contactPhone: settingsData.contactPhone ?? "",
        contactInstagram: localStorage.getItem("grove-contact-instagram") || socialLinks.instagram || "thaerstore",
        maintenanceMode: Boolean(settingsData.maintenanceMode),
        boysMaintenanceMode: Boolean((settingsData as any).boysMaintenanceMode),
        girlsMaintenanceMode: Boolean((settingsData as any).girlsMaintenanceMode),
      });
    }
  }, [settingsData]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem("grove-contact-instagram", form.contactInstagram || "thaerstore");
      const socialLinks = parseSharedSocialLinks((settingsData as any)?.socialLinks);
      await updateMutation.mutateAsync({ data: { ...form, socialLinks: JSON.stringify({ ...socialLinks, instagram: form.contactInstagram || "thaerstore" }) } as any });
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الموقع بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">إعدادات الموقع</h1>
      </div>

      <motion.div className="rounded-2xl p-8" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={handleSave} className="space-y-5 text-right">
          {[
            { field: "siteName", label: "اسم الموقع", placeholder: "Grove Street" },
            { field: "siteDescription", label: "وصف الموقع", placeholder: "شارعك الرقمي..." },
            { field: "contactEmail", label: "البريد الإلكتروني للتواصل", placeholder: "support@grovestreet.gg" },
            { field: "contactPhone", label: "رقم الهاتف / واتساب", placeholder: "سيتم إضافة الرقم لاحقاً" },
            { field: "contactInstagram", label: "Instagram", placeholder: "thaerstore" },
          ].map(f => (
            <div key={f.field}>
              <Label className="text-white mb-1.5 block">{f.label}</Label>
              <Input
                value={form[f.field as keyof typeof form] as string}
                onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))}
                placeholder={f.placeholder}
                className="text-right"
                data-testid={`input-${f.field}`}
              />
            </div>
          ))}
          
          <div className="border-t border-white/5 pt-4 space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">إعدادات الصيانة لقسم الرجال والفتيات</h3>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-black/10">
              <Switch
                checked={form.maintenanceMode}
                onCheckedChange={v => setForm(prev => ({ ...prev, maintenanceMode: v }))}
                data-testid="switch-maintenance"
              />
              <Label className="text-white text-xs">وضع الصيانة العام للموقع بالكامل (المشترك)</Label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-black/10">
              <Switch
                checked={form.boysMaintenanceMode}
                onCheckedChange={v => setForm(prev => ({ ...prev, boysMaintenanceMode: v }))}
              />
              <Label className="text-white text-xs">تعطيل وقفل قسم الشباب فقط (صيانة الشباب)</Label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-black/10">
              <Switch
                checked={form.girlsMaintenanceMode}
                onCheckedChange={v => setForm(prev => ({ ...prev, girlsMaintenanceMode: v }))}
              />
              <Label className="text-white text-xs">تعطيل وقفل قسم البنات فقط (صيانة البنات)</Label>
            </div>
          </div>

          {(form.maintenanceMode || form.boysMaintenanceMode || form.girlsMaintenanceMode) && (
            <div className="rounded-xl p-4 text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <p className="text-red-400 font-bold">⚠️ تنبيه وضع الصيانة نشط حالياً وسيقوم بحجب الموقع أو القسم المحدد عن المستخدمين.</p>
            </div>
          )}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold py-5 mt-2" disabled={updateMutation.isPending} data-testid="button-save-settings">
            {updateMutation.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
