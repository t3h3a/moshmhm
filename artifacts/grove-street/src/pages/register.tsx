import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { setUser } from "@/lib/auth";
import { useRegister } from "@workspace/api-client-react";
import { LOGO_SRC } from "@/lib/branding";
import { playSfx } from "@/lib/audio";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", email: "", phone: "", password: "", confirm: "" });
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("male");
  const registerMutation = useRegister();

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول المطلوبة (البريد الإلكتروني وكلمة المرور)", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirm) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (!acceptedPolicies) {
      toast({ title: "الموافقة مطلوبة", description: "يجب الموافقة على سياسات المتجر قبل إنشاء الحساب", variant: "destructive" });
      return;
    }

    try {
      const result = await registerMutation.mutateAsync({
        data: { name: form.name, username: form.username, email: form.email, password: form.password, phone: form.phone, gender },
      });
      setUser(result.user, result.token);
      playSfx("new_account");
      toast({ title: "مرحبا!", description: "تم إنشاء حسابك بنجاح" });
      setLocation("/");
    } catch {
      toast({ title: "فشل التسجيل", description: "تأكد أن الباك إند يعمل وأن البريد غير مستخدم", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <img src={LOGO_SRC} alt="Grove Street" className="h-20 w-20 object-contain mx-auto mb-3" />
          <h1 className="text-4xl font-black text-primary mb-2">GROVE STREET</h1>
          <p className="text-muted-foreground">إنشاء حساب جديد مجاني</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <h2 className="text-xl font-bold text-white mb-6">تسجيل جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { field: "name", label: "الاسم الكامل (اختياري)", placeholder: "أحمد محمد", type: "text", testid: "input-name" },
              { field: "username", label: "اسم المستخدم (اختياري)", placeholder: "ahmed123", type: "text", testid: "input-username" },
              { field: "email", label: "البريد الإلكتروني *", placeholder: "email@example.com", type: "email", testid: "input-email" },
              { field: "phone", label: "رقم الجوال (اختياري)", placeholder: "0790000000", type: "tel", testid: "input-phone" },
            ].map(f => (
              <div key={f.field}>
                <Label className="text-white mb-1.5 block">{f.label}</Label>
                <Input type={f.type} value={form[f.field as keyof typeof form]} onChange={e => handleChange(f.field, e.target.value)} placeholder={f.placeholder} className="text-right" data-testid={f.testid} />
              </div>
            ))}

            {/* Gender Selector Cards */}
            <div className="space-y-2">
              <Label className="text-white mb-1.5 block">الجنس (لتخصيص نمط وألوان الموقع والموسيقى):</Label>
              <div className="grid grid-cols-2 gap-4">
                {/* Male Card */}
                <div
                  onClick={() => setGender("male")}
                  className={`relative overflow-hidden rounded-xl p-4 cursor-pointer border-2 transition-all flex flex-col justify-between h-[120px] ${
                    gender === "male"
                      ? "border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.25)]"
                      : "border-white/10 bg-black/25 hover:border-green-500/40"
                  }`}
                >
                  <div>
                    <p className="text-white font-bold text-sm">ذكر ♂</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Classic Theme</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-auto">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-md shadow-green-500/50" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                    <span className="w-6 h-1 bg-green-500/30 rounded-full" />
                    <span className="text-[10px] absolute left-3 bottom-3 opacity-30 select-none">🚬</span>
                  </div>
                </div>

                {/* Female Card */}
                <div
                  onClick={() => setGender("female")}
                  className={`relative overflow-hidden rounded-xl p-4 cursor-pointer border-2 transition-all flex flex-col justify-between h-[120px] ${
                    gender === "female"
                      ? "border-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.25)]"
                      : "border-white/10 bg-black/25 hover:border-pink-500/40"
                  }`}
                >
                  <div>
                    <p className="text-white font-bold text-sm">أنثى ♀</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Zomoroda Theme</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-auto">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-md shadow-pink-500/50" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                    <span className="w-6 h-1 bg-pink-500/30 rounded-full" />
                    <motion.span
                      className="text-xs absolute left-3 bottom-3 opacity-60 select-none"
                      animate={{ y: [0, -3, 0], rotate: [0, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      🎀
                    </motion.span>
                    <motion.span
                      className="text-[8px] absolute left-7 bottom-7 opacity-80 select-none"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ⭐
                    </motion.span>
                  </div>
                </div>
              </div>
            </div>

            {[
              { field: "password", label: "كلمة المرور", testid: "input-password" },
              { field: "confirm", label: "تأكيد كلمة المرور", testid: "input-confirm-password" },
            ].map(f => (
              <div key={f.field}>
                <Label className="text-white mb-1.5 block">{f.label}</Label>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} value={form[f.field as keyof typeof form]} onChange={e => handleChange(f.field, e.target.value)} placeholder="********" className="text-right pl-10" data-testid={f.testid} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white" data-testid="button-toggle-password">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <label className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-white/80">
              <input type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)} className="mt-1 accent-green-600" data-testid="checkbox-register-policies" />
              <span>أوافق على سياسات المتجر. <Link href="/policies"><span className="text-primary underline">قراءة السياسات</span></Link></span>
            </label>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold py-5" disabled={registerMutation.isPending} data-testid="button-register">
              {registerMutation.isPending ? "جاري التسجيل..." : <><UserPlus size={18} className="ml-2" />إنشاء الحساب</>}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            لديك حساب بالفعل؟ <Link href="/login"><span className="text-primary font-medium hover:underline cursor-pointer">سجل الدخول</span></Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
