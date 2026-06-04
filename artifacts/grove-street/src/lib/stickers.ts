export type StickerKey =
  | "order_received"
  | "topup_done"
  | "support_ready"
  | "clean_play"
  | "wallet_loaded"
  | "order_processing"
  | "fortune_ready"
  | "secret_rank_hint"
  | "out_of_stock"
  | "welcome";

export type StickerDefinition = {
  id: StickerKey;
  titleAr: string;
  titleEn: string;
  image: string;
  usage: string;
  fallback: string;
};

export const stickerRegistry: Record<StickerKey, StickerDefinition> = {
  order_received: {
    id: "order_received",
    titleAr: "وصل طلبك يا وحش",
    titleEn: "Your order is here",
    image: "/assets/stickers/wesltalabak.jpg",
    usage: "order_created_or_completed",
    fallback: "order",
  },
  topup_done: {
    id: "topup_done",
    titleAr: "تم الشحن",
    titleEn: "Top-up completed",
    image: "/assets/stickers/tmalsh7n.jpg",
    usage: "topup_completed",
    fallback: "topup",
  },
  support_ready: {
    id: "support_ready",
    titleAr: "لا تخاف الدعم معك",
    titleEn: "Support is with you",
    image: "/assets/stickers/lat5af.jpg",
    usage: "support_ticket_or_reply",
    fallback: "support",
  },
  clean_play: {
    id: "clean_play",
    titleAr: "العب النظيف و بس",
    titleEn: "Play clean only",
    image: "/assets/stickers/al3baln.jpg",
    usage: "warnings_sensitive_services",
    fallback: "warning",
  },
  wallet_loaded: {
    id: "wallet_loaded",
    titleAr: "الرصيد وصل",
    titleEn: "Balance received",
    image: "/assets/stickers/alrseedwasel.jpg",
    usage: "wallet_deposit_approved",
    fallback: "wallet",
  },
  order_processing: {
    id: "order_processing",
    titleAr: "طلبك بالطريق",
    titleEn: "Your order is on the way",
    image: "/assets/stickers/talabakfetareq.jpg",
    usage: "order_processing",
    fallback: "processing",
  },
  fortune_ready: {
    id: "fortune_ready",
    titleAr: "جرب حظك",
    titleEn: "Try your luck",
    image: "/assets/stickers/greb7dk.jpg",
    usage: "fortune_page_or_spin_added",
    fallback: "fortune",
  },
  secret_rank_hint: {
    id: "secret_rank_hint",
    titleAr: "في رتبة ما بنحكى",
    titleEn: "A secret rank is waiting",
    image: "/assets/stickers/fertbamaj7ka.jpg",
    usage: "near_secret_rank",
    fallback: "rank",
  },
  out_of_stock: {
    id: "out_of_stock",
    titleAr: "خلصت يا زعيم",
    titleEn: "Out of stock boss",
    image: "/assets/stickers/5lstyaz3em.jpg",
    usage: "out_of_stock_service",
    fallback: "stock",
  },
  welcome: {
    id: "welcome",
    titleAr: "منور جروف ستريت",
    titleEn: "Welcome to Grove Street",
    image: "/assets/stickers/mnwergroof.jpg",
    usage: "login_new_user_home_welcome",
    fallback: "welcome",
  },
};

export function getSticker(key: StickerKey) {
  return stickerRegistry[key] ?? stickerRegistry.welcome;
}
