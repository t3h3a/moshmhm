import { useState, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Instagram, Music, Phone, Settings, Sparkles, Volume2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  getMusicVolume,
  getSfxVolume,
  isMusicEnabled,
  isSfxEnabled,
  setMusicVolume,
  setSfxEnabled,
  setSfxVolume,
  toggleMusic,
} from "@/lib/audio";
import { areBackgroundEffectsEnabled, setBackgroundEffectsEnabled } from "@/lib/background-effects";
import { useLanguage } from "@/lib/language";
import { getUser, setUser, getToken } from "@/lib/auth";
import { ShieldCheck, LockKeyhole } from "lucide-react";
import { customFetch, useGetSettings } from "@workspace/api-client-react";
import { parseSharedSocialLinks } from "@/lib/sharedSiteState";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: settingsData } = useGetSettings();
  const user = getUser();
  const [musicEnabled, setMusicEnabledState] = useState(isMusicEnabled());
  const [musicVolume, setMusicVolumeState] = useState(getMusicVolume() * 100);
  const [sfxEnabled, setSfxEnabledState] = useState(isSfxEnabled());
  const [sfxVolume, setSfxVolumeState] = useState(getSfxVolume() * 100);
  const [backgroundEffects, setBackgroundEffectsState] = useState(areBackgroundEffectsEnabled());
  const [performanceMode, setPerformanceMode] = useState(() => localStorage.getItem("grove-performance-mode") === "true");
  const [language, setLanguage] = useLanguage();
  const [assistantEnabled, setAssistantEnabled] = useState(() => {
    return localStorage.getItem("grove-assistant-enabled") !== "false";
  });
  const [gender, setGender] = useState<"male" | "female">(user?.gender ?? "male");
  
  // 2FA Flow States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(user?.twoFactorEnabled));
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  
  // Setup fields
  const [setupChallengeToken, setSetupChallengeToken] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [setupQrCode, setSetupQrCode] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([]);
  
  // Disable fields
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const contactPhone = settingsData?.contactPhone || "";
  const socialLinks = parseSharedSocialLinks((settingsData as any)?.socialLinks);
  const instagramHandle = (
    socialLinks.instagram ||
    localStorage.getItem("grove-contact-instagram") ||
    "thaerstore"
  ).replace(/^@/, "");

  async function handleEnable2FA() {
    setTwoFactorLoading(true);
    try {
      const res = await fetch("/api/auth/enable-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start 2FA setup");

      setSetupChallengeToken(data.challengeToken);
      setSetupSecret(data.secret);
      setSetupQrCode(data.qrCode);
      setShowSetup2FA(true);
      toast({ title: "رمز الاستجابة جاهز", description: "امسح الرمز المربع باستخدام تطبيق Google Authenticator" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleVerifySetup() {
    if (!setupCode || setupCode.trim().length !== 6) {
      toast({ title: "خطأ", description: "أدخل الرمز المكون من 6 أرقام", variant: "destructive" });
      return;
    }
    setTwoFactorLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken: setupChallengeToken, code: setupCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "رمز غير صحيح");

      // Setup success!
      setUser(data.user, data.token);
      setTwoFactorEnabled(true);
      setSetupBackupCodes(data.backupCodes || []);
      setShowSetup2FA(false);
      setShowBackupModal(true);
      toast({ title: "تم التفعيل بنجاح", description: "تم تفعيل التحقق بخطوتين وتأمين حسابك!" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleDisable2FA() {
    if (!disablePassword || !disableCode) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setTwoFactorLoading(true);
    try {
      const res = await fetch("/api/auth/disable-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({ password: disablePassword, code: disableCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التعطيل");

      // Disable success!
      const updatedUser = { ...user, twoFactorEnabled: false };
      setUser(updatedUser);
      setTwoFactorEnabled(false);
      setShowDisable2FA(false);
      setDisablePassword("");
      setDisableCode("");
      toast({ title: "تم التعطيل", description: "تم تعطيل التحقق بخطوتين بنجاح." });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function saveMusicSettings() {
    if (musicEnabled !== isMusicEnabled()) toggleMusic();
    setMusicVolume(musicVolume / 100);
    setSfxEnabled(sfxEnabled);
    setSfxVolume(sfxVolume / 100);
    setBackgroundEffectsEnabled(backgroundEffects);
    localStorage.setItem("grove-performance-mode", performanceMode ? "true" : "false");
    document.body.classList.toggle("performance-mode", performanceMode);
    
    // Save Assistant Settings
    localStorage.setItem("grove-assistant-enabled", assistantEnabled ? "true" : "false");
    window.dispatchEvent(new CustomEvent("grove-assistant-toggle", { detail: assistantEnabled }));

    // Save Gender / Theme choice if logged in
    if (user && gender !== user.gender) {
      const isBoysMaintenance = (settingsData as any)?.boysMaintenanceMode === true;
      const isGirlsMaintenance = (settingsData as any)?.girlsMaintenanceMode === true;
      const targetIsClosed = (gender === "female" && isGirlsMaintenance) || (gender === "male" && isBoysMaintenance);

      if (targetIsClosed) {
        setUser({ ...user, gender });
        toast({
          title: "القسم قيد التطوير",
          description: "هذا الثيم مغلق حالياً للصيانة. سيتم تحويلك تلقائياً للقسم المتاح.",
          variant: "destructive",
        });
        window.setTimeout(() => {
          window.location.href = "/";
        }, 250);
        return;
      }

      try {
        await customFetch("/api/auth/me", {
          method: "PATCH",
          body: JSON.stringify({ gender })
        });
        setUser({ ...user, gender });
        toast({ title: "تم تغيير المظهر", description: `تم تفعيل نمط ${gender === "female" ? "كوكب زمردة" : "جروف ستريت كلاسيك"} بنجاح!` });
      } catch {
        toast({ title: "خطأ", description: "فشل تحديث الجنس في الحساب", variant: "destructive" });
      }
    } else {
      toast({ title: "تم الحفظ", description: "تم حفظ الإعدادات بنجاح" });
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">الإعدادات</h1>
      </div>

      <div className="space-y-5">
        <motion.div
          className="rounded-2xl p-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Music size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white">الموسيقى</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Label className="text-white">تشغيل الموسيقى الخلفية</Label>
              <Switch checked={musicEnabled} onCheckedChange={setMusicEnabledState} data-testid="switch-music" />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-3 block">مستوى الصوت: {Math.round(musicVolume)}%</Label>
              <Slider
                value={[musicVolume]}
                onValueChange={([v]) => setMusicVolumeState(v!)}
                min={0}
                max={8}
                step={1}
                disabled={!musicEnabled}
                data-testid="slider-music-volume"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl p-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.155 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white font-black text-right">الوضع الخفيف للأجهزة الضعيفة</h2>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-white">تقليل المؤثرات والظل والحركة لتحسين الأداء على الهاتف</Label>
            <Switch checked={performanceMode} onCheckedChange={setPerformanceMode} data-testid="switch-performance-mode" />
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl p-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Phone size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white font-black text-right">تواصل معنا</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={`https://instagram.com/${instagramHandle}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4 text-white transition hover:border-primary/40"
            >
              <span className="font-bold">@{instagramHandle}</span>
              <Instagram size={18} className="text-primary" />
            </a>
            <a
              href={contactPhone ? `https://wa.me/${contactPhone.replace(/\D/g, "")}` : undefined}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4 text-white transition hover:border-primary/40"
            >
              <span className="font-bold">{contactPhone || "سيتم إضافة الرقم قريباً"}</span>
              <Phone size={18} className="text-primary" />
            </a>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl p-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Volume2 size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white">المؤثرات الصوتية</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Label className="text-white">تشغيل مؤثرات الصوت</Label>
              <Switch checked={sfxEnabled} onCheckedChange={setSfxEnabledState} data-testid="switch-sfx" />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-3 block">مستوى المؤثرات: {Math.round(sfxVolume)}%</Label>
              <Slider
                value={[sfxVolume]}
                onValueChange={([v]) => setSfxVolumeState(v!)}
                min={0}
                max={100}
                step={1}
                disabled={!sfxEnabled}
                data-testid="slider-sfx-volume"
              />
            </div>
          </div>
        </motion.div>

        {/* Theme Profile Selection */}
        <motion.div
          className="rounded-2xl p-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Heart size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white">نمط واجهة المتجر</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => setGender("male")}
              className={`relative overflow-hidden rounded-xl p-4 cursor-pointer border-2 transition-all flex flex-col justify-between h-[100px] ${
                gender === "male"
                  ? "border-green-500 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.18)]"
                  : "border-white/10 bg-black/25 hover:border-green-500/40"
              }`}
            >
              <div>
                <p className="text-white font-bold text-xs">جروف ستريت كلاسيك ♂</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Classic Emerald</p>
              </div>
              <span className="text-xs absolute left-3 bottom-3 opacity-20 select-none">🚬</span>
            </div>

            <div
              onClick={() => setGender("female")}
              className={`relative overflow-hidden rounded-xl p-4 cursor-pointer border-2 transition-all flex flex-col justify-between h-[100px] ${
                gender === "female"
                  ? "border-pink-500 bg-pink-500/10 shadow-[0_0_12px_rgba(236,72,153,0.18)]"
                  : "border-white/10 bg-black/25 hover:border-pink-500/40"
              }`}
            >
              <div>
                <p className="text-white font-bold text-xs">كوكب زمردة ♀</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Zomoroda Galaxy</p>
              </div>
              <motion.span
                className="text-xs absolute left-3 bottom-3 opacity-55 select-none"
                animate={{ y: [0, -2, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎀
              </motion.span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl p-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white font-black text-right">تأثيرات الخلفية</h2>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-white">
              {gender === "female" ? "تشغيل فيونكات ونجوم الخلفية وشخصية Grove Girl" : "تشغيل سجائر الخلفية وشخصية GC"}
            </Label>
            <Switch
              checked={backgroundEffects}
              onCheckedChange={setBackgroundEffectsState}
              data-testid="switch-background-effects"
            />
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl p-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Settings size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white font-black text-right">المساعد الذكي GC Assistant</h2>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-white">تشغيل المساعد الذكي لمساعدتك في تصفح وشحن الموقع</Label>
            <Switch
              checked={assistantEnabled}
              onCheckedChange={setAssistantEnabled}
              data-testid="switch-assistant-enabled"
            />
          </div>
        </motion.div>

        {/* Two-Factor Authentication Security Section */}
        {user && (
          <motion.div
            className="rounded-2xl p-6"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-white font-black text-right">أمان الحساب (التحقق بخطوتين 2FA)</h2>
            </div>
            
            {!twoFactorEnabled ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed text-right">
                  قم بحماية حسابك الرقمي في Grove Street بتفعيل طبقة حماية إضافية من Google Authenticator.
                </p>
                
                {!showSetup2FA ? (
                  <Button
                    onClick={handleEnable2FA}
                    disabled={twoFactorLoading}
                    className="w-full bg-primary hover:bg-primary/90 font-bold py-4"
                    data-testid="button-enable-2fa-setup"
                  >
                    {twoFactorLoading ? "جاري الإعداد..." : "تفعيل التحقق بخطوتين (Enable 2FA)"}
                  </Button>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-4 text-right">
                    <p className="text-xs text-white/90 font-bold">1. امسح الرمز المربع بكاميرا تطبيق Authenticator:</p>
                    <div dangerouslySetInnerHTML={{ __html: setupQrCode }} className="bg-white p-3 rounded-2xl mx-auto w-fit shadow-md mb-2" />
                    
                    <p className="text-xs text-white/90 font-bold">2. أو أدخل المفتاح السري يدوياً في التطبيق:</p>
                    <code className="block bg-black/40 text-primary p-2.5 rounded-xl font-mono font-bold tracking-widest text-center text-sm select-all">
                      {setupSecret}
                    </code>
                    
                    <p className="text-xs text-white/90 font-bold">3. أدخل رمز الـ 6 أرقام الناتج للتفعيل:</p>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        maxLength={6}
                        value={setupCode}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSetupCode(e.target.value)}
                        placeholder="123456"
                        className="text-center font-bold tracking-widest text-lg"
                        data-testid="input-setup-otp"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleVerifySetup}
                        disabled={twoFactorLoading}
                        className="flex-1 bg-primary hover:bg-primary/90 font-bold"
                        data-testid="button-verify-setup-otp"
                      >
                        {twoFactorLoading ? "جاري التفعيل..." : "تأكيد وتفعيل"}
                      </Button>
                      <Button
                        onClick={() => setShowSetup2FA(false)}
                        variant="outline"
                        className="font-bold"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-right">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ml-2" />
                  <span className="text-green-500 font-bold">التحقق بخطوتين نشط ومفعّل لحماية حسابك 🔒</span>
                </div>
                
                {user?.role === "admin" || user?.role === "owner" || Boolean(user?.twoFactorRequired) ? (
                  <p className="text-xs text-muted-foreground text-center">
                    التحقق بخطوتين إلزامي لحسابات الإدارة ولا يمكن تعطيله.
                  </p>
                ) : !showDisable2FA ? (
                  <Button
                    onClick={() => setShowDisable2FA(true)}
                    className="w-full bg-red-600/90 hover:bg-red-600 font-bold py-4 text-white"
                    data-testid="button-disable-2fa"
                  >
                    تعطيل التحقق بخطوتين
                  </Button>
                ) : (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-4 text-right">
                    <p className="text-xs text-white/95 font-bold">لتعطيل الحماية، يرجى تأكيد هويتك:</p>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-white/80 mb-1 block">كلمة المرور الحالية</Label>
                        <Input
                          type="password"
                          value={disablePassword}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setDisablePassword(e.target.value)}
                          placeholder="********"
                          className="text-right"
                          data-testid="input-disable-password"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs text-white/80 mb-1 block">رمز التحقق (TOTP)</Label>
                        <Input
                          type="text"
                          maxLength={6}
                          value={disableCode}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setDisableCode(e.target.value)}
                          placeholder="123456"
                          className="text-center font-bold tracking-widest text-lg"
                          data-testid="input-disable-otp"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleDisable2FA}
                        disabled={twoFactorLoading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                        data-testid="button-confirm-disable-2fa"
                      >
                        {twoFactorLoading ? "جاري التعطيل..." : "تأكيد التعطيل"}
                      </Button>
                      <Button
                        onClick={() => setShowDisable2FA(false)}
                        variant="outline"
                        className="font-bold"
                      >
                        تراجع
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Backup Codes Dialog Modal */}
            {showBackupModal && (
              <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-neutral-900 p-6 shadow-2xl space-y-5 text-right">
                  <div className="text-center space-y-2">
                    <ShieldCheck size={40} className="text-primary mx-auto" />
                    <h3 className="text-lg font-bold text-white">أكواد الاحتياط الخاصة بك</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      احتفظ بهذه الأكواد الثمانية في مكان آمن للوصول لحسابك في حال فقدان الهاتف. ستعرض لمرة واحدة فقط!
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1 bg-black/25 rounded-xl border border-white/5">
                    {setupBackupCodes.map((code, idx) => (
                      <code key={idx} className="bg-neutral-800/80 text-center text-white py-2 rounded-lg font-bold text-sm select-all">
                        {code}
                      </code>
                    ))}
                  </div>
                  
                  <Button
                    onClick={() => setShowBackupModal(false)}
                    className="w-full bg-primary hover:bg-primary/90 font-bold py-3"
                    data-testid="button-backup-close"
                  >
                    تم حفظ الأكواد بنجاح
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          className="rounded-2xl p-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Settings size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white">اللغة</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant={language === "ar" ? "default" : "outline"} onClick={() => setLanguage("ar")} data-testid="button-language-ar">
              العربية
            </Button>
            <Button variant={language === "en" ? "default" : "outline"} onClick={() => setLanguage("en")} data-testid="button-language-en">
              English
            </Button>
          </div>
        </motion.div>

        <Button onClick={saveMusicSettings} className="w-full bg-primary hover:bg-primary/90 font-bold py-5" data-testid="button-save-settings">
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}
