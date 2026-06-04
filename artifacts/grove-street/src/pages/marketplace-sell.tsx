import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useListGames, useCreateListing } from "@workspace/api-client-react";
import { getUser } from "@/lib/auth";
import { playSfx } from "@/lib/audio";

const PLATFORM_OPTIONS = ["Free Fire", "PUBG", "Fortnite", "Roblox", "Steam", "Epic Games", "PlayStation", "Xbox", "Mobile Legends", "Call of Duty", "Clash", "Other"];

function parseImageUrls(value: string) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {}
  if (value.startsWith("data:image/")) return [value];
  return value.split(/\n|\|\|\|/).map((item) => item.trim()).filter(Boolean);
}

function hasContactLeak(value: string) {
  return /(?:whatsapp|واتساب|telegram|تيليجرام|insta|instagram|انستغرام|wa\.me|t\.me|@|https?:\/\/|www\.|\+?\d[\d\s().-]{7,}\d)/i.test(value);
}

export default function MarketplaceSellPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = getUser();

  const { data: gamesData } = useListGames();
  const createListingMutation = useCreateListing();
  const games = gamesData ?? [];

  const [form, setForm] = useState({ gameId: "", platform: "Free Fire", customPlatform: "", title: "", description: "", price: "", rank: "", level: "", region: "", imageUrls: "", specs: "", sellerNotes: "", linkedEmail: "", transferable: "", restrictions: "" });
  const [sensitive, setSensitive] = useState({ primaryEmail: "", primaryPassword: "", recoveryEmail: "", recoveryPassword: "", recoveryCode: "", username: "", password: "", backupCodes: "", securityNotes: "" });

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSensitiveChange(field: string, value: string) {
    setSensitive(prev => ({ ...prev, [field]: value }));
  }

  function handleImages(files?: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 8);
    if (selected.some(file => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) {
      toast({ title: "صور غير صالحة", description: "ارفع صور فقط وبحجم لا يتجاوز 10MB للصورة.", variant: "destructive" });
      return;
    }
    Promise.all(selected.map(file => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    }))).then(images => handleChange("imageUrls", JSON.stringify(images.filter(Boolean))));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setLocation("/login"); return; }
    const publicText = `${form.title}\n${form.description}\n${form.specs}\n${form.sellerNotes}`;
    if (!form.title || !form.price || (form.platform === "Other" && !form.customPlatform.trim())) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (Number(form.price) <= 0) {
      toast({ title: "سعر غير صحيح", description: "السعر يجب أن يكون أكبر من صفر.", variant: "destructive" });
      return;
    }
    if (hasContactLeak(publicText)) {
      toast({ title: "وسائل التواصل ممنوعة", description: "التواصل والوساطة تتم عبر Grove Street فقط. احذف رقم الهاتف أو الروابط أو @ من الإعلان.", variant: "destructive" });
      return;
    }
    try {
      await createListingMutation.mutateAsync({
        data: {
          gameId: form.gameId ? parseInt(form.gameId) : 0,
          platform: form.platform === "Other" ? form.customPlatform : form.platform,
          title: form.title,
          description: [form.description, form.specs].filter(Boolean).join("\n\n"),
          price: parseFloat(form.price),
          rank: form.rank || undefined,
          level: form.level ? parseInt(form.level) : undefined,
          region: form.region || undefined,
          imageUrls: form.imageUrls,
          sellerNotes: form.sellerNotes,
          sensitiveData: {
            ...sensitive,
            linkedEmail: form.linkedEmail,
            transferable: form.transferable,
            restrictions: form.restrictions,
            devOnlyNote: "Stored in local mock/dev store only. Never expose in public APIs.",
          },
        } as any,
      });
      playSfx("account_submitted");
      toast({ title: "تم الإرسال", description: "سيتم مراجعة إعلانك وإضافته قريباً" });
      setLocation("/marketplace");
    } catch {
      toast({ title: "خطأ", description: "فشل إرسال الإعلان", variant: "destructive" });
    }
  }

  if (!user) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-white text-lg mb-4">يجب تسجيل الدخول لبيع حسابك</p>
        <Button onClick={() => setLocation("/login")} className="bg-primary">تسجيل الدخول</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => setLocation("/marketplace")} className="flex items-center gap-2 text-muted-foreground hover:text-white mb-6" data-testid="button-back">
        <ArrowRight size={18} />
        <span>سوق الحسابات</span>
      </button>
      <h1 className="text-3xl font-black text-white mb-8">بيع حسابك</h1>

      <motion.div className="rounded-2xl p-8" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-white mb-1.5 block">اللعبة أو المنصة *</Label>
            <Select value={form.gameId} onValueChange={v => handleChange("gameId", v)}>
              <SelectTrigger data-testid="select-game">
                <SelectValue placeholder="اختر اللعبة" />
              </SelectTrigger>
              <SelectContent>
                {games.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.nameAr}</SelectItem>)}
                {games.length === 0 && [
                  { id: 1, nameAr: "فري فاير" }, { id: 2, nameAr: "ببجي موبايل" }, { id: 3, nameAr: "روبلوكس" }
                ].map(g => <SelectItem key={g.id} value={String(g.id)}>{g.nameAr}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-white mb-1.5 block">نوع الحساب *</Label>
              <Select value={form.platform} onValueChange={v => handleChange("platform", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORM_OPTIONS.map(platform => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.platform === "Other" && (
              <div>
                <Label className="text-white mb-1.5 block">اسم مخصص</Label>
                <Input value={form.customPlatform} onChange={e => handleChange("customPlatform", e.target.value)} className="text-right" />
              </div>
            )}
          </div>
          <div>
            <Label className="text-white mb-1.5 block">عنوان الإعلان *</Label>
            <Input value={form.title} onChange={e => handleChange("title", e.target.value)} placeholder="مثال: حساب فري فاير ديموند مميز" className="text-right" data-testid="input-title" />
          </div>
          <div>
            <Label className="text-white mb-1.5 block">الوصف</Label>
            <Textarea value={form.description} onChange={e => handleChange("description", e.target.value)} placeholder="وصف الحساب، محتوياته، مميزاته..." className="text-right min-h-24" data-testid="input-description" />
          </div>
          <div>
            <Label className="text-white mb-1.5 block">المواصفات الإضافية</Label>
            <Textarea value={form.specs} onChange={e => handleChange("specs", e.target.value)} placeholder="السكنات، العناصر، الشخصيات، الإنجازات..." className="text-right min-h-24" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white mb-1.5 block">السعر (د.أ) *</Label>
              <Input type="number" min="1" value={form.price} onChange={e => handleChange("price", e.target.value)} placeholder="0" className="text-right" data-testid="input-price" />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">المستوى</Label>
              <Input type="number" value={form.level} onChange={e => handleChange("level", e.target.value)} placeholder="80" className="text-right" data-testid="input-level" />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">الرتبة</Label>
              <Input value={form.rank} onChange={e => handleChange("rank", e.target.value)} placeholder="Diamond" className="text-right" data-testid="input-rank" />
            </div>
            <div>
              <Label className="text-white mb-1.5 block">المنطقة</Label>
              <Input value={form.region} onChange={e => handleChange("region", e.target.value)} placeholder="الأردن" className="text-right" data-testid="input-region" />
            </div>
          </div>
          <div>
            <Label className="text-white mb-1.5 block">صور الحساب</Label>
            <Input type="file" accept="image/*" multiple onChange={e => handleImages(e.target.files)} />
            {form.imageUrls && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {parseImageUrls(form.imageUrls).slice(0, 6).map((src, index) => <img key={index} src={src} alt="" className="h-24 w-full rounded-xl object-cover" />)}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="font-black text-amber-300">عمولة الوساطة: 5 دنانير أردني</p>
            <p className="mt-1 text-xs leading-6 text-white/70">الإعلان لا ينشر مباشرة. الإدارة تراجع الحساب وتؤمن عملية البيع بين البائع والمشتري. يمنع وضع أي رقم هاتف أو واتساب أو إنستغرام أو رابط تواصل داخل الإعلان.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h2 className="mb-3 text-lg font-black text-white">بيانات ملكية الحساب للأدمن فقط</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Input value={sensitive.primaryEmail} onChange={e => handleSensitiveChange("primaryEmail", e.target.value)} placeholder="البريد الأساسي" className="text-right" />
              <Input value={sensitive.primaryPassword} onChange={e => handleSensitiveChange("primaryPassword", e.target.value)} placeholder="كلمة سر البريد الأساسي" className="text-right" type="password" />
              <Input value={sensitive.recoveryEmail} onChange={e => handleSensitiveChange("recoveryEmail", e.target.value)} placeholder="بريد الاستعادة إن وجد" className="text-right" />
              <Input value={sensitive.recoveryPassword} onChange={e => handleSensitiveChange("recoveryPassword", e.target.value)} placeholder="كلمة سر بريد الاستعادة إن وجد" className="text-right" type="password" />
              <Input value={sensitive.username} onChange={e => handleSensitiveChange("username", e.target.value)} placeholder="اسم المستخدم أو البريد للمنصة" className="text-right" />
              <Input value={sensitive.password} onChange={e => handleSensitiveChange("password", e.target.value)} placeholder="كلمة سر المنصة" className="text-right" type="password" />
            </div>
            <Textarea value={sensitive.recoveryCode} onChange={e => handleSensitiveChange("recoveryCode", e.target.value)} placeholder="كود الاستعادة أو Backup Codes إن وجدت" className="mt-4 text-right" />
            <Textarea value={sensitive.securityNotes} onChange={e => handleSensitiveChange("securityNotes", e.target.value)} placeholder="ملاحظات الدخول أو الحماية" className="mt-4 text-right" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Input value={form.linkedEmail} onChange={e => handleChange("linkedEmail", e.target.value)} placeholder="هل الحساب مربوط ببريد؟" className="text-right" />
            <Input value={form.transferable} onChange={e => handleChange("transferable", e.target.value)} placeholder="هل قابل للنقل؟" className="text-right" />
            <Input value={form.restrictions} onChange={e => handleChange("restrictions", e.target.value)} placeholder="قيود أو حظر سابق؟" className="text-right" />
          </div>
          <div>
            <Label className="text-white mb-1.5 block">ملاحظات للبائع</Label>
            <Textarea value={form.sellerNotes} onChange={e => handleChange("sellerNotes", e.target.value)} placeholder="ملاحظات لا تحتوي على وسائل تواصل" className="text-right min-h-20" />
          </div>
          <div className="rounded-xl p-4" style={{ background: "hsl(142 70% 35% / 0.08)", border: "1px solid hsl(142 70% 35% / 0.2)" }}>
            <p className="text-sm text-white/80">سيتم مراجعة إعلانك من قِبل الإدارة خلال 24 ساعة قبل النشر</p>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold py-5" disabled={createListingMutation.isPending} data-testid="button-submit-listing">
            {createListingMutation.isPending ? "جارٍ الإرسال..." : "إرسال الإعلان"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

