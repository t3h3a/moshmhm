import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { toast({ title: "خطأ", description: "يرجى إدخال البريد الإلكتروني", variant: "destructive" }); return; }
    setSent(true);
    toast({ title: "تم الإرسال", description: "إذا كان الحساب موجوداً، ستصلك رسالة استعادة كلمة المرور" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-primary mb-2">GROVE STREET</h1>
          <p className="text-muted-foreground">استعادة كلمة المرور</p>
        </div>
        <div className="rounded-2xl p-8" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "hsl(142 70% 35% / 0.2)" }}>
                <Mail size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">تم الإرسال</h2>
              <p className="text-muted-foreground mb-6">تحقق من بريدك الإلكتروني</p>
              <Link href="/login">
                <Button variant="outline" className="w-full" data-testid="button-back-to-login">العودة لتسجيل الدخول</Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-2">نسيت كلمة المرور؟</h2>
              <p className="text-muted-foreground text-sm mb-6">أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-white mb-1.5 block">البريد الإلكتروني</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="text-right" data-testid="input-email" />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold py-5" data-testid="button-send-reset">
                  <Mail size={18} className="ml-2" />إرسال رابط الاستعادة
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <Link href="/login"><span className="text-primary hover:underline cursor-pointer flex items-center justify-center gap-1"><ArrowRight size={14} />رجوع لتسجيل الدخول</span></Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
