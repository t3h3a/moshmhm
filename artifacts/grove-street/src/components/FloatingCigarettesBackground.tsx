import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useBackgroundEffectsEnabled } from "@/lib/background-effects";
import { getUser } from "@/lib/auth";
import { getThemeForUser } from "@/lib/themeProfiles";

type Particle = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  opacity: number;
  direction: "rise" | "cross" | "diagonal";
};

type GCParticle = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  opacity: number;
};

const DIRECTIONS: Particle["direction"][] = ["rise", "cross", "diagonal"];

function buildParticles(count: number) {
  return Array.from({ length: count }, (_, id): Particle => ({
    id,
    left: Math.round(Math.random() * 100),
    top: Math.round(Math.random() * 100),
    size: Number((0.72 + Math.random() * 0.62).toFixed(2)),
    duration: Math.round(18 + Math.random() * 17),
    delay: -Math.round(Math.random() * 28),
    rotation: Math.round(-35 + Math.random() * 70),
    opacity: Number((0.25 + Math.random() * 0.2).toFixed(3)),

    direction: DIRECTIONS[id % DIRECTIONS.length],
  }));
}

function buildGC(count: number) {
  return Array.from({ length: count }, (_, id): GCParticle => ({
    id,
    left: Math.round(Math.random() * 100),
    top: Math.round(Math.random() * 100),
    size: Number((0.42 + Math.random() * 0.28).toFixed(2)),
    duration: Math.round(20 + Math.random() * 18),
    delay: -Math.round(Math.random() * 22),
    rotation: Math.round(-180 + Math.random() * 360),
    opacity: Number((0.18 + Math.random() * 0.18).toFixed(3)),
  }));
}

export function FloatingCigarettesBackground({ density = "default" }: { density?: "default" | "low" }) {
  const enabled = useBackgroundEffectsEnabled();
  const user = getUser();
  const theme = getThemeForUser(user?.gender);
  const isFemale = user?.gender === "female";

  const particleCount = density === "low" ? 9 : 16;
  const particles = useMemo(() => buildParticles(particleCount), [particleCount]);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const gcCount = isMobile ? 2 : 6;
  const gcSprites = useMemo(() => buildGC(gcCount), [gcCount]);

  const isPerformanceMode = typeof window !== "undefined" && (document.body.classList.contains("performance-mode") || localStorage.getItem("grove-performance-mode") === "true");
  if (!enabled || isPerformanceMode) return null;

  const femaleEmojis = ["🎀", "⭐", "❤️", "🪐"];
  const mascotSrc = isFemale ? "/assets/female/characters/zomoroda-character.png" : "/assets/male/characters/gc-character.png";

  return (
    <div className="floating-cigarettes-layer" aria-hidden="true">
      {particles.map((particle) => {
        return (
          <span
            key={particle.id}
            className={isFemale ? `floating-cigarette-bow cigarette-${particle.direction}` : `floating-cigarette cigarette-${particle.direction}`}
            style={{
              "--left": `${particle.left}%`,
              "--top": `${particle.top}%`,
              "--scale": particle.size,
              "--duration": `${particle.duration}s`,
              "--delay": `${particle.delay}s`,
              "--rotation": `${particle.rotation}deg`,
              "--opacity": isFemale ? particle.opacity * 1.8 : particle.opacity,
            } as CSSProperties}
          >
            {isFemale ? (
              "🎀"
            ) : (
              <i className="cigarette-smoke" />
            )}
          </span>
        );
      })}

      {/* Mascot cutout sprites layered with cigarettes/emojis */}
      {gcSprites.map((g) => (
        <span
          key={`gc-${g.id}`}
          className="gc-sprite"
          style={{
            "--left": `${g.left}%`,
            "--top": `${g.top}%`,
            "--scale": g.size,
            "--duration": `${g.duration}s`,
            "--delay": `${g.delay}s`,
            "--rotation": `${g.rotation}deg`,
            "--opacity": g.opacity,
          } as CSSProperties}
        >
          <img
            src={mascotSrc}
            alt={isFemale ? "Luna" : "GC"}
            className="gc-sprite-img"
            draggable={false}
            onError={(e) => {
              const imgEl = e.currentTarget as HTMLImageElement;
              imgEl.style.display = "none";
              const parent = imgEl.parentElement as HTMLElement | null;
              if (parent) {
                const fb = parent.querySelector('.gc-sprite-fallback') as HTMLElement | null;
                if (fb) fb.style.display = 'flex';
              }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
          <div className="gc-sprite-fallback" style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.92)', fontWeight: 800 }}>
            <span style={{ fontSize: isFemale ? '14px' : '12px', color: isFemale ? 'hsl(330 85% 65%)' : 'inherit' }}>{isFemale ? "Luna" : "GC"}</span>
          </div>
        </span>
      ))}
    </div>
  );
}
