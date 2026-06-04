import { customFetch } from "@workspace/api-client-react";
import { fetchSharedSiteState, patchSharedSiteState } from "@/lib/sharedSiteState";

export type AnnouncementType = "general" | "offer" | "warning" | "celebration" | "info";
export type AnnouncementDuration = "10s" | "30s" | "60s" | "manual";

export type SiteAnnouncement = {
  id: string;
  message: string;
  type: AnnouncementType;
  duration: AnnouncementDuration;
  createdAt: number;
  active: boolean;
  dismissedByUsers: string[];
};

const CURRENT_KEY = "grove_event_current_announcement";
const HISTORY_KEY = "grove_event_announcement_history";
export const ANNOUNCEMENT_EVENT = "grove-announcement-change";

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function announceChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ANNOUNCEMENT_EVENT));
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

export function getCurrentAnnouncement(): SiteAnnouncement | null {
  if (!canUseStorage()) return null;
  return parseJson<SiteAnnouncement | null>(localStorage.getItem(CURRENT_KEY), null);
}

export async function fetchCurrentAnnouncement(): Promise<SiteAnnouncement | null> {
  const remote = await request<SiteAnnouncement | { announcement: SiteAnnouncement | null } | null>("/api/event-announcement/current");
  if (remote !== undefined) {
    const announcement = remote && typeof remote === "object" && "announcement" in remote ? remote.announcement : remote;
    if (canUseStorage()) localStorage.setItem(CURRENT_KEY, JSON.stringify(announcement));
    return announcement;
  }
  const shared = await fetchSharedSiteState();
  if (shared) {
    const current = (shared.eventAnnouncement ?? null) as SiteAnnouncement | null;
    if (canUseStorage()) localStorage.setItem(CURRENT_KEY, JSON.stringify(current));
    return current;
  }
  return getCurrentAnnouncement();
}

export function getAnnouncementHistory(): SiteAnnouncement[] {
  if (!canUseStorage()) return [];
  return parseJson<SiteAnnouncement[]>(localStorage.getItem(HISTORY_KEY), []);
}

export async function fetchAnnouncementHistory(): Promise<SiteAnnouncement[]> {
  const remote = await request<SiteAnnouncement[]>("/api/event-announcement/history");
  if (remote) {
    if (canUseStorage()) localStorage.setItem(HISTORY_KEY, JSON.stringify(remote));
    return remote;
  }
  const shared = await fetchSharedSiteState();
  if (shared?.eventHistory) {
    const history = Array.isArray(shared.eventHistory) ? shared.eventHistory as SiteAnnouncement[] : [];
    if (canUseStorage()) localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return history;
  }
  return getAnnouncementHistory();
}

export function saveAnnouncement(input: Pick<SiteAnnouncement, "message" | "type" | "duration">) {
  if (!canUseStorage()) return null;

  const announcement: SiteAnnouncement = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    active: true,
    dismissedByUsers: [],
  };

  localStorage.setItem(CURRENT_KEY, JSON.stringify(announcement));
  localStorage.setItem(HISTORY_KEY, JSON.stringify([announcement, ...getAnnouncementHistory()].slice(0, 10)));
  announceChange();
  void request<SiteAnnouncement>("/api/event-announcement", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return announcement;
}

export async function publishAnnouncement(input: Pick<SiteAnnouncement, "message" | "type" | "duration">) {
  const remote = await customFetch<SiteAnnouncement>("/api/event-announcement", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    responseType: "json",
  });
  if (canUseStorage()) {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(remote));
    localStorage.setItem(HISTORY_KEY, JSON.stringify([remote, ...getAnnouncementHistory()].slice(0, 10)));
  }
  announceChange();
  return remote;
}

export function clearCurrentAnnouncement() {
  if (!canUseStorage()) return;
  const current = getCurrentAnnouncement();
  if (current) {
    const disabled = { ...current, active: false };
    localStorage.setItem(CURRENT_KEY, JSON.stringify(disabled));
  } else {
    localStorage.removeItem(CURRENT_KEY);
  }
  announceChange();
  void request<SiteAnnouncement | null>("/api/event-announcement/current", { method: "DELETE" });
}

export async function disableCurrentAnnouncement() {
  const remote = await request<SiteAnnouncement | null>("/api/event-announcement/current", { method: "DELETE" });
  if (remote !== undefined && canUseStorage()) localStorage.setItem(CURRENT_KEY, JSON.stringify(remote));
  if (remote === undefined) {
    clearCurrentAnnouncement();
    await patchSharedSiteState({ eventAnnouncement: getCurrentAnnouncement() });
  }
  announceChange();
}

export function getAnnouncementDismissKey(announcementId: string, userKey: string) {
  return `grove_event_dismissed_${announcementId}_${userKey}`;
}

export function dismissAnnouncement(announcementId: string, userKey: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(getAnnouncementDismissKey(announcementId, userKey), "true");
  const current = getCurrentAnnouncement();
  if (current?.id === announcementId && !current.dismissedByUsers.includes(userKey)) {
    localStorage.setItem(
      CURRENT_KEY,
      JSON.stringify({ ...current, dismissedByUsers: [...current.dismissedByUsers, userKey] })
    );
  }
  announceChange();
  void request<SiteAnnouncement | null>(`/api/event-announcement/${announcementId}/dismiss`, {
    method: "PATCH",
    body: JSON.stringify({ userKey }),
  });
  void patchSharedSiteState({ eventAnnouncement: getCurrentAnnouncement() });
}

export function isAnnouncementDismissed(announcementId: string, userKey: string) {
  if (!canUseStorage()) return false;
  return localStorage.getItem(getAnnouncementDismissKey(announcementId, userKey)) === "true";
}

export function durationToMs(duration: AnnouncementDuration) {
  if (duration === "10s") return 10000;
  if (duration === "30s") return 30000;
  if (duration === "60s") return 60000;
  return null;
}
