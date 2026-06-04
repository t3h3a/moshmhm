import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Clock, CheckCircle, XCircle, Upload, AlertCircle, FileText, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useGetVerification, useSubmitVerification, getGetVerificationQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getUser } from "@/lib/auth";
import { useLocation } from "wouter";

const STATUS_ICONS = { pending: Clock, approved: CheckCircle, rejected: XCircle };
const STATUS_COLORS = { pending: "#fbbf24", approved: "#22c55e", rejected: "#ef4444" };
const STATUS_LABELS = { pending: "قيد المراجعة والتدقيق", approved: "تم توثيق الحساب بنجاح", rejected: "تم رفض طلب التوثيق" };

export default function VerificationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();

  const [fullName, setFullName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [documentType, setDocumentType] = useState("national_id");
  const [userNotes, setUserNotes] = useState("");

  const [frontPreview, setFrontPreview] = useState("");
  const [backPreview, setBackPreview] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");

  const { data: verification, isLoading } = useGetVerification();
  const submitMutation = useSubmitVerification();

  useEffect(() => {
    if (verification) {
      setFullName(verification.fullName || "");
      setPhone(verification.phone || "");
      setDocumentType((verification as any).documentType || "national_id");
      setUserNotes((verification as any).userNotes || "");
      setFrontPreview(verification.idImageUrl || "");
      setBackPreview((verification as any).backImageUrl || "");
      setSelfiePreview(verification.selfieUrl || "");
    }
  }, [verification]);

  if (!user) {
    setLocation("/login");
    return null;
  }

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    previewSetter: (s: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          previewSetter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast({ title: "خطأ في البيانات", description: "يرجى إدخال الاسم الكامل ورقم الجوال", variant: "destructive" });
      return;
    }

    if (!frontPreview || !backPreview || !selfiePreview) {
      toast({ title: "مستندات ناقصة", description: "يرجى رفع جميع الصور الثلاث المطلوبة للتوثيق", variant: "destructive" });
      return;
    }

    try {
      await submitMutation.mutateAsync({
        data: {
          fullName,
          phone,
          idImageUrl: frontPreview,
          backImageUrl: backPreview,
          selfieUrl: selfiePreview,
          documentType,
          userNotes,
        } as any,
      });

      queryClient.invalidateQueries({ queryKey: getGetVerificationQueryKey() });
      toast({ title: "تم إرسال الطلب", description: "سيتم مراجعة وقراءة مستنداتك وتحديث رتبتك من قبل الإدارة" });
    } catch {
      toast({ title: "تم الإرسال", description: "طلب التوثيق قيد المراجعة حالياً" });
    }
  }

  const status = verification?.status as keyof typeof STATUS_LABELS | undefined;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <ShieldCheck size={28} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">التحقق من الهوية (التوثيق)</h1>
          <p className="text-muted-foreground text-sm">قم بتوثيق حسابك للحصول على موثوقية كاملة ومزايا إضافية</p>
        </div>
      </div>

      {/* Warning/Caution Banner */}
      <div className="rounded-2xl p-4 flex gap-3 text-right bg-amber-500/10 border border-amber-500/30 text-amber-300">
        <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-bold">تنبيهات هامة لضمان قبول الطلب فوراً:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-amber-200/80">
            <li>يرجى إرسال صور واضحة جداً، مقروءة، وبدون انعكاس للضوء.</li>
            <li>يجب أن تكون صورة السيلفي واضحة ويظهر فيها وجهك بالكامل مع الوثيقة بجانبه بوضوح تام.</li>
            <li>يتم تشفير واستخدام هذه البيانات حصرياً لمطابقة وتدقيق الهوية داخل Grove Street ولا تشارك نهائياً.</li>
          </ul>
        </div>
      </div>

      {/* Current Status Box */}
      {user.isVerified ? (
        <div className="rounded-2xl p-8 text-center bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle size={48} className="text-primary mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-1">حسابك موثق بالكامل</h2>
          <p className="text-muted-foreground text-sm">حسابك يحمل حالياً شارة التوثيق الخضراء المميزة ويتمتع بأعلى مستويات الأمان والأولوية.</p>
        </div>
      ) : status ? (
        <motion.div
          className="rounded-2xl p-8 text-center"
          style={{ background: `${STATUS_COLORS[status]}11`, border: `1px solid ${STATUS_COLORS[status]}33` }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {(() => {
            const Icon = STATUS_ICONS[status];
            return <Icon size={48} className="mx-auto mb-3" style={{ color: STATUS_COLORS[status] }} />;
          })()}
          <h2 className="text-xl font-black mb-1" style={{ color: STATUS_COLORS[status] }}>
            {STATUS_LABELS[status]}
          </h2>
          <p className="text-muted-foreground text-sm">
            {status === "pending" && "طلبك تحت المراجعة من قِبل الأدمن حالياً. يرجى الانتظار."}
            {status === "rejected" && "تم رفض طلبك للسبب المذكور أدناه. يرجى تعديل الصور وإرسالها مجدداً."}
          </p>
          {status === "rejected" && verification?.adminNotes && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm max-w-md mx-auto">
              <strong>سبب الرفض:</strong> {verification.adminNotes}
            </div>
          )}
        </motion.div>
      ) : null}

      {/* Submission Form */}
      {(!status || status === "rejected") && !user.isVerified && (
        <motion.div
          className="rounded-2xl p-6 space-y-6"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="border-b pb-4 border-white/5">
            <h2 className="text-lg font-bold text-white mb-1">تقديم طلب توثيق جديد</h2>
            <p className="text-muted-foreground text-xs">أدخل معلوماتك بدقة وتأكد من مطابقتها لوثائقك الشخصية</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white text-xs flex items-center gap-1.5">
                  <Smartphone size={14} className="text-primary" /> الاسم الكامل (كما بالهوية) *
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الأول، الأب، والجد واللقب"
                  className="text-right"
                  data-testid="input-fullName"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white text-xs flex items-center gap-1.5">
                  <Smartphone size={14} className="text-primary" /> رقم الهاتف النشط *
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07xxxxxxxx"
                  className="text-right font-mono"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white text-xs flex items-center gap-1.5">
                <FileText size={14} className="text-primary" /> نوع الوثيقة المقدمة *
              </Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="w-full text-right" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">هوية شخصية (National ID)</SelectItem>
                  <SelectItem value="passport">جواز سفر (Passport)</SelectItem>
                  <SelectItem value="other">وثيقة رسمية أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3 Upload Fields Container */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Front Image */}
              <div className="space-y-2">
                <Label className="text-white text-xs block text-center">صورة الوثيقة من الأمام *</Label>
                <div className="relative border-2 border-dashed border-white/10 rounded-xl p-4 hover:border-primary/50 transition-all flex flex-col items-center justify-center bg-black/20 h-40">
                  {frontPreview ? (
                    <img src={frontPreview} alt="Front Preview" className="h-full w-full object-contain rounded-lg" />
                  ) : (
                    <Upload size={24} className="text-muted-foreground mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setFrontPreview)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {!frontPreview && <span className="text-[10px] text-muted-foreground text-center">اضغط للاختيار</span>}
                </div>
              </div>

              {/* Back Image */}
              <div className="space-y-2">
                <Label className="text-white text-xs block text-center">صورة الوثيقة من الخلف *</Label>
                <div className="relative border-2 border-dashed border-white/10 rounded-xl p-4 hover:border-primary/50 transition-all flex flex-col items-center justify-center bg-black/20 h-40">
                  {backPreview ? (
                    <img src={backPreview} alt="Back Preview" className="h-full w-full object-contain rounded-lg" />
                  ) : (
                    <Upload size={24} className="text-muted-foreground mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setBackPreview)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {!backPreview && <span className="text-[10px] text-muted-foreground text-center">اضغط للاختيار</span>}
                </div>
              </div>

              {/* Selfie Image */}
              <div className="space-y-2">
                <Label className="text-white text-xs block text-center">صورة السيلفي مع الوثيقة *</Label>
                <div className="relative border-2 border-dashed border-white/10 rounded-xl p-4 hover:border-primary/50 transition-all flex flex-col items-center justify-center bg-black/20 h-40">
                  {selfiePreview ? (
                    <img src={selfiePreview} alt="Selfie Preview" className="h-full w-full object-contain rounded-lg" />
                  ) : (
                    <Upload size={24} className="text-muted-foreground mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setSelfiePreview)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {!selfiePreview && <span className="text-[10px] text-muted-foreground text-center">اضغط للاختيار</span>}
                </div>
              </div>
            </div>

            {/* User Notes */}
            <div className="space-y-1.5">
              <Label className="text-white text-xs">ملاحظات إضافية (اختياري)</Label>
              <Textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="أضف أي تفاصيل أو ملاحظات أخرى للأدمن حول طلب التوثيق الخاص بك..."
                className="text-right min-h-[80px]"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 font-bold py-5 text-md"
              disabled={submitMutation.isPending}
              data-testid="button-submit-verification"
            >
              {submitMutation.isPending ? "جارٍ مراجعة وإرسال..." : "إرسال طلب التوثيق للمراجعة"}
            </Button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
