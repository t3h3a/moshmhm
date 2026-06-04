import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { readLocalStore, updateLocalStore } from "../lib/localStore";
import { verifyAuthToken } from "../lib/authTokens";

type AnnouncementDuration = "10s" | "30s" | "60s" | "manual";
type AnnouncementType = "general" | "offer" | "warning" | "celebration" | "info";

type SiteAnnouncement = {
  id: string;
  message: string;
  type: AnnouncementType;
  duration: AnnouncementDuration;
  createdAt: number;
  active: boolean;
  dismissedByUsers: string[];
};

type FortuneGlobalConfig = {
  globalLuck: number;
  forcedPrizeId: string;
  globalSpinGrants: number;
  updatedAt: number;
};

type FortuneUserConfig = {
  luckOverride: number | null;
  extraSpins: number;
  forcedPrizeId: string;
  globalSpinsUsed: number;
};

const router: IRouter = Router();

const FORTUNE_AUTO_PRIZE = "auto";

let currentAnnouncement: SiteAnnouncement | null = null;
let announcementHistory: SiteAnnouncement[] = [];

let fortuneGlobalConfig: FortuneGlobalConfig = {
  globalLuck: 0,
  forcedPrizeId: FORTUNE_AUTO_PRIZE,
  globalSpinGrants: 0,
  updatedAt: 0,
};

const fortuneUserConfigs = new Map<string, FortuneUserConfig>();

function loadLiveControlsState() {
  const store = readLocalStore();
  const saved = store["liveControls"] as {
    currentAnnouncement?: SiteAnnouncement | null;
    announcementHistory?: SiteAnnouncement[];
    fortuneGlobalConfig?: FortuneGlobalConfig;
    fortuneUserConfigs?: Record<string, FortuneUserConfig>;
  } | undefined;

  if (!saved || typeof saved !== "object") return;
  currentAnnouncement =
    saved.currentAnnouncement && typeof saved.currentAnnouncement === "object"
      ? {
          ...saved.currentAnnouncement,
          active: saved.currentAnnouncement.active === true,
          dismissedByUsers: Array.isArray(saved.currentAnnouncement.dismissedByUsers)
            ? saved.currentAnnouncement.dismissedByUsers
            : [],
        }
      : null;
  announcementHistory = Array.isArray(saved.announcementHistory) ? saved.announcementHistory : [];
  fortuneGlobalConfig = sanitizeGlobalConfig({ ...fortuneGlobalConfig, ...saved.fortuneGlobalConfig });
  fortuneGlobalConfig.updatedAt = saved.fortuneGlobalConfig?.updatedAt ?? fortuneGlobalConfig.updatedAt;
  fortuneUserConfigs.clear();
  for (const [userKey, config] of Object.entries(saved.fortuneUserConfigs ?? {})) {
    fortuneUserConfigs.set(userKey, sanitizeUserConfig(config));
  }
}

function saveLiveControlsState() {
  updateLocalStore("liveControls", {
    currentAnnouncement,
    announcementHistory,
    fortuneGlobalConfig,
    fortuneUserConfigs: Object.fromEntries(fortuneUserConfigs.entries()),
  });
}

loadLiveControlsState();

function getAdminFromStore(req: Request) {
  const authHeader = String(req.headers?.authorization ?? "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const userId = verifyAuthToken(token);
  if (!userId) return null;

  const saved = readLocalStore()["mockApi"] as { users?: Array<{ id: number; role?: string; isBanned?: boolean }> } | undefined;
  const user = saved?.users?.find((item) => Number(item.id) === userId);
  if (!user && (userId === 1 || userId === 2)) return { id: userId, role: "owner" };
  if (!user || user.isBanned || (user.role !== "admin" && user.role !== "owner")) return null;
  return user;
}

function requireLiveAdmin(req: Request, res: Response) {
  const admin = getAdminFromStore(req);
  if (!admin) {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return admin;
}

function clampLuck(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number)));
}

function sanitizeGlobalConfig(input: Partial<FortuneGlobalConfig>): FortuneGlobalConfig {
  return {
    globalLuck: clampLuck(input.globalLuck),
    forcedPrizeId: input.forcedPrizeId || FORTUNE_AUTO_PRIZE,
    globalSpinGrants: Math.max(0, Number(input.globalSpinGrants) || 0),
    updatedAt: Date.now(),
  };
}

function sanitizeUserConfig(input: Partial<FortuneUserConfig>): FortuneUserConfig {
  return {
    luckOverride: input.luckOverride === null || input.luckOverride === undefined ? null : clampLuck(input.luckOverride),
    extraSpins: Math.max(0, Number(input.extraSpins) || 0),
    forcedPrizeId: input.forcedPrizeId || FORTUNE_AUTO_PRIZE,
    globalSpinsUsed: Math.max(0, Number(input.globalSpinsUsed) || 0),
  };
}

function getUserConfig(userKey: string): FortuneUserConfig {
  return fortuneUserConfigs.get(userKey) ?? {
    luckOverride: null,
    extraSpins: 0,
    forcedPrizeId: FORTUNE_AUTO_PRIZE,
    globalSpinsUsed: 0,
  };
}

function guestWheelState() {
  return {
    globalConfig: {
      globalLuck: 0,
      forcedPrizeId: FORTUNE_AUTO_PRIZE,
      globalSpinGrants: 0,
      updatedAt: Date.now(),
    },
    userConfig: getUserConfig("guest"),
  };
}

router.get("/event-announcement/current", (_req, res): void => {
  loadLiveControlsState();
  if (!currentAnnouncement || currentAnnouncement.active === false) {
    res.json({ announcement: null });
    return;
  }
  res.json({ announcement: currentAnnouncement });
});

router.get("/event-announcement/history", (_req, res): void => {
  loadLiveControlsState();
  res.json(announcementHistory);
});

router.post("/event-announcement", (req, res): void => {
  if (!requireLiveAdmin(req, res)) return;
  loadLiveControlsState();
  const message = String(req.body?.message ?? "").trim();
  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const announcement: SiteAnnouncement = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: message.slice(0, 500),
    type: req.body?.type || "general",
    duration: req.body?.duration || "30s",
    createdAt: Date.now(),
    active: true,
    dismissedByUsers: [],
  };

  currentAnnouncement = announcement;
  announcementHistory = [announcement, ...announcementHistory].slice(0, 10);
  saveLiveControlsState();
  res.json(announcement);
});

router.delete("/event-announcement/current", (_req, res): void => {
  if (!requireLiveAdmin(_req, res)) return;
  loadLiveControlsState();
  if (currentAnnouncement) {
    currentAnnouncement = { ...currentAnnouncement, active: false };
  }
  saveLiveControlsState();
  res.json(currentAnnouncement);
});

router.patch("/event-announcement/:id/dismiss", (req, res): void => {
  loadLiveControlsState();
  const id = String(req.params.id);
  const userKey = String(req.body?.userKey ?? "guest");
  if (currentAnnouncement?.id === id && !currentAnnouncement.dismissedByUsers.includes(userKey)) {
    currentAnnouncement = {
      ...currentAnnouncement,
      dismissedByUsers: [...currentAnnouncement.dismissedByUsers, userKey],
    };
    saveLiveControlsState();
  }
  res.json(currentAnnouncement);
});

router.get("/fortune-wheel/config", (_req, res): void => {
  loadLiveControlsState();
  res.json(fortuneGlobalConfig);
});

router.patch("/fortune-wheel/config", (req, res): void => {
  if (!requireLiveAdmin(req, res)) return;
  loadLiveControlsState();
  fortuneGlobalConfig = sanitizeGlobalConfig({ ...fortuneGlobalConfig, ...req.body });
  saveLiveControlsState();
  res.json(fortuneGlobalConfig);
});

router.get("/fortune-wheel/users/:userKey", (req, res): void => {
  loadLiveControlsState();
  res.json(getUserConfig(String(req.params.userKey)));
});

router.patch("/fortune-wheel/users/:userKey", (req, res): void => {
  if (!requireLiveAdmin(req, res)) return;
  loadLiveControlsState();
  const userKey = String(req.params.userKey);
  const nextConfig = sanitizeUserConfig({ ...getUserConfig(userKey), ...req.body });
  fortuneUserConfigs.set(userKey, nextConfig);
  saveLiveControlsState();
  res.json(nextConfig);
});

router.get("/fortune-wheel/state/:userKey", (req, res): void => {
  loadLiveControlsState();
  const userKey = String(req.params.userKey);
  if (userKey === "guest") {
    res.json(guestWheelState());
    return;
  }

  res.json({
    globalConfig: fortuneGlobalConfig,
    userConfig: getUserConfig(userKey),
  });
});

export default router;
