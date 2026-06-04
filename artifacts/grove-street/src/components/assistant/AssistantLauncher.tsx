import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language";
import GCAssistant from "./GCAssistant";
import { MessageSquare, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getUser } from "@/lib/auth";
import { getThemeForUser } from "@/lib/themeProfiles";

export default function AssistantLauncher() {
  const [lang] = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("grove-assistant-enabled") !== "false";
  });

  const user = getUser();
  const isFemale = user?.gender === "female";
  const launcherImage = isFemale ? "/assets/female/characters/zomoroda-character.png" : "/assets/male/characters/gc-character.png";
  const [hasLauncherImg, setHasLauncherImg] = useState(true);

  useEffect(() => {
    setHasLauncherImg(true);
  }, [user?.gender]);

  useEffect(() => {
    function handleToggle(event: Event) {
      const customEvent = event as CustomEvent<boolean>;
      setEnabled(customEvent.detail ?? true);
      if (!(customEvent.detail ?? true)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("grove-assistant-toggle", handleToggle);
    return () => window.removeEventListener("grove-assistant-toggle", handleToggle);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Floating launcher trigger button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed z-40 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-2xl cursor-pointer transition-all border border-primary/20
                   bottom-[85px] left-4 md:bottom-6 md:right-6 md:left-auto"
        style={{
          background: "hsl(var(--card))",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="button-assistant-launcher"
      >
        {isOpen ? (
          <X className="text-white w-5 h-5 md:w-6 md:h-6" />
        ) : (
          <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
            {hasLauncherImg ? (
              <img
                src={launcherImage}
                onError={() => setHasLauncherImg(false)}
                alt={isFemale ? "Luna" : "GC"}
                className="w-10 h-10 md:w-12 md:h-12 object-cover scale-110"
              />
            ) : (
              <span className={`text-sm font-black tracking-tighter ${isFemale ? "text-pink-400" : "text-primary"}`}>{isFemale ? "GG" : "GC"}</span>
            )}
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card animate-pulse" />
          </div>
        )}
      </motion.button>

      {/* Slide-in Chat Widget Window */}
      <AnimatePresence>
        {isOpen && (
          <GCAssistant
            onClose={() => setIsOpen(false)}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </>
  );
}
