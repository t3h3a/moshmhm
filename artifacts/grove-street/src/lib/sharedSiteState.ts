import { customFetch } from "@workspace/api-client-react";

type SettingsResponse = {
  socialLinks?: unknown;
};

function parseSocialLinks(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return value.trim() ? { instagram: value.trim() } : {};
  }
}

export async function fetchSharedSiteState(): Promise<Record<string, any> | null> {
  try {
    const settings = await customFetch<SettingsResponse>("/api/admin/settings", { responseType: "json" });
    return parseSocialLinks(settings?.socialLinks);
  } catch {
    return null;
  }
}

export async function patchSharedSiteState(patch: Record<string, any>): Promise<Record<string, any> | null> {
  const current = await fetchSharedSiteState();
  if (!current) return null;
  const next = { ...current, ...patch };
  try {
    const settings = await customFetch<SettingsResponse>("/api/admin/settings", {
      method: "PATCH",
      responseType: "json",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ socialLinks: JSON.stringify(next) }),
    });
    return parseSocialLinks(settings?.socialLinks);
  } catch {
    return null;
  }
}

export function parseSharedSocialLinks(value: unknown): Record<string, any> {
  return parseSocialLinks(value);
}
