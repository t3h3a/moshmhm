import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, ShieldAlert, ShieldCheck, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { setUser } from "@/lib/auth";
import { useLogin, useGoogleLogin } from "@workspace/api-client-react";
import { LOGO_SRC } from "@/lib/branding";
import { playSfx } from "@/lib/audio";

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  
  // 2FA Flow States
  const [step, setStep] = useState<"login" | "verify-totp" | "verify-setup" | "show-backup">("login");
  const [challengeToken, setChallengeToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [setupQrCode, setSetupQrCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [finalTokenData, setFinalTokenData] = useState<{ user: any; token: string } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const loginMutation = useLogin();
  const googleLoginMutation = useGoogleLogin();

  async function handleGoogleCredentialResponse(response: any) {
    const idToken = response.credential;
    if (!idToken) return;

    setLoading(true);
    try {
      toast({ title: "جاري التحقق من حساب Google", description: "Verifying Google account" });
      const result = await googleLoginMutation.mutateAsync({ data: { idToken } });

      if (result.requires2FA) {
        if (!result.challengeToken) {
          toast({ title: "خطأ في التحقق", description: "لم يتم إصدار رمز التحدي المؤقت للتحقق بخطوتين", variant: "destructive" });
          return;
        }
        setChallengeToken(result.challengeToken);
        setStep("verify-totp");
        toast({ title: "التحقق بخطوتين", description: "يرجى إدخال رمز التحقق لتأمين الدخول" });
      } else if (result.requiresSetup2FA) {
        if (!result.challengeToken) {
          toast({ title: "خطأ في التحقق", description: "لم يتم إصدار رمز التحدي المؤقت لإعداد التحقق بخطوتين", variant: "destructive" });
          return;
        }
        setChallengeToken(result.challengeToken);
        setSetupSecret(result.secret ?? "");
        setSetupQrCode(result.qrCode ?? result.qrCodeUrl ?? "");
        setStep("verify-setup");
        toast({ title: "تأمين الحساب إجباري", description: "يرجى إعداد التحقق بخطوتين (2FA) لتأمين حسابك الإداري" });
      } else {
        if (!result.token || !result.user) {
          toast({ title: "فشل تسجيل الدخول بجوجل", description: "بيانات تسجيل الدخول غير مكتملة", variant: "destructive" });
          return;
        }
        setUser(result.user, result.token);
        playSfx("welcome_back");
        toast({ title: "مرحبا", description: `أهلا ${result.user.name}` });
        setLocation("/");
      }
    } catch (err: any) {
      toast({
        title: "فشل تسجيل الدخول بجوجل",
        description: err.message || "Google sign-in failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn("VITE_GOOGLE_CLIENT_ID is missing");
      return;
    }

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-button"),
          { theme: "outline", size: "large", width: "100%", text: "signin_with" }
        );
      }
    };

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGoogle();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "خطأ", description: "يرجى إدخال البريد وكلمة المرور", variant: "destructive" });
      return;
    }
    if (!acceptedPolicies) {
      toast({ title: "الموافقة مطلوبة", description: "يجب الموافقة على سياسات المتجر قبل الدخول", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      
      if (result.requires2FA) {
        if (!result.challengeToken) {
          toast({ title: "خطأ في التحقق", description: "لم يتم إصدار رمز التحدي المؤقت للتحقق بخطوتين", variant: "destructive" });
          return;
        }
        setChallengeToken(result.challengeToken);
        setStep("verify-totp");
        toast({ title: "التحقق بخطوتين", description: "يرجى إدخال رمز التحقق لتأمين الدخول" });
      } else if (result.requiresSetup2FA) {
        if (!result.challengeToken) {
          toast({ title: "خطأ في التحقق", description: "لم يتم إصدار رمز التحدي المؤقت لإعداد التحقق بخطوتين", variant: "destructive" });
          return;
        }
        setChallengeToken(result.challengeToken);
        setSetupSecret(result.secret ?? "");
        setSetupQrCode(result.qrCode ?? result.qrCodeUrl ?? "");
        setStep("verify-setup");
        toast({ title: "تأمين الحساب إجباري", description: "يرجى إعداد التحقق بخطوتين (2FA) لتأمين حسابك الإداري" });
      } else {
        // Normal login
        if (!result.token || !result.user) {
          toast({ title: "خطأ في تسجيل الدخول", description: "بيانات تسجيل الدخول أو الجلسة غير مكتملة", variant: "destructive" });
          return;
        }
        setUser(result.user, result.token);
        playSfx("welcome_back");
        toast({ title: "مرحبا", description: `أهلا ${result.user.name}` });
        setLocation("/");
      }
    } catch (err: any) {
      toast({ title: "فشل تسجيل الدخول", description: err.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      toast({ title: "خطأ", description: "يرجى إدخال رمز صحيح", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "رمز التحقق غير صحيح");
      }

      if (data.backupCodes) {
        // First-time setup returns backup codes
        setBackupCodes(data.backupCodes);
        setFinalTokenData({ user: data.user, token: data.token });
        setStep("show-backup");
      } else {
        // Success
        setUser(data.user, data.token);
        playSfx("welcome_back");
        toast({ title: "مرحبا", description: `أهلا ${data.user.name}` });
        setLocation("/");
      }
    } catch (err: any) {
      toast({ title: "خطأ في التحقق", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleReset2FA() {
    if (!import.meta.env.DEV) {
      toast({ title: "غير مسموح", description: "خاصية متاحة فقط في بيئة التطوير", variant: "destructive" });
      return;
    }
    if (!email) {
      toast({ title: "البريد مطلوب", description: "أدخل البريد في حقل تسجيل الدخول", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/debug/reset-2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إعادة الضبط");
      toast({ title: "تم", description: "تمت إعادة إعداد التحقق بخطوتين. أعد المحاولة بالدخول لإظهار شاشة إعداد 2FA." });
      setStep("login");
    } catch (err: any) {
      toast({ title: "فشل", description: err.message || "تعذر إعادة الإعداد", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleBackupDone() {
    if (finalTokenData) {
      setUser(finalTokenData.user, finalTokenData.token);
      playSfx("welcome_back");
      toast({ title: "مرحبا", description: `أهلا ${finalTokenData.user.name}` });
      setLocation("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <img src={LOGO_SRC} alt="Grove Street" className="h-20 w-20 object-contain mx-auto mb-3" />
          <h1 className="text-4xl font-black text-primary mb-2">GROVE STREET</h1>
          <p className="text-muted-foreground">أدخل بياناتك للدخول إلى حسابك</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          {step === "login" && (
            <>
              <h2 className="text-xl font-bold text-white mb-6">تسجيل الدخول</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-white mb-1.5 block">البريد الإلكتروني</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" className="text-right" autoComplete="email" data-testid="input-email" />
                </div>
                <div>
                  <Label htmlFor="password" className="text-white mb-1.5 block">كلمة المرور</Label>
                  <div className="relative">
                    <Input id="password" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="********" className="text-right pl-10" autoComplete="current-password" data-testid="input-password" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white" data-testid="button-toggle-password">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link href="/forgot-password"><span className="text-sm text-primary hover:underline cursor-pointer">نسيت كلمة المرور؟</span></Link>
                </div>
                <label className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-white/80">
                  <input type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)} className="mt-1 accent-green-600" data-testid="checkbox-login-policies" />
                  <span>أوافق على سياسات المتجر. <Link href="/policies"><span className="text-primary underline">قراءة السياسات</span></Link></span>
                </label>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold py-5" disabled={loading} data-testid="button-login">
                  {loading ? "جاري الدخول..." : <><LogIn size={18} className="ml-2" />دخول</>}
                </Button>
              </form>

              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <div className="relative flex py-2 items-center w-full">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-4 text-muted-foreground text-xs">أو تسجيل الدخول بواسطة / Or</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>
                  <div id="google-signin-button" className="w-full flex justify-center" data-testid="button-google-login"></div>
                </div>
              ) : (
                import.meta.env.DEV && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center text-xs text-yellow-500">
                    تنبيه في التطوير: VITE_GOOGLE_CLIENT_ID غير معرف
                    <br />
                    Dev: VITE_GOOGLE_CLIENT_ID is missing
                  </div>
                )
              )}

              <p className="text-center text-sm text-muted-foreground mt-6">
                ليس لديك حساب؟ <Link href="/register"><span className="text-primary font-medium hover:underline cursor-pointer">سجل الآن</span></Link>
              </p>
            </>
          )}

          {step === "verify-totp" && (
            <>
              <div className="flex items-center gap-2 mb-4 justify-center">
                <ShieldCheck size={28} className="text-primary" />
                <h2 className="text-xl font-bold text-white">التحقق بخطوتين</h2>
              </div>
              <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
                حسابك مؤمن بواسطة Two-Factor Authentication. يرجى إدخال رمز التحقق المكون من 6 أرقام من تطبيق Authenticator الخاص بك، أو كود الاحتياط المكون من 8 أحرف.
              </p>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <Label htmlFor="otp" className="text-white mb-1.5 block text-center">رمز التحقق أو كود الاحتياط</Label>
                  <Input id="otp" type="text" maxLength={8} value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="123456" className="text-center font-bold tracking-widest text-lg" data-testid="input-2fa-otp" />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold py-5" disabled={loading} data-testid="button-2fa-verify">
                  {loading ? "جاري التحقق..." : "تأكيد الدخول"}
                </Button>
                <Button type="button" onClick={() => setStep("login")} variant="outline" className="w-full font-bold" data-testid="button-2fa-back">
                  العودة للخلف
                </Button>
                {import.meta.env.DEV && (email.toLowerCase().includes("owner") || email.toLowerCase().includes("admin") || email.toLowerCase() === "tthhaaeeeerr@gmail.com" || email.toLowerCase() === "qtybhrbas774@gmail.com") && (
                  <Button type="button" onClick={handleReset2FA} variant="destructive" className="w-full font-bold mt-2" data-testid="button-2fa-reset">
                    Reset 2FA Setup
                  </Button>
                )}
              </form>
            </>
          )}

          {step === "verify-setup" && (
            <>
              <div className="flex items-center gap-2 mb-3 justify-center">
                <ShieldAlert size={28} className="text-primary" />
                <h2 className="text-xl font-bold text-white">إعداد التحقق بخطوتين</h2>
              </div>
              <p className="text-xs text-muted-foreground text-center mb-6 leading-relaxed">
                حسابات الإدارة تتطلب التحقق بخطوتين (2FA) بشكل إلزامي. قم بمسح الرمز لتفعيل الحماية والدخول.
              </p>

              <div className="space-y-6">
                <div>
                  <p className="text-xs text-white/95 mb-2 font-bold">1. امسح الرمز المربع بكاميرا التطبيق:</p>
                  <div dangerouslySetInnerHTML={{ __html: setupQrCode }} className="bg-white p-3 rounded-2xl mx-auto w-fit mb-3 shadow-lg" />
                </div>

                <div>
                  <p className="text-xs text-white/95 mb-1.5 font-bold">2. أو أدخل المفتاح السري يدوياً:</p>
                  <code className="block bg-black/40 text-primary p-2.5 rounded-xl font-mono font-bold tracking-widest text-center text-sm mb-3 select-all" data-testid="text-2fa-secret">
                    {setupSecret}
                  </code>
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <Label htmlFor="otp-setup" className="text-white mb-1.5 block text-center font-bold">3. أدخل رمز الـ 6 أرقام الناتج للتفعيل والدخول:</Label>
                    <Input id="otp-setup" type="text" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="123456" className="text-center font-bold tracking-widest text-lg" data-testid="input-2fa-setup-otp" />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold py-5" disabled={loading} data-testid="button-2fa-setup-verify">
                    {loading ? "جاري التفعيل..." : "تفعيل الحساب والدخول"}
                  </Button>
                  <Button type="button" onClick={() => setStep("login")} variant="outline" className="w-full font-bold" data-testid="button-2fa-setup-back">
                    إلغاء
                  </Button>
                </form>
              </div>
            </>
          )}

          {step === "show-backup" && (
            <>
              <div className="flex items-center gap-2 mb-3 justify-center">
                <Key size={28} className="text-primary" />
                <h2 className="text-xl font-bold text-white">أكواد الاحتياط الخاصة بك</h2>
              </div>
              <p className="text-xs text-muted-foreground text-center mb-6 leading-relaxed">
                احتفظ بهذه الأكواد الثمانية في مكان آمن تماماً! سوف تظهر لك هذه الأكواد لمرة واحدة فقط، وتُستخدم كل كود منها مرة واحدة في حال فقدان هاتفك.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {backupCodes.map((code, index) => (
                  <code key={index} className="bg-black/40 text-center text-white py-2 rounded-lg font-bold border border-white/5 select-all">
                    {code}
                  </code>
                ))}
              </div>

              <Button onClick={handleBackupDone} className="w-full bg-primary hover:bg-primary/90 font-bold py-4" data-testid="button-2fa-backup-confirm">
                حفظت الأكواد، متابعة الدخول
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
