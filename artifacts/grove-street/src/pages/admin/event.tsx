import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Eraser, ImagePlus, Radio, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { isAdmin } from "@/lib/auth";
import { customFetch } from "@workspace/api-client-react";
import {
  clearCurrentAnnouncement,
  disableCurrentAnnouncement,
  fetchAnnouncementHistory,
  getAnnouncementHistory,
  publishAnnouncement,
  type AnnouncementDuration,
  type AnnouncementType,
  type SiteAnnouncement,
} from "@/lib/announcements";

const TYPE_LABELS: Record<AnnouncementType, string> = {
  general: "عام",
  offer: "عرض",
  warning: "تنبيه",
  celebration: "احتفال",
  info: "معلومة",
};

const DURATION_LABELS: Record<AnnouncementDuration, string> = {
  "10s": "10 ثواني",
  "30s": "30 ثانية",
  "60s": "دقيقة",
  manual: "حتى يغلقه المستخدم",
};

export default function AdminEventPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [type, setType] = useState<AnnouncementType>("general");
  const [duration, setDuration] = useState<AnnouncementDuration>("30s");
  const [history, setHistory] = useState<SiteAnnouncement[]>(() => getAnnouncementHistory());
  const [ticker, setTicker] = useState({ text: "", isActive: false, audience: "all", durationMinutes: 0, imageUrl: "", textColor: "#d1fae5", deviceTarget: "all" });
  const charCount = message.length;

  useEffect(() => {
    fetchAnnouncementHistory().then(setHistory);
    customFetch<any>("/api/ticker", { responseType: "json" }).then((data) => {
      if (data) setTicker((prev) => ({ ...prev, ...data }));
    }).catch(() => {});
  }, []);

  async function sendAnnouncement() {
    const cleanMessage = message.trim();
    if (!cleanMessage) {
      toast({ title: "اكتب رسالة", description: "لا يمكن إرسال إعلان فارغ.", variant: "destructive" });
      return;
    }

    try {
      await publishAnnouncement({ message: cleanMessage, type, duration });
      setHistory(await fetchAnnouncementHistory());
      toast({ title: "تم إرسال الإعلان", description: "سيظهر الإعلان للمستخدمين داخل الموقع." });
    } catch (error: any) {
      toast({ title: "تعذر إرسال الإعلان", description: error?.data?.error ?? "تحقق من تسجيل دخول الأدمن ثم حاول مرة أخرى.", variant: "destructive" });
    }
  }

  function handleTickerImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "ملف غير مدعوم", description: "الصورة فقط مسموحة للشريط.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "الصورة كبيرة", description: "الحد الأقصى 10MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setTicker((prev) => ({ ...prev, imageUrl: String(reader.result || prev.imageUrl) }));
    reader.readAsDataURL(file);
  }

  async function clearAnnouncement() {
    clearCurrentAnnouncement();
    await disableCurrentAnnouncement();
    setHistory(await fetchAnnouncementHistory());
    toast({ title: "تم مسح الإعلان", description: "تم تعطيل الإعلان الحالي." });
  }

  async function saveTicker() {
    try {
      const saved = await customFetch<any>("/api/ticker", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ticker),
        responseType: "json",
      });
      setTicker((prev) => ({ ...prev, ...saved }));
      toast({ title: "تم حفظ الشريط", description: "سيظهر النص في شريط الصفحة الرئيسية عند تفعيله." });
    } catch (error: any) {
      toast({ title: "تعذر حفظ الشريط", description: error?.data?.error ?? "تحقق من تسجيل الدخول.", variant: "destructive" });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6" dir="rtl">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2">
            <Radio size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">إعلان مباشر</h1>
            <p className="text-sm text-muted-foreground">أرسل رسالة فورية تظهر فوق كل صفحات الموقع.</p>
          </div>
        </div>
        <Button variant="outline" onClick={clearAnnouncement} className="font-bold">
          <Trash2 size={16} />
          مسح الإعلان الحالي
        </Button>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-white">نص الإعلان</Label>
                <span className="text-xs text-muted-foreground">{charCount} حرف</span>
              </div>
              <Textarea
                value={message}
                onChange={event => setMessage(event.target.value.slice(0, 500))}
                placeholder="اكتب الإعلان هنا... مثال: عرض جديد نزل الآن"
                className="min-h-40 resize-none text-right leading-7"
                dir="auto"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-2 block text-white">نوع الإعلان</Label>
                <Select value={type} onValueChange={value => setType(value as AnnouncementType)}>
                  <SelectTrigger className="bg-black/25 text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-white">مدة الظهور</Label>
                <Select value={duration} onValueChange={value => setDuration(value as AnnouncementDuration)}>
                  <SelectTrigger className="bg-black/25 text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {Object.entries(DURATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={sendAnnouncement} className="font-black">
                <Send size={16} />
                إرسال الإعلان
              </Button>
              <Button variant="ghost" onClick={() => setMessage("")} className="font-bold">
                <Eraser size={16} />
                تفريغ النص
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-lg font-black text-white">معاينة مباشرة</h2>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{DURATION_LABELS[duration]}</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{TYPE_LABELS[type]}</span>
              </div>
              <p className="min-h-20 whitespace-pre-wrap break-words text-sm font-bold leading-7 text-white" dir="auto">
                {message.trim() || "ستظهر المعاينة هنا أثناء الكتابة."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-lg font-black text-white">آخر 10 إعلانات</h2>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {history.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-muted-foreground">لا يوجد سجل بعد.</p>
              ) : history.map(item => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleString("ar-JO")}</span>
                    <span className="text-xs font-bold text-primary">{TYPE_LABELS[item.type]}</span>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-white" dir="auto">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-xl font-black text-white">الشريط المتحرك Ticker</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="mb-2 block text-white">نص الشريط</Label>
            <Textarea
              value={ticker.text}
              onChange={(event) => setTicker((prev) => ({ ...prev, text: event.target.value.slice(0, 300) }))}
              placeholder="أهلا بكم في Grove Street، عروض قوية اليوم"
              className="min-h-24 text-right"
              dir="auto"
            />
          </div>
          <div>
            <Label className="mb-2 block text-white">الحالة</Label>
            <Select value={ticker.isActive ? "true" : "false"} onValueChange={(value) => setTicker((prev) => ({ ...prev, isActive: value === "true" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">فعال</SelectItem>
                <SelectItem value="false">متوقف</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-white">الجمهور</Label>
            <Select value={ticker.audience} onValueChange={(audience) => setTicker((prev) => ({ ...prev, audience }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="users">المسجلون فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block text-white">مدة الظهور بالدقائق</Label>
            <Textarea
              value={String(ticker.durationMinutes)}
              onChange={(event) => setTicker((prev) => ({ ...prev, durationMinutes: Math.max(0, Number(event.target.value) || 0) }))}
              className="min-h-10 text-right"
            />
          </div>
          <div>
            <Label className="mb-2 block text-white">صورة الشريط</Label>
            <div className="mb-4">
              <Label className="mb-2 block text-white">لون خط الشريط</Label>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2">
                <input
                  type="color"
                  value={ticker.textColor}
                  onChange={(event) => setTicker((prev) => ({ ...prev, textColor: event.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded border-0 bg-transparent"
                />
                <span className="font-mono text-sm text-white" dir="ltr">{ticker.textColor}</span>
              </div>
            </div>
            <div className="mb-4">
              <Label className="mb-2 block text-white">الظهور على الجهاز</Label>
              <Select value={ticker.deviceTarget} onValueChange={(deviceTarget) => setTicker((prev) => ({ ...prev, deviceTarget }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="mobile">الهاتف فقط</SelectItem>
                  <SelectItem value="desktop">الحاسوب فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={ticker.imageUrl}
              onChange={(event) => setTicker((prev) => ({ ...prev, imageUrl: event.target.value }))}
              className="min-h-10 text-right"
              dir="ltr"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm font-bold text-white hover:bg-white/5">
                <ImagePlus size={16} />
                رفع صورة
                <input type="file" accept="image/*" className="hidden" onChange={(event) => handleTickerImage(event.target.files?.[0])} />
              </label>
              {ticker.imageUrl && <img src={ticker.imageUrl} alt="" className="h-12 w-12 rounded-full border border-primary/30 object-cover" />}
            </div>
          </div>
          <Button onClick={saveTicker} className="bg-primary font-black hover:bg-primary/90">حفظ الشريط</Button>
        </div>
      </section>
    </div>
  );
}
