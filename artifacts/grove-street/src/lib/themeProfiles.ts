export interface ThemeProfile {
  id: string;
  nameAr: string;
  nameEn: string;
  gender: "male" | "female";
  colors: {
    primary: string;
    primaryHover: string;
    background: string;
    card: string;
    sidebar: string;
    sidebarBorder: string;
    border: string;
    ring: string;
  };
  backgroundEffects: {
    density: number;
    particles: string[];
    mascotImage: string;
  };
  backgroundMusicPaths: string[];
  sfxBasePath: string;
  particleType: "cigarettes" | "zomoroda";
  logo: string;
}

export const classicMaleTheme: ThemeProfile = {
  id: "classic_male",
  nameAr: "جروف ستريت كلاسيك",
  nameEn: "Grove Street Classic",
  gender: "male",
  colors: {
    primary: "142 70% 35%", // emerald green
    primaryHover: "142 70% 28%",
    background: "0 0% 4%",
    card: "0 0% 7%",
    sidebar: "0 0% 5%",
    sidebarBorder: "142 20% 12%",
    border: "142 20% 12%",
    ring: "142 70% 35%"
  },
  backgroundEffects: {
    density: 8,
    particles: ["cigarette", "gc"],
    mascotImage: "/assets/male/characters/gc-character.png",
  },
  backgroundMusicPaths: ["/assets/male/music/mus1.mpeg", "/assets/male/music/mus2.mpeg"],
  sfxBasePath: "/videos/sfx",
  particleType: "cigarettes",
  logo: "/assets/male/logo.png",
};

export const femaleZomorodaTheme: ThemeProfile = {
  id: "zomoroda_galaxy",
  nameAr: "كوكب زمردة",
  nameEn: "Zomoroda Galaxy",
  gender: "female",
  colors: {
    primary: "330 85% 65%", // Luxury pink/magenta
    primaryHover: "330 85% 55%",
    background: "290 20% 6%", // Deep cosmic purple
    card: "290 15% 10%",     // Soft purple card
    sidebar: "290 18% 8%",    // Deep sidebar purple
    sidebarBorder: "290 15% 15%",
    border: "290 15% 18%",
    ring: "330 85% 65%"
  },
  backgroundEffects: {
    density: 8,
    particles: ["🎀", "⭐", "❤️", "🪐"],
    mascotImage: "/assets/female/characters/zomoroda-character.png",
  },
  backgroundMusicPaths: ["/audio/background/female/mus1.mp3", "/audio/background/female/mus2.mp3"],
  sfxBasePath: "/videos/sfx/female",
  particleType: "zomoroda",
  logo: "/assets/female/logo.png",
};

export function getThemeForUser(gender: string | undefined): ThemeProfile {
  return gender === "female" ? femaleZomorodaTheme : classicMaleTheme;
}

export function injectThemeStyles(theme: ThemeProfile) {
  const existing = document.getElementById("grove-injected-theme");
  if (existing) {
    existing.remove();
  }

  const css = `
    :root, .dark {
      --primary: ${theme.colors.primary};
      --background: ${theme.colors.background};
      --card: ${theme.colors.card};
      --card-border: ${theme.colors.border};
      --sidebar: ${theme.colors.sidebar};
      --sidebar-border: ${theme.colors.sidebarBorder};
      --border: ${theme.colors.border};
      --ring: ${theme.colors.ring};
    }
    
    *::-webkit-scrollbar-track {
      background: hsl(${theme.colors.card});
      border-inline: 1px solid hsl(${theme.colors.border});
    }

    *::-webkit-scrollbar-thumb {
      border: 2px solid hsl(${theme.colors.card});
      background: linear-gradient(180deg, hsl(${theme.colors.primary}), hsl(${theme.colors.primaryHover}));
    }

    *::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, hsl(${theme.colors.primary}), hsl(${theme.colors.primaryHover}));
    }
  `;

  const style = document.createElement("style");
  style.id = "grove-injected-theme";
  style.innerHTML = css;
  document.head.appendChild(style);
}
