import { customFetch } from "@workspace/api-client-react";
import { fetchSharedSiteState, patchSharedSiteState } from "@/lib/sharedSiteState";

export type FortunePrizeType = "none" | "points" | "wallet" | "rank" | "temporary_rank" | "extra_spin";

export type FortunePrize = {
  id: string;
  labelAr: string;
  labelEn: string;
  detailAr: string;
  iconKey: "sparkles" | "wallet" | "star" | "trophy" | "crown" | "rotate";
  type: FortunePrizeType;
  value: number | string;
  weight: number;
  color: string;
  tier: "lose" | "common" | "good" | "rare" | "best";
};

export type FortuneGlobalConfig = {
  globalLuck: number;
  forcedPrizeId: string;
  globalSpinGrants: number;
  updatedAt: number;
};

export type FortuneUserConfig = {
  luckOverride: number | null;
  extraSpins: number;
  forcedPrizeId: string;
  globalSpinsUsed: number;
};

export const FORTUNE_AUTO_PRIZE = "auto";
export const FORTUNE_CONFIG_KEY = "grove_fortune_admin_config";
export const FORTUNE_USER_CONFIG_PREFIX = "grove_fortune_user_config_";
export const FORTUNE_LAST_SPIN_PREFIX = "grove_fortune_last_spin_";
export const FORTUNE_LAST_RESULT_PREFIX = "grove_fortune_last_result_";

export const DEFAULT_FORTUNE_CONFIG: FortuneGlobalConfig = {
  globalLuck: 0,
  forcedPrizeId: FORTUNE_AUTO_PRIZE,
  globalSpinGrants: 0,
  updatedAt: 0,
};

export const DEFAULT_FORTUNE_USER_CONFIG: FortuneUserConfig = {
  luckOverride: null,
  extraSpins: 0,
  forcedPrizeId: FORTUNE_AUTO_PRIZE,
  globalSpinsUsed: 0,
};

export const FORTUNE_PRIZES: FortunePrize[] = [
  {
    id: "wallet-1",
    labelAr: "دينار رصيد",
    labelEn: "1 JOD credit",
    detailAr: "رصيد محفظة",
    iconKey: "wallet",
    type: "wallet",
    value: 1,
    weight: 7,
    color: "#166534",
    tier: "rare",
  },
  {
    id: "wallet-5",
    labelAr: "5 دنانير",
    labelEn: "5 JOD credit",
    detailAr: "رصيد نادر",
    iconKey: "wallet",
    type: "wallet",
    value: 5,
    weight: 3,
    color: "#0f766e",
    tier: "rare",
  },
  {
    id: "points-10",
    labelAr: "10 نقاط",
    labelEn: "10 points",
    detailAr: "نقاط مجانية",
    iconKey: "star",
    type: "points",
    value: 10,
    weight: 18,
    color: "#15803d",
    tier: "common",
  },
  {
    id: "rank-up",
    labelAr: "رفع رتبة",
    labelEn: "Rank up",
    detailAr: "رتبة واحدة دائم",
    iconKey: "trophy",
    type: "rank",
    value: 1,
    weight: 7,
    color: "#854d0e",
    tier: "good",
  },
  {
    id: "better-luck-a",
    labelAr: "حظ أوفر",
    labelEn: "Better luck",
    detailAr: "جرّب لاحقاً",
    iconKey: "sparkles",
    type: "none",
    value: 0,
    weight: 31,
    color: "#052e16",
    tier: "lose",
  },
  {
    id: "nega-day",
    labelAr: "رتبة النيقا",
    labelEn: "Niga secret rank (luck above 90)",
    detailAr: "ليوم واحد",
    iconKey: "crown",
    type: "temporary_rank",
    value: "nega_1_day",
    weight: 4,
    color: "#365314",
    tier: "rare",
  },
  {
    id: "better-luck-b",
    labelAr: "حظ أوفر",
    labelEn: "Try again",
    detailAr: "المرة الجاية",
    iconKey: "sparkles",
    type: "none",
    value: 0,
    weight: 27,
    color: "#14532d",
    tier: "lose",
  },
  {
    id: "extra-spin",
    labelAr: "لفة أخرى",
    labelEn: "Extra spin",
    detailAr: "هدية لفة",
    iconKey: "rotate",
    type: "extra_spin",
    value: 1,
    weight: 6,
    color: "#0e7490",
    tier: "good",
  },
  {
    id: "points-15",
    labelAr: "15 نقطة",
    labelEn: "15 points",
    detailAr: "نقاط أعلى",
    iconKey: "star",
    type: "points",
    value: 15,
    weight: 10,
    color: "#166534",
    tier: "good",
  },
  {
    id: "wallet-10",
    labelAr: "10 دنانير",
    labelEn: "10 JOD credit",
    detailAr: "أفضل جائزة",
    iconKey: "wallet",
    type: "wallet",
    value: 10,
    weight: 1,
    color: "#713f12",
    tier: "best",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clampLuck(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return { ...fallback, ...JSON.parse(value) };
  } catch {
    return fallback;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T | undefined> {
  try {
    return await customFetch<T>(url, {
      responseType: "json",
      headers: { "content-type": "application/json" },
      ...options,
    });
  } catch {
    return undefined;
  }
}

export function getFortuneUserKey(user: any) {
  return String(user?.id ?? user?.phone ?? user?.username ?? user?.name ?? "guest");
}

export function getFortuneGlobalConfig(): FortuneGlobalConfig {
  if (!canUseStorage()) return DEFAULT_FORTUNE_CONFIG;
  const config = parseJson(localStorage.getItem(FORTUNE_CONFIG_KEY), DEFAULT_FORTUNE_CONFIG);
  return {
    ...config,
    globalLuck: clampLuck(config.globalLuck),
    globalSpinGrants: Math.max(0, Number(config.globalSpinGrants) || 0),
    forcedPrizeId: config.forcedPrizeId || FORTUNE_AUTO_PRIZE,
  };
}

function cacheFortuneGlobalConfig(config: FortuneGlobalConfig) {
  if (!canUseStorage()) return;
  localStorage.setItem(FORTUNE_CONFIG_KEY, JSON.stringify(config));
}

function cacheFortuneUserConfig(userKey: string, config: FortuneUserConfig) {
  if (!canUseStorage()) return;
  localStorage.setItem(`${FORTUNE_USER_CONFIG_PREFIX}${userKey}`, JSON.stringify(config));
}

export async function fetchFortuneGlobalConfig(): Promise<FortuneGlobalConfig> {
  const remote = await request<FortuneGlobalConfig>("/api/fortune-wheel/config");
  if (remote) {
    const config = {
      ...remote,
      globalLuck: clampLuck(remote.globalLuck),
      globalSpinGrants: Math.max(0, Number(remote.globalSpinGrants) || 0),
      forcedPrizeId: remote.forcedPrizeId || FORTUNE_AUTO_PRIZE,
    };
    cacheFortuneGlobalConfig(config);
    return config;
  }
  const shared = await fetchSharedSiteState();
  if (shared?.fortuneGlobalConfig) {
    const config = {
      ...DEFAULT_FORTUNE_CONFIG,
      ...shared.fortuneGlobalConfig,
      globalLuck: clampLuck(shared.fortuneGlobalConfig.globalLuck),
      globalSpinGrants: Math.max(0, Number(shared.fortuneGlobalConfig.globalSpinGrants) || 0),
      forcedPrizeId: shared.fortuneGlobalConfig.forcedPrizeId || FORTUNE_AUTO_PRIZE,
    };
    cacheFortuneGlobalConfig(config);
    return config;
  }
  return getFortuneGlobalConfig();
}

export function saveFortuneGlobalConfig(config: FortuneGlobalConfig) {
  if (!canUseStorage()) return;
  const normalized = {
    ...config,
    globalLuck: clampLuck(config.globalLuck),
    globalSpinGrants: Math.max(0, Number(config.globalSpinGrants) || 0),
    forcedPrizeId: config.forcedPrizeId || FORTUNE_AUTO_PRIZE,
    updatedAt: Date.now(),
  };
  cacheFortuneGlobalConfig(normalized);
  void request<FortuneGlobalConfig>("/api/fortune-wheel/config", {
    method: "PATCH",
    body: JSON.stringify(normalized),
  });
  void patchSharedSiteState({ fortuneGlobalConfig: normalized });
}

export async function persistFortuneGlobalConfig(config: FortuneGlobalConfig): Promise<FortuneGlobalConfig> {
  saveFortuneGlobalConfig(config);
  const remote = await request<FortuneGlobalConfig>("/api/fortune-wheel/config", {
    method: "PATCH",
    body: JSON.stringify(config),
  });
  if (remote) {
    cacheFortuneGlobalConfig(remote);
    return remote;
  }
  const shared = await patchSharedSiteState({ fortuneGlobalConfig: getFortuneGlobalConfig() });
  if (shared?.fortuneGlobalConfig) return shared.fortuneGlobalConfig as FortuneGlobalConfig;
  return getFortuneGlobalConfig();
}

export function getFortuneUserConfig(userKey: string): FortuneUserConfig {
  if (!canUseStorage()) return DEFAULT_FORTUNE_USER_CONFIG;
  const config = parseJson(localStorage.getItem(`${FORTUNE_USER_CONFIG_PREFIX}${userKey}`), DEFAULT_FORTUNE_USER_CONFIG);
  return {
    ...config,
    luckOverride: config.luckOverride === null ? null : clampLuck(Number(config.luckOverride)),
    extraSpins: Math.max(0, Number(config.extraSpins) || 0),
    globalSpinsUsed: Math.max(0, Number(config.globalSpinsUsed) || 0),
    forcedPrizeId: config.forcedPrizeId || FORTUNE_AUTO_PRIZE,
  };
}

export async function fetchFortuneUserConfig(userKey: string): Promise<FortuneUserConfig> {
  const remote = await request<FortuneUserConfig>(`/api/fortune-wheel/users/${encodeURIComponent(userKey)}`);
  if (remote) {
    const config = {
      ...remote,
      luckOverride: remote.luckOverride === null ? null : clampLuck(Number(remote.luckOverride)),
      extraSpins: Math.max(0, Number(remote.extraSpins) || 0),
      globalSpinsUsed: Math.max(0, Number(remote.globalSpinsUsed) || 0),
      forcedPrizeId: remote.forcedPrizeId || FORTUNE_AUTO_PRIZE,
    };
    cacheFortuneUserConfig(userKey, config);
    return config;
  }
  const shared = await fetchSharedSiteState();
  const sharedConfig = shared?.fortuneUserConfigs?.[userKey];
  if (sharedConfig) {
    const config = {
      ...DEFAULT_FORTUNE_USER_CONFIG,
      ...sharedConfig,
      luckOverride: sharedConfig.luckOverride === null ? null : clampLuck(Number(sharedConfig.luckOverride)),
      extraSpins: Math.max(0, Number(sharedConfig.extraSpins) || 0),
      globalSpinsUsed: Math.max(0, Number(sharedConfig.globalSpinsUsed) || 0),
      forcedPrizeId: sharedConfig.forcedPrizeId || FORTUNE_AUTO_PRIZE,
    };
    cacheFortuneUserConfig(userKey, config);
    return config;
  }
  return getFortuneUserConfig(userKey);
}

export async function fetchFortuneState(userKey: string): Promise<{ globalConfig: FortuneGlobalConfig; userConfig: FortuneUserConfig }> {
  const remote = await request<{ globalConfig: FortuneGlobalConfig; userConfig: FortuneUserConfig }>(`/api/fortune-wheel/state/${encodeURIComponent(userKey)}`);
  if (remote) {
    cacheFortuneGlobalConfig(remote.globalConfig);
    cacheFortuneUserConfig(userKey, remote.userConfig);
    return remote;
  }
  const shared = await fetchSharedSiteState();
  if (shared) {
    const globalConfig = shared.fortuneGlobalConfig ? {
      ...DEFAULT_FORTUNE_CONFIG,
      ...shared.fortuneGlobalConfig,
      globalLuck: clampLuck(shared.fortuneGlobalConfig.globalLuck),
      globalSpinGrants: Math.max(0, Number(shared.fortuneGlobalConfig.globalSpinGrants) || 0),
      forcedPrizeId: shared.fortuneGlobalConfig.forcedPrizeId || FORTUNE_AUTO_PRIZE,
    } : getFortuneGlobalConfig();
    const rawUserConfig = shared.fortuneUserConfigs?.[userKey];
    const userConfig = rawUserConfig ? {
      ...DEFAULT_FORTUNE_USER_CONFIG,
      ...rawUserConfig,
      luckOverride: rawUserConfig.luckOverride === null ? null : clampLuck(Number(rawUserConfig.luckOverride)),
      extraSpins: Math.max(0, Number(rawUserConfig.extraSpins) || 0),
      globalSpinsUsed: Math.max(0, Number(rawUserConfig.globalSpinsUsed) || 0),
      forcedPrizeId: rawUserConfig.forcedPrizeId || FORTUNE_AUTO_PRIZE,
    } : getFortuneUserConfig(userKey);
    cacheFortuneGlobalConfig(globalConfig);
    cacheFortuneUserConfig(userKey, userConfig);
    return { globalConfig, userConfig };
  }
  return {
    globalConfig: getFortuneGlobalConfig(),
    userConfig: getFortuneUserConfig(userKey),
  };
}

export function saveFortuneUserConfig(userKey: string, config: FortuneUserConfig) {
  if (!canUseStorage()) return;
  const normalized = {
    ...config,
    luckOverride: config.luckOverride === null ? null : clampLuck(Number(config.luckOverride)),
    extraSpins: Math.max(0, Number(config.extraSpins) || 0),
    globalSpinsUsed: Math.max(0, Number(config.globalSpinsUsed) || 0),
    forcedPrizeId: config.forcedPrizeId || FORTUNE_AUTO_PRIZE,
  };
  cacheFortuneUserConfig(userKey, normalized);
  void request<FortuneUserConfig>(`/api/fortune-wheel/users/${encodeURIComponent(userKey)}`, {
    method: "PATCH",
    body: JSON.stringify(normalized),
  });
  void (async () => {
    const shared = await fetchSharedSiteState();
    await patchSharedSiteState({
      fortuneUserConfigs: {
        ...(shared?.fortuneUserConfigs ?? {}),
        [userKey]: normalized,
      },
    });
  })();
}

export async function persistFortuneUserConfig(userKey: string, config: FortuneUserConfig): Promise<FortuneUserConfig> {
  saveFortuneUserConfig(userKey, config);
  const remote = await request<FortuneUserConfig>(`/api/fortune-wheel/users/${encodeURIComponent(userKey)}`, {
    method: "PATCH",
    body: JSON.stringify(config),
  });
  if (remote) {
    cacheFortuneUserConfig(userKey, remote);
    return remote;
  }
  const shared = await fetchSharedSiteState();
  const nextUserConfigs = {
    ...(shared?.fortuneUserConfigs ?? {}),
    [userKey]: getFortuneUserConfig(userKey),
  };
  const saved = await patchSharedSiteState({ fortuneUserConfigs: nextUserConfigs });
  const savedConfig = saved?.fortuneUserConfigs?.[userKey] as FortuneUserConfig | undefined;
  if (savedConfig) return savedConfig;
  return getFortuneUserConfig(userKey);
}

export function getAvailableBonusSpins(globalConfig: FortuneGlobalConfig, userConfig: FortuneUserConfig) {
  const unusedGlobalSpins = Math.max(0, globalConfig.globalSpinGrants - userConfig.globalSpinsUsed);
  return userConfig.extraSpins + unusedGlobalSpins;
}

export function consumeBonusSpin(userKey: string, globalConfig: FortuneGlobalConfig, userConfig: FortuneUserConfig) {
  const next = { ...userConfig };
  if (next.extraSpins > 0) {
    next.extraSpins -= 1;
  } else if (globalConfig.globalSpinGrants > next.globalSpinsUsed) {
    next.globalSpinsUsed += 1;
  }
  saveFortuneUserConfig(userKey, next);
  return next;
}

export function grantExtraSpinFromPrize(userKey: string, userConfig: FortuneUserConfig) {
  const next = { ...userConfig, extraSpins: userConfig.extraSpins + 1 };
  saveFortuneUserConfig(userKey, next);
  return next;
}

export function clearForcedUserPrize(userKey: string, userConfig: FortuneUserConfig) {
  if (userConfig.forcedPrizeId === FORTUNE_AUTO_PRIZE) return userConfig;
  const next = { ...userConfig, forcedPrizeId: FORTUNE_AUTO_PRIZE };
  saveFortuneUserConfig(userKey, next);
  return next;
}

export function choosePrizeByLuck(globalConfig: FortuneGlobalConfig, userConfig: FortuneUserConfig) {
  const userForced = FORTUNE_PRIZES.find(prize => prize.id === userConfig.forcedPrizeId);
  if (userForced) return userForced;

  const globalForced = FORTUNE_PRIZES.find(prize => prize.id === globalConfig.forcedPrizeId);
  if (globalForced) return globalForced;

  const luck = clampLuck(userConfig.luckOverride ?? globalConfig.globalLuck);
  if (luck <= 0) return FORTUNE_PRIZES.find(prize => prize.id === "better-luck-a") ?? FORTUNE_PRIZES[0];
  if (luck >= 100) return FORTUNE_PRIZES.find(prize => prize.id === "wallet-10") ?? FORTUNE_PRIZES[FORTUNE_PRIZES.length - 1];

  const eligible = luck >= 80
    ? FORTUNE_PRIZES.filter(prize => prize.type === "wallet")
    : FORTUNE_PRIZES.filter(prize => prize.type !== "wallet");

  const weighted = eligible.map(prize => {
    let multiplier = 1;
    if (prize.tier === "lose") multiplier = Math.max(0.22, 1 - luck / 120);
    if (prize.tier === "common") multiplier = 1 + luck / 140;
    if (prize.tier === "good") multiplier = 1 + luck / 90;
    if (prize.tier === "rare") multiplier = 1 + luck / 55;
    if (prize.tier === "best") multiplier = 1 + luck / 35;
    return { prize, weight: Math.max(0.1, prize.weight * multiplier) };
  });

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.prize;
  }

  return weighted[0]?.prize ?? FORTUNE_PRIZES[0];
}

export function getLuckForUser(globalConfig: FortuneGlobalConfig, userConfig: FortuneUserConfig) {
  return clampLuck(userConfig.luckOverride ?? globalConfig.globalLuck);
}
