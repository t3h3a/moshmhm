import { useState } from "react";
import type { CSSProperties } from "react";
import { useBackgroundEffectsEnabled } from "@/lib/background-effects";
import { getUser } from "@/lib/auth";
import { getThemeForUser } from "@/lib/themeProfiles";

export function GCCharacterShowcase() {
  const effectsEnabled = useBackgroundEffectsEnabled();
  const user = getUser();
  const isFemale = user?.gender === "female";
  const mascotSrc = isFemale ? "/assets/female/characters/zomoroda-character.png" : "/assets/male/characters/gc-character.png";
  const [hasImage, setHasImage] = useState(true);

  return (
    <div
      className={`gc-character-showcase ${effectsEnabled ? "effects-on" : "effects-off"}`}
      aria-hidden="true"
      style={{} as CSSProperties}
    >
      {/* card.png background */}
      <div className="gc-card-bg">
        <img
          src="/card.png"
          alt=""
          className="gc-card-image"
          draggable={false}
        />
      </div>

      {/* mascot cutout animated floating */}
      <div className="gc-floating-char">
        {hasImage ? (
          <img
            src={mascotSrc}
            alt={isFemale ? "Luna" : "GC"}
            className="gc-sprite-animated"
            draggable={false}
            onError={() => setHasImage(false)}
          />
        ) : (
          <div className="gc-char-fallback animate-pulse">
            <span style={{ color: isFemale ? "hsl(330 85% 65%)" : "inherit", textShadow: isFemale ? "0 0 18px rgba(219,39,119,0.4)" : "inherit" }}>
              {isFemale ? "Luna" : "GC"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
