import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Info, Megaphone, PartyPopper, Tag, X } from "lucide-react";
import { getUser } from "@/lib/auth";
import {
  ANNOUNCEMENT_EVENT,
  dismissAnnouncement,
  durationToMs,
  fetchCurrentAnnouncement,
  getCurrentAnnouncement,
  isAnnouncementDismissed,
  type AnnouncementType,
  type SiteAnnouncement,
} from "@/lib/announcements";

const TYPE_META: Record<AnnouncementType, { label: string; icon: any; accent: string }> = {
  general: { label: "إعلان مباشر", icon: Megaphone, accent: "hsl(var(--primary))" },
  offer: { label: "عرض خاص", icon: Tag, accent: "#fbbf24" },
  warning: { label: "تنبيه مهم", icon: Info, accent: "#f97316" },
  celebration: { label: "احتفال", icon: PartyPopper, accent: "#22c55e" },
  info: { label: "معلومة", icon: Gift, accent: "#38bdf8" },
};

function getUserKey() {
  const user = getUser();
  return String(user?.id ?? user?.phone ?? user?.username ?? user?.name ?? "guest");
}

export function EventAnnouncementOverlay() {
  const [announcement, setAnnouncement] = useState<SiteAnnouncement | null>(null);

  function applyAnnouncement(current: SiteAnnouncement | null) {
    const userKey = getUserKey();
    if (!current?.active || !current.message.trim() || isAnnouncementDismissed(current.id, userKey)) {
      setAnnouncement(null);
      return;
    }
    setAnnouncement(current);
  }

  useEffect(() => {
    applyAnnouncement(getCurrentAnnouncement());
    fetchCurrentAnnouncement().then(applyAnnouncement);
    const poll = window.setInterval(() => fetchCurrentAnnouncement().then(applyAnnouncement), 10000);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes("grove_event")) applyAnnouncement(getCurrentAnnouncement());
    };
    const onEvent = () => applyAnnouncement(getCurrentAnnouncement());
    window.addEventListener("storage", onStorage);
    window.addEventListener(ANNOUNCEMENT_EVENT, onEvent);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ANNOUNCEMENT_EVENT, onEvent);
    };
  }, []);

  useEffect(() => {
    if (!announcement) return;
    const ms = durationToMs(announcement.duration);
    if (!ms) return;
    const timer = window.setTimeout(() => {
      dismissAnnouncement(announcement.id, getUserKey());
      setAnnouncement(null);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [announcement?.id]);

  if (!announcement) return null;

  const meta = TYPE_META[announcement.type] ?? TYPE_META.general;
  const Icon = meta.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/15 bg-card p-6 text-right shadow-2xl shadow-black/60"
          dir="rtl"
          initial={{ opacity: 0, y: 22, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.97 }}
          transition={{ duration: 0.22 }}
        >
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background: `radial-gradient(circle at 86% 0%, ${meta.accent}33, transparent 42%), linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.015))`,
            }}
          />
          <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full blur-3xl" style={{ background: `${meta.accent}33` }} />
          <div className="relative">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  dismissAnnouncement(announcement.id, getUserKey());
                  setAnnouncement(null);
                }}
                className="rounded-xl border border-white/10 bg-black/20 p-2 text-muted-foreground transition hover:bg-white/10 hover:text-white"
                aria-label="إغلاق الإعلان"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white">
                  {meta.label}
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-black/25 shadow-lg" style={{ color: meta.accent }}>
                  <Icon size={24} />
                </span>
              </div>
            </div>
            <p className="whitespace-pre-wrap break-words text-xl font-black leading-10 text-white drop-shadow-sm">
              {announcement.message}
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: "44%", background: meta.accent }} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
