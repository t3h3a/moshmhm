import {
  classicMaleTheme,
  femaleZomorodaTheme,
  getThemeForUser,
  type ThemeProfile,
} from "@/lib/themeProfiles";

export type PersonaMode = "male" | "female";

export const malePersona = classicMaleTheme;
export const femalePersona = femaleZomorodaTheme;

export function getActivePersona(persona: string | undefined): ThemeProfile {
  return getThemeForUser(persona);
}
