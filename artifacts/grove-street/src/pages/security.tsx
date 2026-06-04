import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";

export default function SecurityPage() {
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({ title: "خطأ", description: "املأ جميع الحقول", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "خطأ", description: "تأكيد كلمة السر غير مطابق", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!res.ok) throw new Error("failed");
      toast({ title: "تم الحفظ", description: "تم تغيير كلمة السر بنجاح" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({ title: "خطأ", description: "فشل تغيير كلمة السر، تأكد من كلمة السر القديمة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">الأمان</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <div>
          <Label className="text-white mb-1.5 block">كلمة السر القديمة</Label>
          <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="text-right" data-testid="input-old-password" />
        </div>
        <div>
          <Label className="text-white mb-1.5 block">كلمة السر الجديدة</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="text-right" data-testid="input-new-password" />
        </div>
        <div>
          <Label className="text-white mb-1.5 block">تأكيد كلمة السر الجديدة</Label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="text-right" data-testid="input-confirm-new-password" />
        </div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold" disabled={loading} data-testid="button-change-password">
          <LockKeyhole size={18} className="ml-2" />
          {loading ? "جار الحفظ..." : "تغيير كلمة السر"}
        </Button>
      </form>
    </div>
  );
}
