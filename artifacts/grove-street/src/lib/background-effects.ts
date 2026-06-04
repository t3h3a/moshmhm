import { useEffect, useState } from "react";

export const BACKGROUND_EFFECTS_KEY = "grove-background-effects";
export const BACKGROUND_EFFECTS_EVENT = "grove-background-effects-change";

export function areBackgroundEffectsEnabled() {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(BACKGROUND_EFFECTS_KEY);
  // default to enabled unless explicitly set to "false"
  return v === "false" ? false : true;
}

export function setBackgroundEffectsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BACKGROUND_EFFECTS_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent(BACKGROUND_EFFECTS_EVENT, { detail: enabled }));
}

export function useBackgroundEffectsEnabled() {
  const [enabled, setEnabled] = useState(areBackgroundEffectsEnabled);

  useEffect(() => {
    function syncStorage(event: StorageEvent) {
      if (event.key === BACKGROUND_EFFECTS_KEY) {
        setEnabled(areBackgroundEffectsEnabled());
      }
    }

    function syncLocal(event: Event) {
      setEnabled(Boolean((event as CustomEvent<boolean>).detail));
    }

    window.addEventListener("storage", syncStorage);
    window.addEventListener(BACKGROUND_EFFECTS_EVENT, syncLocal);
    return () => {
      window.removeEventListener("storage", syncStorage);
      window.removeEventListener(BACKGROUND_EFFECTS_EVENT, syncLocal);
    };
  }, []);

  return enabled;
}
