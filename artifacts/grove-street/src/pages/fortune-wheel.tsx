import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Crown, Gift, RotateCw, Sparkles, Star, Trophy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { customFetch } from "@workspace/api-client-react";
import { clearUser, getUser, isAdmin, setUser } from "@/lib/auth";
import { playSfx } from "@/lib/audio";
import {
  choosePrizeByLuck,
  clearForcedUserPrize,
  consumeBonusSpin,
  fetchFortuneState,
  FORTUNE_LAST_RESULT_PREFIX,
  FORTUNE_LAST_SPIN_PREFIX,
  FORTUNE_PRIZES,
  getAvailableBonusSpins,
  getFortuneGlobalConfig,
  getFortuneUserConfig,
  getFortuneUserKey,
  grantExtraSpinFromPrize,
  saveFortuneUserConfig,
  type FortunePrize,
} from "@/lib/fortuneWheel";

const SPIN_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

const ICONS: Record<FortunePrize["iconKey"], LucideIcon> = {
  sparkles: Sparkles,
  wallet: Wallet,
  star: Star,
  trophy: Trophy,
  crown: Crown,
  rotate: RotateCw,
};

function formatRemaining(ms: number) {
  if (ms <= 0) return "جاهز الآن";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((ms / (60 * 1000)) % 60);
  if (days > 0) return `${days} يوم و ${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`;
  return `${Math.max(1, minutes)} دقيقة`;
}

function shouldReduceMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function softlyPlayRewardSfx(prize: FortunePrize) {
  if (prize.type === "none") return;
  playSfx("reward_redeemed");
}

const RANK_ORDER = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Legend"];

async function applyPrizeToAccount(prize: FortunePrize) {
  const currentUser = getUser();
  if (!currentUser || prize.type === "none" || prize.type === "extra_spin") return;

  const patch: Record<string, unknown> = {};
  if (prize.type === "wallet") {
    patch.walletBalance = Number((Number(currentUser.walletBalance ?? 0) + Number(prize.value)).toFixed(2));
  }
  if (prize.type === "points") {
    patch.points = Number(currentUser.points ?? 0) + Number(prize.value);
  }
  if (prize.type === "rank") {
    const currentIndex = Math.max(0, RANK_ORDER.indexOf(currentUser.rank));
    patch.rank = RANK_ORDER[Math.min(currentIndex + 1, RANK_ORDER.length - 1)];
  }
  if (prize.type === "temporary_rank") {
    patch.rank = "Nega";
  }

  if (Object.keys(patch).length === 0) return;
  const updatedUser = await customFetch(`/api/users/${currentUser.id}`, {
    method: "PATCH",
    responseType: "json",
    body: JSON.stringify(patch),
  });
  setUser(updatedUser);
}

function applyPrizeLocally(prize: FortunePrize) {
  // TODO: اربط هذه النقطة مع API المكافآت الحقيقي عند تجهيز نظام إضافة النقاط/الرصيد/الخصومات.
  // حالياً النتيجة تعرض للمستخدم وتحفظ كآخر نتيجة فقط بدون تعديل رصيد أو نقاط حقيقية.
  void applyPrizeToAccount(prize).catch(() => undefined);
  return prize;
}

function LuckyWheel({
  canSpin,
  isSpinning,
  rotation,
  unavailableText,
  onSpin,
}: {
  canSpin: boolean;
  isSpinning: boolean;
  rotation: number;
  unavailableText: string;
  onSpin: () => void;
}) {
  const segmentAngle = 360 / FORTUNE_PRIZES.length;
  const wheelGradient = `conic-gradient(${FORTUNE_PRIZES.map((prize, index) => {
    const start = index * segmentAngle;
    const end = start + segmentAngle;
    return `${prize.color} ${start}deg ${end}deg`;
  }).join(", ")})`;

  return (
    <div className="lucky-wheel-stage" dir="rtl">
      <div className="lucky-wheel-pointer" aria-hidden="true">
        <div className="lucky-wheel-pointer-top" />
        <div className="lucky-wheel-pointer-tip" />
      </div>

      <div className="lucky-wheel-outer">
        <div className="lucky-wheel-ring">
          <div
            className={`lucky-wheel-disc ${isSpinning ? "is-spinning" : ""}`}
            style={{
              background: wheelGradient,
              transform: `rotate(${rotation}deg)`,
              transitionDuration: isSpinning ? (shouldReduceMotion() ? "900ms" : "5200ms") : "0ms",
              willChange: isSpinning ? "transform" : "auto",
            }}
          >
            <div className="lucky-wheel-lines" />
            {FORTUNE_PRIZES.map((prize, index) => {
              const Icon = ICONS[prize.iconKey];
              const angle = index * segmentAngle + segmentAngle / 2;
              return (
                <div
                  key={prize.id}
                  className="lucky-wheel-prize"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div
                    className="lucky-wheel-prize-content"
                    style={{ transform: `translate(-50%, calc(-1 * clamp(78px, 27vw, 188px))) rotate(${-angle}deg)` }}
                  >
                    <Icon className="lucky-wheel-prize-icon" />
                    <span className="lucky-wheel-prize-label">{prize.labelAr}</span>
                    <span className="lucky-wheel-prize-detail">{prize.detailAr}</span>
                  </div>
                </div>
              );
            })}
            <div className="lucky-wheel-center">
              <Crown size={30} />
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={onSpin}
        disabled={!canSpin}
        className="lucky-wheel-button"
        data-testid="button-spin-fortune-wheel"
      >
        <RotateCw size={20} className={isSpinning ? "animate-spin" : ""} />
        {isSpinning ? "جاري اللف..." : canSpin ? "لف الدولاب" : unavailableText}
      </Button>
    </div>
  );
}

export default function FortuneWheelPage() {
  const user = getUser();
  const userKey = getFortuneUserKey(user);
  const storageKey = `${FORTUNE_LAST_SPIN_PREFIX}${userKey}`;
  const resultKey = `${FORTUNE_LAST_RESULT_PREFIX}${userKey}`;
  const segmentAngle = 360 / FORTUNE_PRIZES.length;
  const adminUnlimited = isAdmin();

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastSpin, setLastSpin] = useState<number>(() => Number(localStorage.getItem(storageKey) || 0));
  const [now, setNow] = useState(Date.now());
  const [globalConfig, setGlobalConfig] = useState(() => getFortuneGlobalConfig());
  const [userConfig, setUserConfig] = useState(() => getFortuneUserConfig(userKey));
  const [lastResult, setLastResult] = useState<FortunePrize | null>(() => {
    const stored = localStorage.getItem(resultKey);
    return FORTUNE_PRIZES.find(prize => prize.id === stored) ?? null;
  });
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [spinError, setSpinError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshFortuneState = useCallback(async () => {
    const state = await fetchFortuneState(userKey);
    setGlobalConfig(state.globalConfig);
    setUserConfig(state.userConfig);
    return state;
  }, [userKey]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchFortuneState(userKey).then(state => {
        if (!active) return;
        setGlobalConfig(state.globalConfig);
        setUserConfig(state.userConfig);
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [userKey]);

  useEffect(() => {
    const onFocus = () => {
      void refreshFortuneState();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshFortuneState]);

  const remaining = Math.max(0, lastSpin + SPIN_INTERVAL_MS - now);
  const bonusSpins = getAvailableBonusSpins(globalConfig, userConfig);
  const canSpin = Boolean(user) && (adminUnlimited || bonusSpins > 0 || remaining === 0) && !isSpinning;
  const availableSpinsLabel = !user ? "سجل دخول" : adminUnlimited ? "∞" : String((remaining === 0 ? 1 : 0) + bonusSpins);
  const statusLabel = adminUnlimited ? "أدمن - لفات غير محدودة" : user ? "عضو مسجل" : "زائر محلي";

  const buttonBlockedText = useMemo(() => user ? `اللفة القادمة بعد ${formatRemaining(remaining)}` : "سجل دخولك للّف", [remaining, user]);

  const spin = async () => {
    setSpinError("");
    const latest = await refreshFortuneState();
    const latestBonusSpins = getAvailableBonusSpins(latest.globalConfig, latest.userConfig);
    const latestCanSpin = Boolean(user) && (adminUnlimited || latestBonusSpins > 0 || remaining === 0);
    if (!latestCanSpin || isSpinning) {
      setSpinError(user ? "لا توجد لفات متاحة الآن. إذا أضفت لفات من لوحة الأدمن اضغط تحديث الحالة." : "سجل دخولك حتى تقدر تلف الدولاب.");
      return;
    }

    const spinResult = await customFetch<{
      prizeId: string;
      user?: any;
      userConfig: any;
      globalConfig: any;
      lastSpin?: number;
    }>("/api/fortune-wheel/spin", {
      method: "POST",
      responseType: "json",
      body: JSON.stringify({}),
    }).catch((error: any) => {
      if (error?.status === 401) {
        clearUser();
        setSpinError("انتهت الجلسة. سجل دخولك مرة ثانية حتى تقدر تلف الدولاب.");
        return null;
      }
      setSpinError(error?.data?.error || error?.message || "تعذر تشغيل الدولاب. حدث الحالة وجرب مرة ثانية.");
      return null;
    });
    if (!spinResult) return;
    if (spinResult.user) setUser(spinResult.user);

    const selectedPrize = FORTUNE_PRIZES.find(prize => prize.id === spinResult.prizeId) ?? FORTUNE_PRIZES[0];
    const selectedIndex = FORTUNE_PRIZES.findIndex(prize => prize.id === selectedPrize.id);
    const selectedCenterAngle = selectedIndex * segmentAngle + segmentAngle / 2;
    const currentRotation = ((rotation % 360) + 360) % 360;
    const targetModulo = (360 - selectedCenterAngle + 360) % 360;
    const correction = (targetModulo - currentRotation + 360) % 360;
    const fullTurns = shouldReduceMotion() ? 2 * 360 : 7 * 360;
    const finalRotation = rotation + fullTurns + correction;

    setIsSpinning(true);
    setLastResult(null);
    setRotation(finalRotation);

    window.setTimeout(() => {
      const appliedPrize = selectedPrize;
      const nextLastSpin = Number(spinResult.lastSpin || Date.now());
      const nextUserConfig = spinResult.userConfig;

      localStorage.setItem(resultKey, appliedPrize.id);
      if (!adminUnlimited && spinResult.lastSpin) {
        localStorage.setItem(storageKey, String(nextLastSpin));
        setLastSpin(nextLastSpin);
      }
      setNow(nextLastSpin);
      setGlobalConfig(spinResult.globalConfig ?? getFortuneGlobalConfig());
      setUserConfig(nextUserConfig);
      setLastResult(appliedPrize);
      setIsSpinning(false);
      setResultModalOpen(true);
      softlyPlayRewardSfx(appliedPrize);
    }, shouldReduceMotion() ? 950 : 5250);
  };

  return (
    <div className="min-h-screen overflow-x-hidden px-4 py-8 lg:px-8" dir="rtl">
      <style>{`
        .lucky-shell {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018)),
            radial-gradient(circle at 50% 0%, rgba(34,197,94,0.13), transparent 48%);
        }

        .lucky-wheel-stage {
          position: relative;
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: center;
          gap: 22px;
          padding-top: 20px;
        }

        .lucky-wheel-outer {
          position: relative;
          width: min(82vw, 520px);
          max-width: 100%;
          aspect-ratio: 1;
          border-radius: 9999px;
          padding: clamp(12px, 2.8vw, 22px);
          background:
            linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.035) 28%, rgba(0,0,0,0.55) 62%, rgba(34,197,94,0.18)),
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.22), transparent 18%);
          box-shadow:
            0 30px 80px rgba(0,0,0,0.42),
            inset 0 2px 0 rgba(255,255,255,0.18),
            inset 0 -18px 38px rgba(0,0,0,0.38),
            0 0 0 1px rgba(255,255,255,0.08);
        }

        .lucky-wheel-ring {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: inherit;
          padding: clamp(8px, 1.8vw, 14px);
          background:
            radial-gradient(circle, rgba(2,6,23,0.18) 0 58%, rgba(255,255,255,0.12) 59% 61%, rgba(2,6,23,0.88) 62%),
            linear-gradient(145deg, rgba(21,128,61,0.42), rgba(0,0,0,0.86));
          box-shadow:
            inset 0 0 26px rgba(0,0,0,0.55),
            0 0 0 1px rgba(255,255,255,0.08);
        }

        .lucky-wheel-disc {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: inherit;
          transform: rotate(0deg);
          transition-property: transform;
          transition-timing-function: cubic-bezier(0.12, 0.92, 0.12, 1);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.16),
            inset 0 0 48px rgba(0,0,0,0.42);
        }

        .lucky-wheel-disc::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(circle at 28% 20%, rgba(255,255,255,0.18), transparent 16%),
            radial-gradient(circle, transparent 0 58%, rgba(0,0,0,0.28) 74%, rgba(0,0,0,0.46) 100%);
          pointer-events: none;
        }

        .lucky-wheel-lines {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: repeating-conic-gradient(from 0deg, rgba(255,255,255,0.24) 0deg 0.75deg, transparent 0.75deg 36deg);
          opacity: 0.52;
          pointer-events: none;
        }

        .lucky-wheel-prize {
          position: absolute;
          left: 50%;
          top: 50%;
          height: 50%;
          width: 0;
          transform-origin: center top;
          z-index: 2;
        }

        .lucky-wheel-prize-content {
          position: absolute;
          left: 50%;
          top: 0;
          display: flex;
          width: clamp(58px, 14vw, 96px);
          flex-direction: column;
          align-items: center;
          gap: 3px;
          color: white;
          text-align: center;
          text-shadow: 0 2px 10px rgba(0,0,0,0.62);
        }

        .lucky-wheel-prize-icon {
          width: clamp(17px, 4.5vw, 27px);
          height: clamp(17px, 4.5vw, 27px);
          color: rgba(255,255,255,0.95);
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.35));
        }

        .lucky-wheel-prize-label {
          display: block;
          max-width: 100%;
          font-size: clamp(10px, 2.45vw, 14px);
          font-weight: 900;
          line-height: 1.15;
        }

        .lucky-wheel-prize-detail {
          display: block;
          max-width: 100%;
          font-size: clamp(8px, 1.85vw, 11px);
          font-weight: 800;
          line-height: 1.1;
          color: rgba(255,255,255,0.72);
        }

        .lucky-wheel-center {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 4;
          display: flex;
          width: clamp(72px, 18vw, 118px);
          height: clamp(72px, 18vw, 118px);
          transform: translate(-50%, -50%);
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          color: hsl(var(--primary));
          background:
            radial-gradient(circle at 34% 25%, rgba(255,255,255,0.22), transparent 24%),
            linear-gradient(145deg, rgba(10,20,16,0.98), rgba(0,0,0,0.94));
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow:
            0 12px 28px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.15),
            0 0 0 8px rgba(0,0,0,0.16);
        }

        .lucky-wheel-pointer {
          position: absolute;
          top: 0;
          left: 50%;
          z-index: 8;
          display: flex;
          transform: translateX(-50%);
          flex-direction: column;
          align-items: center;
          filter: drop-shadow(0 10px 18px rgba(0,0,0,0.5));
        }

        .lucky-wheel-pointer-top {
          width: 46px;
          height: 30px;
          border-radius: 12px 12px 8px 8px;
          background:
            radial-gradient(circle at 35% 25%, rgba(255,255,255,0.45), transparent 22%),
            linear-gradient(145deg, #ecfdf5, #86efac 52%, #15803d);
          border: 1px solid rgba(255,255,255,0.45);
        }

        .lucky-wheel-pointer-tip {
          width: 0;
          height: 0;
          margin-top: -3px;
          border-left: 17px solid transparent;
          border-right: 17px solid transparent;
          border-top: 42px solid #dcfce7;
        }

        .lucky-wheel-button {
          width: min(100%, 360px);
          height: 56px;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 950;
          box-shadow: 0 16px 34px rgba(34,197,94,0.18);
        }

        @media (max-width: 640px) {
          .lucky-wheel-stage {
            gap: 18px;
            padding-top: 16px;
          }

          .lucky-wheel-outer {
            width: min(82vw, 360px);
          }

          .lucky-wheel-prize-detail {
            display: none;
          }

          .lucky-wheel-pointer-top {
            width: 40px;
            height: 26px;
          }

          .lucky-wheel-pointer-tip {
            border-left-width: 14px;
            border-right-width: 14px;
            border-top-width: 34px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lucky-wheel-disc {
            transition-duration: 900ms !important;
            transition-timing-function: ease-out !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3 text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-black text-primary">
            <Sparkles size={15} />
            مكافآت مجانية داخل Grove Street
          </div>
          <div>
            <h1 className="text-4xl font-black leading-tight text-white lg:text-6xl">دولاب الحظ</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground lg:text-base">
              لف الدولاب واحصل على مكافأة مجانية حسب حظك.
            </p>
          </div>
        </header>

        <section className="lucky-shell grid gap-6 rounded-2xl border border-white/10 p-4 shadow-2xl shadow-black/25 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:p-7">
          <LuckyWheel
            canSpin={canSpin}
            isSpinning={isSpinning}
            rotation={rotation}
            unavailableText={buttonBlockedText}
            onSpin={spin}
          />

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-right">
              <p className="text-xs font-bold text-muted-foreground">عدد اللفات المتاحة</p>
              <p className="mt-2 text-3xl font-black text-white">{availableSpinsLabel}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full font-bold"
                onClick={() => void refreshFortuneState()}
              >
                تحديث الحالة
              </Button>
              {spinError && <p className="mt-3 text-xs leading-6 text-red-300">{spinError}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-right">
              <p className="text-xs font-bold text-muted-foreground">وقت اللفة القادمة</p>
              <p className="mt-2 text-xl font-black text-white">{canSpin ? "متاحة الآن" : formatRemaining(remaining)}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, ((SPIN_INTERVAL_MS - remaining) / SPIN_INTERVAL_MS) * 100)}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-right">
              <p className="text-xs font-bold text-muted-foreground">آخر نتيجة</p>
              <p className="mt-2 text-xl font-black text-white">{lastResult?.labelAr ?? "لا يوجد بعد"}</p>
              {lastResult && <p className="mt-1 text-xs text-muted-foreground">{lastResult.detailAr}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-right">
              <p className="text-xs font-bold text-muted-foreground">حالة المستخدم</p>
              <p className="mt-2 text-xl font-black text-white">{statusLabel}</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {canSpin ? "يمكنك استخدام لفتك الآن." : buttonBlockedText}
              </p>
            </div>
          </aside>
        </section>
      </div>

      <Dialog open={resultModalOpen} onOpenChange={setResultModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-white/10 bg-card text-right shadow-2xl" dir="rtl">
          <DialogHeader className="text-right">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
              {lastResult?.type === "none" ? <Sparkles size={30} /> : <Gift size={30} />}
            </div>
            <DialogTitle className="text-center text-2xl font-black text-white">
              {lastResult?.type === "none" ? "حظ أوفر" : "مبروك!"}
            </DialogTitle>
            <DialogDescription className="text-center leading-7">
              {lastResult?.type === "none"
                ? "حظ أوفر، جرّب مرة ثانية لاحقاً."
                : `مبروك حصلت على ${lastResult?.labelAr}.`}
            </DialogDescription>
          </DialogHeader>
          <Button className="mt-2 w-full font-black" onClick={() => setResultModalOpen(false)}>
            تم
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
