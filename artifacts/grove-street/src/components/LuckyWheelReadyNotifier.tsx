import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { RotateCw } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { getUser } from "@/lib/auth";
import {
  FORTUNE_LAST_SPIN_PREFIX,
  fetchFortuneState,
  getAvailableBonusSpins,
  getFortuneGlobalConfig,
  getFortuneUserConfig,
  getFortuneUserKey,
} from "@/lib/fortuneWheel";

const SPIN_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

export function LuckyWheelReadyNotifier() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tick, setTick] = useState(Date.now());
  const user = getUser();
  const userKey = getFortuneUserKey(user);

  const signature = useMemo(() => {
    const globalConfig = getFortuneGlobalConfig();
    const userConfig = getFortuneUserConfig(userKey);
    const lastSpin = Number(localStorage.getItem(`${FORTUNE_LAST_SPIN_PREFIX}${userKey}`) || 0);
    const bonusSpins = getAvailableBonusSpins(globalConfig, userConfig);
    const naturalReady = Date.now() >= lastSpin + SPIN_INTERVAL_MS;
    if (bonusSpins > 0) return `bonus:${globalConfig.globalSpinGrants}:${userConfig.extraSpins}:${userConfig.globalSpinsUsed}`;
    if (naturalReady && lastSpin > 0) return `cooldown:${lastSpin}`;
    return "";
  }, [userKey, tick]);

  useEffect(() => {
    const refresh = () => {
      fetchFortuneState(userKey).finally(() => setTick(Date.now()));
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    const onStorage = () => setTick(Date.now());
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!signature || window.location.pathname.includes("/fortune-wheel")) return;
    const seenKey = `grove_lucky_spin_notice_${userKey}_${signature}`;
    if (localStorage.getItem(seenKey) === "seen") return;
    localStorage.setItem(seenKey, "seen");

    toast({
      title: "صار عندك محاولة جديدة في دولاب الحظ",
      description: "روح دور دولاب الحظ وشوف جائزتك.",
      action: (
        <ToastAction
          altText="روح للدولاب"
          onClick={() => setLocation("/fortune-wheel")}
          className="gap-1"
        >
          <RotateCw size={14} />
          روح للدولاب
        </ToastAction>
      ),
    });
  }, [signature, toast, setLocation, userKey]);

  return null;
}
