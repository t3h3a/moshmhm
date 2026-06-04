import { getUser } from "@/lib/auth";
import { getThemeForUser } from "@/lib/themeProfiles";

const AUDIO_KEY = "grove_audio_settings";
const SFX_KEY = "grove_sfx_settings";
const BACKGROUND_TRACKS = ["/audio/background/mus1.mpeg", "/audio/background/mus2.mpeg"];

function getBackgroundTracks(): string[] {
  const user = getUser();
  const theme = getThemeForUser(user?.gender);
  return theme.backgroundMusicPaths;
}

interface AudioSettings {
  enabled: boolean;
  volume: number;
}

function getAudioSettings(): AudioSettings {
  try {
    const s = localStorage.getItem(AUDIO_KEY);
    return s ? JSON.parse(s) : { enabled: true, volume: 0.04 };
  } catch {
    return { enabled: true, volume: 0.04 };
  }
}

function getSfxSettings(): AudioSettings {
  try {
    const s = localStorage.getItem(SFX_KEY);
    return s ? JSON.parse(s) : { enabled: true, volume: 0.5 };
  } catch {
    return { enabled: true, volume: 0.5 };
  }
}

let bgAudio: HTMLAudioElement | null = null;
let audioInitialized = false;
let currentTrack = 0;
let unlockArmed = false;

function armAudioUnlock() {
  if (unlockArmed || typeof window === "undefined") return;
  unlockArmed = true;

  const unlock = () => {
    unlockArmed = false;
    playMusic();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
}

export function initAudio() {
  if (audioInitialized) return;
  audioInitialized = true;
  const settings = getAudioSettings();
  if (settings.enabled) {
    playMusic();
  }
}

export function playMusic() {
  const tracks = getBackgroundTracks();
  if (!bgAudio) {
    bgAudio = new Audio(tracks[currentTrack % tracks.length]);
    bgAudio.loop = false;
    bgAudio.volume = getAudioSettings().volume;
    
    // Fallback: If female audio track fails to load, fallback to classic tracks!
    bgAudio.addEventListener("error", () => {
      if (bgAudio && bgAudio.src.includes("/female/")) {
        const fallbackSrc = bgAudio.src.replace("/female/", "/").replace(".mp3", ".mpeg");
        bgAudio.src = fallbackSrc;
        bgAudio.play().catch(() => {});
      }
    });

    bgAudio.addEventListener("ended", () => {
      const activeTracks = getBackgroundTracks();
      currentTrack = (currentTrack + 1) % activeTracks.length;
      if (bgAudio) {
        bgAudio.src = activeTracks[currentTrack % activeTracks.length];
        bgAudio.volume = getAudioSettings().volume;
        bgAudio.play().catch(armAudioUnlock);
      }
    });
  }

  // Update track source if the active track list has changed
  const currentSrc = bgAudio.src;
  const targetSrc = tracks[currentTrack % tracks.length];
  if (currentSrc && targetSrc && !currentSrc.endsWith(targetSrc)) {
    bgAudio.src = targetSrc;
  }

  bgAudio.play().catch(armAudioUnlock);
  localStorage.setItem(AUDIO_KEY, JSON.stringify({ ...getAudioSettings(), enabled: true }));
}

export function pauseMusic() {
  if (bgAudio) bgAudio.pause();
  localStorage.setItem(AUDIO_KEY, JSON.stringify({ ...getAudioSettings(), enabled: false }));
}

export function toggleMusic() {
  const settings = getAudioSettings();
  if (settings.enabled) {
    pauseMusic();
  } else {
    playMusic();
  }
}

export function setMusicVolume(volume: number) {
  const safeVolume = Math.min(Math.max(volume, 0), 0.08);
  if (bgAudio) bgAudio.volume = safeVolume;
  localStorage.setItem(AUDIO_KEY, JSON.stringify({ ...getAudioSettings(), volume: safeVolume }));
}

export function isMusicEnabled(): boolean {
  return getAudioSettings().enabled;
}

export function getMusicVolume(): number {
  return getAudioSettings().volume;
}

export function isSfxEnabled(): boolean {
  return getSfxSettings().enabled;
}

export function getSfxVolume(): number {
  return getSfxSettings().volume;
}

export function setSfxEnabled(enabled: boolean) {
  localStorage.setItem(SFX_KEY, JSON.stringify({ ...getSfxSettings(), enabled }));
}

export function setSfxVolume(volume: number) {
  localStorage.setItem(SFX_KEY, JSON.stringify({ ...getSfxSettings(), volume }));
}

export function playSfx(name: string) {
  const settings = getSfxSettings();
  if (!settings.enabled) return;
  const language = localStorage.getItem("grove-language") === "en" ? "en" : "ar";
  const suffix = language === "ar" ? "_ar" : "";
  
  const user = getUser();
  const theme = getThemeForUser(user?.gender);
  
  const targetSrc = `${theme.sfxBasePath}/${name}${suffix}.mp4`;
  const audio = new Audio(targetSrc);
  audio.volume = settings.volume;
  
  audio.onerror = () => {
    // Fallback: If female sfx fails to load, try the classic folder!
    if (targetSrc.includes("/female/")) {
      const fallbackAudio = new Audio(`/videos/sfx/${name}${suffix}.mp4`);
      fallbackAudio.volume = settings.volume;
      fallbackAudio.play().catch(() => {});
    }
  };

  audio.play().catch((err) => {
    // If browser blocks direct play (needs user gesture) or missing file
    if (targetSrc.includes("/female/")) {
      const fallbackAudio = new Audio(`/videos/sfx/${name}${suffix}.mp4`);
      fallbackAudio.volume = settings.volume;
      fallbackAudio.play().catch(() => {});
    }
  });
}
