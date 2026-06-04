import { useEffect, useMemo, useState } from "react";
import { Crown, RotateCw, Save, Search, Sparkles, Users, Wallet } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { isAdmin } from "@/lib/auth";
import { useListUsers } from "@workspace/api-client-react";
import {
  DEFAULT_FORTUNE_USER_CONFIG,
  FORTUNE_AUTO_PRIZE,
  FORTUNE_PRIZES,
  fetchFortuneGlobalConfig,
  fetchFortuneUserConfig,
  getAvailableBonusSpins,
  getFortuneGlobalConfig,
  getFortuneUserKey,
  persistFortuneGlobalConfig,
  persistFortuneUserConfig,
  type FortuneGlobalConfig,
  type FortuneUserConfig,
} from "@/lib/fortuneWheel";

function clampLuck(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function PrizeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 bg-black/25 text-right" dir="rtl">
        <SelectValue />
      </SelectTrigger>
      <SelectContent dir="rtl">
        <SelectItem value={FORTUNE_AUTO_PRIZE}>تلقائي حسب نسبة الحظ</SelectItem>
        {FORTUNE_PRIZES.map(prize => (
          <SelectItem key={prize.id} value={prize.id}>
            {prize.labelAr} - {prize.detailAr}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AdminFortuneWheelPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const { data: users = [] } = useListUsers();
  const [config, setConfig] = useState<FortuneGlobalConfig>(() => getFortuneGlobalConfig());
  const [grantAmount, setGrantAmount] = useState("1");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const selectedUser = users.find((user: any) => String(user.id) === selectedUserId) as any | undefined;
  const selectedUserKey = selectedUser ? getFortuneUserKey(selectedUser) : "";
  const [userConfig, setUserConfig] = useState<FortuneUserConfig>(DEFAULT_FORTUNE_USER_CONFIG);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user: any) =>
      String(user.id).includes(query) ||
      user.name?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  }, [search, users]);

  useEffect(() => {
    fetchFortuneGlobalConfig().then(setConfig);
  }, []);

  async function saveGlobal(nextConfig = config) {
    setConfig(await persistFortuneGlobalConfig(nextConfig));
    toast({ title: "تم الحفظ", description: "تم تحديث إعدادات دولاب الحظ العامة." });
  }

  async function grantAllSpins() {
    const amount = Math.max(0, parseInt(grantAmount, 10) || 0);
    if (amount <= 0) {
      toast({ title: "قيمة غير صحيحة", description: "اكتب عدد لفات أكبر من صفر.", variant: "destructive" });
      return;
    }
    const nextConfig = {
      ...config,
      globalSpinGrants: config.globalSpinGrants + amount,
      updatedAt: Date.now(),
    };
    await saveGlobal(nextConfig);
    toast({ title: "تمت الإضافة", description: `تمت إضافة ${amount} لفة لكل المستخدمين.` });
  }

  async function reduceAllSpins(amount: number) {
    const nextValue = Math.max(0, Number(config.globalSpinGrants || 0) - amount);
    const nextConfig = {
      ...config,
      globalSpinGrants: nextValue,
      updatedAt: Date.now(),
    };
    await saveGlobal(nextConfig);
    toast({ title: amount >= 999999 ? "تم تصفير لفات الحدث" : "تم سحب لفة", description: "تم تحديث رصيد اللفات العامة لكل المستخدمين." });
  }

  async function openUser(user: any) {
    const key = getFortuneUserKey(user);
    setSelectedUserId(String(user.id));
    setUserConfig(await fetchFortuneUserConfig(key));
  }

  async function saveUserConfig() {
    if (!selectedUserKey) return;
    setUserConfig(await persistFortuneUserConfig(selectedUserKey, userConfig));
    toast({ title: "تم حفظ المستخدم", description: "تم تحديث تحكم الدولاب لهذا المستخدم." });
  }

  async function resetUserConfig() {
    if (!selectedUserKey) return;
    setUserConfig(await persistFortuneUserConfig(selectedUserKey, DEFAULT_FORTUNE_USER_CONFIG));
    toast({ title: "تمت إعادة الضبط", description: "تمت إعادة إعدادات المستخدم للوضع العام." });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6" dir="rtl">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2">
            <Crown size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">تحكم الدولاب</h1>
            <p className="text-sm text-muted-foreground">نسبة الحظ، اللفات، والجائزة القادمة للمستخدمين.</p>
          </div>
        </div>
        <Button onClick={() => saveGlobal()} className="font-black">
          <Save size={16} />
          حفظ الإعدادات العامة
        </Button>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <h2 className="text-lg font-black text-white">الإعدادات العامة لكل المستخدمين</h2>
          </div>

          <div className="grid gap-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-white">نسبة الحظ العامة</Label>
                <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-black text-primary">{config.globalLuck}%</span>
              </div>
              <Slider
                value={[config.globalLuck]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => setConfig(prev => ({ ...prev, globalLuck: clampLuck(value) }))}
              />
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                <span>0%: حظ أوفر للجميع</span>
                <span>1-79%: نقاط ورتب ولفات</span>
                <span>80-100%: جوائز الرصيد</span>
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-white">جائزة ثابتة لكل الناس</Label>
              <PrizeSelect value={config.forcedPrizeId} onChange={value => setConfig(prev => ({ ...prev, forcedPrizeId: value }))} />
              <p className="mt-2 text-xs text-muted-foreground">إذا اخترت جائزة هنا ستتجاهل نسبة الحظ لكل المستخدمين حتى تعيدها للوضع التلقائي.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <Label className="mb-2 block text-white">إضافة لفات لكل المستخدمين</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={grantAmount}
                  onChange={event => setGrantAmount(event.target.value)}
                  className="text-right"
                />
                <Button onClick={grantAllSpins} className="shrink-0 font-bold">
                  <RotateCw size={16} />
                  إضافة
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => reduceAllSpins(1)} className="font-bold">
                  سحب لفة واحدة من الجميع
                </Button>
                <Button type="button" variant="destructive" onClick={() => reduceAllSpins(999999)} className="font-bold">
                  تصفير لفات الحدث
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">إجمالي اللفات العامة المضافة حتى الآن: {config.globalSpinGrants}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wallet size={18} className="text-primary" />
            <h2 className="text-lg font-black text-white">سياسة الجوائز</h2>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>إذا كانت النسبة 0% فالنتيجة حظ أوفر دائماً.</p>
            <p>إذا كانت من 1 إلى 79 تظهر جوائز النقاط والرتب واللفات بدون جوائز الرصيد.</p>
            <p>إذا كانت 80 أو أكثر تظهر جوائز الرصيد: دينار، 5 دنانير، 10 دنانير.</p>
            <p>إذا كانت 100% تظهر أفضل جائزة: رصيد 10 دنانير.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h2 className="text-lg font-black text-white">اختيار مستخدم</h2>
          </div>
          <div className="relative mb-3">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="ابحث بالاسم أو ID أو البريد"
              className="pr-9 text-right"
            />
          </div>
          <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
            {filteredUsers.map((user: any) => (
              <button
                key={user.id}
                onClick={() => openUser(user)}
                className={`w-full rounded-xl border p-3 text-right transition ${
                  selectedUserId === String(user.id)
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/10 bg-black/15 hover:bg-white/5"
                }`}
              >
                <p className="font-bold text-white">{user.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">@{user.username} - ID #{user.id}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {selectedUser ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                <h2 className="text-xl font-black text-white">{selectedUser.name}</h2>
                <p className="text-xs text-muted-foreground">تحكم خاص في لفات ونسبة حظ هذا المستخدم.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-white">لفات إضافية للمستخدم</Label>
                  <Input
                    type="number"
                    min={0}
                    value={userConfig.extraSpins}
                    onChange={event => setUserConfig(prev => ({ ...prev, extraSpins: Math.max(0, parseInt(event.target.value, 10) || 0) }))}
                    className="text-right"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    المتاح فعلياً مع اللفات العامة: {getAvailableBonusSpins(config, userConfig)}
                  </p>
                </div>

                <div>
                  <Label className="mb-2 block text-white">نسبة حظ خاصة</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder={`فارغ = العام (${config.globalLuck}%)`}
                    value={userConfig.luckOverride ?? ""}
                    onChange={event => {
                      const raw = event.target.value;
                      setUserConfig(prev => ({ ...prev, luckOverride: raw === "" ? null : clampLuck(Number(raw)) }));
                    }}
                    className="text-right"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-white">الجائزة القادمة لهذا المستخدم</Label>
                <PrizeSelect value={userConfig.forcedPrizeId} onChange={value => setUserConfig(prev => ({ ...prev, forcedPrizeId: value }))} />
                <p className="mt-2 text-xs text-muted-foreground">هذه الجائزة تستخدم للفة القادمة فقط ثم تعود تلقائياً للوضع العادي.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={saveUserConfig} className="font-black">
                  <Save size={16} />
                  حفظ تحكم المستخدم
                </Button>
                <Button variant="outline" onClick={resetUserConfig} className="font-bold">
                  إعادة ضبط المستخدم
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-muted-foreground">
              اختر مستخدم من القائمة للتحكم بلفاته وحظه والجائزة القادمة.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
