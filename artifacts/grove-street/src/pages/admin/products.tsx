import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, Package, Plus, Trash2, Edit2, Search, ArrowRight, Globe, Shield, LayoutGrid, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useListProducts, useCreateProduct, useDeleteProduct, useUpdateProduct, useListGames, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/auth";
import { getLanguage } from "@/lib/language";

const SERVICE_IMAGE_BY_GAME_ID: Record<number, string> = {
  1: "/images/services/games/free-fire.png",
  2: "/images/services/games/mobile-legends.png",
  3: "/images/services/games/pubg-mobile.png",
  5: "/images/services/games/call-of-duty-mobile.png",
  6: "/images/services/games/brawl-stars.png",
  7: "/images/services/games/jawaker.png",
  8: "/images/services/games/where-windos-meet.png",
  9: "/images/services/games/roblox.png",
  10: "/images/services/games/lords-mobile.png",
  11: "/images/services/games/delta-force.png",
  12: "/images/services/games/hay-day.png",
  17: "/images/services/games/clash-of-clans.png",
  18: "/images/services/games/clash-royale.png",
  19: "/images/services/games/ea-fc-mobile.png",
  20: "/images/services/games/blood-strike.png",
  21: "/images/services/games/fortnite.png",
  13: "/images/services/gift-cards/steam-gift-card.png",
  14: "/images/services/gift-cards/google-play-gift-card.png",
  15: "/images/services/gift-cards/playstation-gift-card.png",
  16: "/images/services/gift-cards/xbox-gift-card.png",
  22: "/images/services/gift-cards/itunes-us-gift-card.png",
  23: "/images/services/gift-cards/spotify-gift-card.png",
  24: "/images/services/gift-cards/discord-nitro.png",
  101: "/images/services/subscriptions/chatgpt.png",
  102: "/images/services/subscriptions/shahid.png",
  103: "/images/services/subscriptions/netflix.png",
  104: "/images/services/subscriptions/youtube-premium.png",
  105: "/images/services/subscriptions/snapchat-plus.png",
  106: "/images/services/subscriptions/gemini.png",
  201: "/images/services/social/whatsapp.png",
  202: "/images/services/social/instagram.png",
  203: "/images/services/social/tiktok.png",
  204: "/images/services/social/facebook.png",
  205: "/images/services/social/youtube.png",
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  topups: "/images/logo/logo.png",
  gift_cards: "/images/services/gift-cards/steam-gift-card.png",
  subscriptions: "/images/services/subscriptions/netflix.png",
  social: "/images/services/social/instagram.png",
  activations: "/sh7nfreefireicon.png",
};

const imageForGame = (game: any) =>
  SERVICE_IMAGE_BY_GAME_ID[Number(game?.id)] || game?.imageUrl || "/images/logo/logo.png";

const imageForProduct = (product: any) => {
  if (product?.imageUrl) return product.imageUrl;
  if (product?.gameId && SERVICE_IMAGE_BY_GAME_ID[Number(product.gameId)]) {
    return SERVICE_IMAGE_BY_GAME_ID[Number(product.gameId)];
  }
  return CATEGORY_FALLBACK_IMAGES[product?.category] || "/images/logo/logo.png";
};

const onImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget;
  if (!image.src.endsWith("/images/logo/logo.png")) {
    image.src = "/images/logo/logo.png";
  }
};

const CATEGORIES = [
  { id: "topups", labelAr: "شحن الألعاب", labelEn: "Game Topups" },
  { id: "gift_cards", labelAr: "بطاقات الهدايا", labelEn: "Gift Cards" },
  { id: "subscriptions", labelAr: "الاشتراكات الرقمية", labelEn: "Digital Subscriptions" },
  { id: "social", labelAr: "خدمات التواصل", labelEn: "Social Media Services" },
];

const GAME_GROUPS: Record<number, { id: string; titleAr: string; filter: (p: any) => boolean }[]> = {
  1: [
    { id: "ff-id", titleAr: "شحن جواهر عبر ID", filter: (p) => p.serviceGroupId === "ff-id-topup" || ((p.fulfillmentType === "api" || !p.fulfillmentType) && !p.nameAr.includes("عضوية") && !p.nameAr.includes("سيرفر") && !p.nameAr.includes("حساب") && !p.nameAr.includes("عالمي") && !p.nameAr.includes("MENA") && !p.nameAr.includes("الشرق الأوسط")) },
    { id: "ff-account", titleAr: "شحن جواهر عبر الحساب", filter: (p) => p.serviceGroupId === "ff-account-topup" || p.fulfillmentType === "manual" || p.nameAr.includes("حساب") },
    { id: "ff-membership", titleAr: "عضويات Free Fire", filter: (p) => p.serviceGroupId === "ff-membership" || p.nameAr.includes("عضوية") || p.nameAr.includes("Membership") || p.nameAr.includes("باس") },
    { id: "ff-global", titleAr: "شحن Global", filter: (p) => p.serviceGroupId === "ff-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("عالمي") || p.nameAr.includes("Global") },
    { id: "ff-mena", titleAr: "شحن الشرق الأوسط", filter: (p) => p.serviceGroupId === "ff-mena" || p.region?.toLowerCase() === "mena" || p.nameAr.includes("شرق أوسط") || p.nameAr.includes("MENA") || p.nameAr.includes("الشرق الأوسط") },
    { id: "ff-server", titleAr: "شحن حسب السيرفر", filter: (p) => p.serviceGroupId === "ff-server" || p.nameAr.includes("سيرفر") || p.nameAr.includes("Server") }
  ],
  3: [
    { id: "pubg-id", titleAr: "شحن UC عبر ID", filter: (p) => p.serviceGroupId === "pubg-id-topup" || ((p.fulfillmentType === "api" || !p.fulfillmentType) && !p.nameAr.includes("عالمي") && !p.nameAr.includes("Global") && !p.nameAr.includes("بطاقة") && !p.nameAr.includes("باس") && !p.nameAr.includes("Pass") && !p.nameAr.includes("حزمة") && !p.nameAr.includes("باقة خاصة")) },
    { id: "pubg-global", titleAr: "شحن UC Global", filter: (p) => p.serviceGroupId === "pubg-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("عالمي") || p.nameAr.includes("Global") },
    { id: "pubg-mena", titleAr: "شحن UC Middle East", filter: (p) => p.serviceGroupId === "pubg-mena" || p.region?.toLowerCase() === "mena" || p.nameAr.includes("شرق أوسط") || p.nameAr.includes("MENA") || p.nameAr.includes("الشرق الأوسط") || p.nameAr.includes("Middle East") },
    { id: "pubg-pass", titleAr: "Elite Pass", filter: (p) => p.serviceGroupId === "pubg-pass" || p.nameAr.includes("باس") || p.nameAr.includes("Pass") || p.nameAr.includes("Elite") },
    { id: "pubg-special", titleAr: "باقات خاصة", filter: (p) => p.serviceGroupId === "pubg-special" || p.nameAr.includes("حزمة") || p.nameAr.includes("باقة خاصة") || p.nameAr.includes("شحن شدات") },
    { id: "pubg-gift-cards", titleAr: "Gift Cards", filter: (p) => p.serviceGroupId === "pubg-gift-cards" || p.nameAr.includes("بطاقة") || p.nameAr.includes("Gift Card") || p.nameAr.includes("كود") || p.nameAr.includes("Code") }
  ],
  2: [
    { id: "ml-id", titleAr: "Diamonds عبر ID", filter: (p) => p.serviceGroupId === "ml-diamonds-id" || ((p.fulfillmentType === "api" || !p.fulfillmentType) && !p.nameAr.includes("عضوية") && !p.nameAr.includes("Pass") && !p.nameAr.includes("تركيا") && !p.nameAr.includes("إندونيسيا") && !p.nameAr.includes("الفلبين") && !p.nameAr.includes("ماليزيا") && !p.nameAr.includes("البرازيل") && !p.nameAr.includes("سنغافورة") && !p.nameAr.includes("تايلاند")) },
    { id: "ml-pass", titleAr: "Weekly Diamond Pass", filter: (p) => p.serviceGroupId === "ml-weekly-pass" || p.nameAr.includes("عضوية") || p.nameAr.includes("Pass") || p.nameAr.includes("Weekly") },
    { id: "ml-twilight", titleAr: "Twilight Pass", filter: (p) => p.serviceGroupId === "ml-twilight-pass" || p.nameAr.includes("Twilight") },
    { id: "ml-global", titleAr: "Global", filter: (p) => p.serviceGroupId === "ml-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("عالمي") || p.nameAr.includes("Global") }
  ],
  13: [
    { id: "steam-global", titleAr: "Steam Global", filter: (p) => p.serviceGroupId === "steam-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("عالمي") || p.nameAr.includes("Global") },
    { id: "steam-usa", titleAr: "Steam USA", filter: (p) => p.serviceGroupId === "steam-usa" || p.region?.toLowerCase() === "usa" || p.nameAr.includes("أمريكي") || p.nameAr.includes("USA") || p.nameAr.includes("US") },
    { id: "steam-turkey", titleAr: "Steam Turkey", filter: (p) => p.serviceGroupId === "steam-turkey" || p.region?.toLowerCase() === "turkey" || p.nameAr.includes("تركي") || p.nameAr.includes("Turkey") || p.nameAr.includes("TL") || p.nameAr.includes("TRY") }
  ],
  16: [
    { id: "xbox-global", titleAr: "Xbox Global", filter: (p) => p.serviceGroupId === "xbox-global" || p.region?.toLowerCase() === "global" || p.nameAr.includes("Global") || p.nameAr.includes("عالمي") },
    { id: "xbox-usa", titleAr: "Xbox USA", filter: (p) => p.serviceGroupId === "xbox-usa" || p.region?.toLowerCase() === "usa" || p.nameAr.includes("أمريكي") || p.nameAr.includes("USA") || p.nameAr.includes("US") },
    { id: "xbox-turkey", titleAr: "Xbox Turkey", filter: (p) => p.serviceGroupId === "xbox-turkey" || p.region?.toLowerCase() === "turkey" || p.nameAr.includes("تركي") || p.nameAr.includes("Turkey") || p.nameAr.includes("TL") || p.nameAr.includes("TRY") },
    { id: "xbox-europe", titleAr: "Xbox Europe", filter: (p) => p.serviceGroupId === "xbox-europe" || p.region?.toLowerCase() === "europe" || p.nameAr.includes("أوروبي") || p.nameAr.includes("Europe") || p.nameAr.includes("EUR") }
  ],
  9: [
    { id: "roblox-robux", titleAr: "شحن Robux", filter: (p) => p.serviceGroupId === "roblox-robux" || p.nameAr.includes("روبوكس") || p.nameAr.includes("Robux") },
    { id: "roblox-gift", titleAr: "Gift Cards", filter: (p) => p.serviceGroupId === "roblox-gift" || p.nameAr.includes("بطاقة") || p.nameAr.includes("Gift Card") }
  ],
  101: [
    { id: "chatgpt-monthly", titleAr: "اشتراكات شهرية", filter: (p) => p.serviceGroupId === "chatgpt-monthly" || p.nameAr.includes("شهر") || p.nameAr.includes("Month") },
    { id: "chatgpt-yearly", titleAr: "اشتراكات سنوية", filter: (p) => p.serviceGroupId === "chatgpt-yearly" || p.nameAr.includes("سنة") || p.nameAr.includes("Year") }
  ],
  102: [
    { id: "shahid-sports", titleAr: "شاهد VIP الرياضية", filter: (p) => p.serviceGroupId === "shahid-sports" || p.nameAr.includes("رياضة") || p.nameAr.includes("الرياضية") || p.nameAr.includes("Sports") },
    { id: "shahid-vip", titleAr: "شاهد VIP مسلسلات", filter: (p) => p.serviceGroupId === "shahid-vip" || (!p.nameAr.includes("رياضة") && !p.nameAr.includes("الرياضية") && !p.nameAr.includes("Sports")) }
  ],
  103: [
    { id: "netflix-screen", titleAr: "شاشة مشتركة", filter: (p) => p.serviceGroupId === "netflix-screen" || p.nameAr.includes("شاشة") || p.nameAr.includes("Screen") },
    { id: "netflix-full", titleAr: "حساب كامل", filter: (p) => p.serviceGroupId === "netflix-full" || p.nameAr.includes("كامل") || p.nameAr.includes("Full") }
  ],
  104: [
    { id: "youtube-individual", titleAr: "يوتيوب فردي", filter: (p) => p.serviceGroupId === "youtube-individual" || p.nameAr.includes("فردي") || p.nameAr.includes("Individual") || !p.nameAr.includes("عائلي") },
    { id: "youtube-family", titleAr: "يوتيوب عائلي", filter: (p) => p.serviceGroupId === "youtube-family" || p.nameAr.includes("عائلي") || p.nameAr.includes("Family") }
  ]
};

export default function AdminProductsPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const lang = getLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useListProducts({ includeInactive: "true" } as any);
  const { data: games = [] } = useListGames();
  const createMutation = useCreateProduct();
  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();

  // Navigation states mirroring games storefront
  const [selectedGame, setSelectedGame] = useState(0);
  const [category, setCategory] = useState("topups");
  const [activeGroup, setActiveGroup] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServer, setSelectedServer] = useState("Global");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const emptyForm = {
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    price: "",
    category: "topups",
    gameId: "",
    imageUrl: "",
    pointsEarned: "10",
    stock: "9999",
    fulfillmentType: "manual",
    isActive: "true",
    inputFields: "[]",
    warningMessage: "",
    internalNotes: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Set default group when selectedGame changes
  const activeGame = games.find((g: any) => g.id === selectedGame);
  const activeGameGroups = (() => {
    if (!selectedGame) return [];
    if (GAME_GROUPS[selectedGame]) return GAME_GROUPS[selectedGame];
    const gameName = (activeGame?.name || "").toLowerCase();
    const gameNameAr = (activeGame?.nameAr || "");
    if (gameName.includes("free fire") || gameNameAr.includes("فري فاير")) return GAME_GROUPS[1];
    if (gameName.includes("pubg") || gameNameAr.includes("ببجي")) return GAME_GROUPS[3];
    if (gameName.includes("mobile legends") || gameNameAr.includes("موبايل ليجيند")) return GAME_GROUPS[2];
    if (gameName.includes("steam") || gameNameAr.includes("ستيم")) return GAME_GROUPS[13];
    if (gameName.includes("xbox") || gameNameAr.includes("إكس بوكس")) return GAME_GROUPS[16];
    if (gameName.includes("roblox") || gameNameAr.includes("روبلوكس")) return GAME_GROUPS[9];
    if (gameName.includes("chatgpt")) return GAME_GROUPS[101];
    if (gameName.includes("shahid") || gameNameAr.includes("شاهد")) return GAME_GROUPS[102];
    if (gameName.includes("netflix") || gameNameAr.includes("نتفليكس")) return GAME_GROUPS[103];
    if (gameName.includes("youtube") || gameNameAr.includes("يوتيوب")) return GAME_GROUPS[104];
    return [{ id: "all-prod", titleAr: "جميع الباقات", filter: () => true }];
  })();

  useEffect(() => {
    if (activeGameGroups.length > 0) {
      setActiveGroup(activeGameGroups[0].id);
    } else {
      setActiveGroup("");
    }
  }, [selectedGame]);

  async function imageFileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function handleImageFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "ملف غير صالح", description: "اختر صورة فقط.", variant: "destructive" });
      return;
    }
    const dataUrl = await imageFileToDataUrl(file);
    setForm(prev => ({ ...prev, imageUrl: dataUrl }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.nameAr.trim() || !form.price) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (parseFloat(form.price) < 0) {
      toast({ title: "خطأ", description: "لا يمكن حفظ سعر سالب", variant: "destructive" });
      return;
    }
    try {
      JSON.parse(form.inputFields || "[]");
    } catch {
      toast({ title: "خطأ", description: "صيغة الحقول المطلوبة يجب أن تكون JSON صحيح", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        name: form.name,
        nameAr: form.nameAr,
        nameEn: form.name,
        description: form.description,
        descriptionAr: form.descriptionAr,
        descriptionEn: form.description,
        price: parseFloat(form.price),
        category: form.category,
        gameId: form.gameId ? parseInt(form.gameId) : undefined,
        imageUrl: form.imageUrl || undefined,
        pointsEarned: parseInt(form.pointsEarned),
        stock: parseInt(form.stock),
        fulfillmentType: form.fulfillmentType,
        isActive: form.isActive === "true",
        inputFields: form.inputFields || "[]",
        requiredFields: form.inputFields || "[]",
        warningMessage: form.warningMessage,
        internalNotes: form.internalNotes,
      } as any;
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMutation.mutateAsync({ data: payload });
      }
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey({ includeInactive: "true" } as any) });
      toast({ title: editingId ? "تم التعديل" : "تم الإضافة" });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  }

  function startEdit(product: any) {
    setEditingId(product.id);
    setForm({
      name: product.name ?? product.nameEn ?? "",
      nameAr: product.nameAr ?? "",
      description: product.description ?? product.descriptionEn ?? "",
      descriptionAr: product.descriptionAr ?? product.description ?? "",
      price: String(product.price ?? ""),
      category: product.category ?? "topups",
      gameId: product.gameId ? String(product.gameId) : "",
      imageUrl: product.imageUrl ?? "",
      pointsEarned: String(product.pointsEarned ?? 10),
      stock: String(product.stock ?? 9999),
      fulfillmentType: product.fulfillmentType ?? "manual",
      isActive: product.isActive === false ? "false" : "true",
      inputFields: product.inputFields ?? product.requiredFields ?? "[]",
      warningMessage: product.warningMessage ?? "",
      internalNotes: product.internalNotes ?? "",
    });
    setShowForm(true);
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey({ includeInactive: "true" } as any) });
      toast({ title: "تم الحذف" });
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  }

  // Filter lists like storefront games.tsx
  const gamesList = games.map((game: any) => ({ ...game, imageUrl: imageForGame(game) }));
  const productsList = products.map((product: any) => ({ ...product, imageUrl: imageForProduct(product) }));

  const displayedGames = gamesList.filter((g: any) => {
    if (category === "topups") return g.category === "topups" || !g.category;
    return g.category === category;
  });

  const searchedGamesList = displayedGames.filter((g: any) => {
    if (!searchQuery || selectedGame) return true;
    const query = searchQuery.toLowerCase();
    return g.nameAr.toLowerCase().includes(query) || g.name.toLowerCase().includes(query);
  });

  const filteredProducts = productsList.filter((p: any) => {
    let mappedGameId = p.gameId;
    if (!mappedGameId || mappedGameId === 0) {
      const name = (p.nameAr || p.name || "").toLowerCase();
      if (name.includes("chatgpt")) mappedGameId = 101;
      else if (name.includes("shahid") || name.includes("شاهد")) mappedGameId = 102;
      else if (name.includes("netflix") || name.includes("نتفليكس")) mappedGameId = 103;
      else if (name.includes("youtube") || name.includes("يوتيوب")) mappedGameId = 104;
      else if (name.includes("steam") || name.includes("ستيم")) mappedGameId = 13;
      else if (name.includes("google") || name.includes("جوجل")) mappedGameId = 14;
      else if (name.includes("playstation") || name.includes("بلايستيشن") || name.includes("psn")) mappedGameId = 15;
      else if (name.includes("xbox") || name.includes("إكس بوكس")) mappedGameId = 16;
      else if (name.includes("roblox") || name.includes("روبلوكس")) mappedGameId = 9;
      else if (name.includes("free fire") || name.includes("فري فاير")) mappedGameId = 1;
      else if (name.includes("pubg") || name.includes("ببجي")) mappedGameId = 3;
      else if (name.includes("mobile legends") || name.includes("موبايل ليجيند")) mappedGameId = 2;
    }

    if (selectedGame && mappedGameId !== selectedGame) return false;

    if (selectedGame && searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!p.nameAr.toLowerCase().includes(query) && !p.name?.toLowerCase().includes(query)) return false;
    }

    if (selectedGame && activeGroup) {
      const activeGrp = activeGameGroups.find(g => g.id === activeGroup);
      if (activeGrp && !activeGrp.filter(p)) return false;
    }

    return true;
  });

  const formatJod = (val: number) => `${val.toFixed(2)} د.أ`;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto min-h-screen relative">
      {/* Floating Add Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            className="rounded-2xl p-6 w-full max-w-3xl my-8 relative max-h-[90vh] overflow-y-auto shadow-2xl border" 
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2 className="text-xl font-black text-white mb-6 border-b border-white/10 pb-3">{editingId ? "تعديل حزمة منتج" : "إضافة منتج جديد"}</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { field: "name", label: "الاسم (English)", placeholder: "Product Name" },
                { field: "nameAr", label: "الاسم (العربية)", placeholder: "اسم المنتج" },
                { field: "price", label: "السعر (د.أ)", placeholder: "0.00", type: "number" },
                { field: "imageUrl", label: "رابط الصورة", placeholder: "/images/logo/logo.png" },
                { field: "pointsEarned", label: "النقاط المكتسبة", placeholder: "10", type: "number" },
                { field: "stock", label: "المخزون (الكمية)", placeholder: "9999", type: "number" },
              ].map(f => (
                <div key={f.field}>
                  <Label className="text-white mb-2 block text-xs font-bold">{f.label}</Label>
                  <Input type={f.type ?? "text"} step="any" value={form[f.field as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))} placeholder={f.placeholder} className="text-right h-10 bg-black/25" data-testid={`input-${f.field}`} />
                </div>
              ))}
              <div>
                <Label className="text-white mb-2 block text-xs font-bold">الوصف (English)</Label>
                <Input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="English description" className="text-left h-10 bg-black/25" dir="ltr" />
              </div>
              <div>
                <Label className="text-white mb-2 block text-xs font-bold">الوصف (العربية)</Label>
                <Input value={form.descriptionAr} onChange={e => setForm(prev => ({ ...prev, descriptionAr: e.target.value }))} placeholder="الوصف بالعربي" className="text-right h-10 bg-black/25" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white mb-2 block text-xs font-bold">الحقول المطلوبة من المستخدم (JSON)</Label>
                <Input
                  value={form.inputFields}
                  onChange={e => setForm(prev => ({ ...prev, inputFields: e.target.value }))}
                  placeholder='[{"name":"player_id","label":"Player ID","type":"text","required":true}]'
                  className="text-left font-mono text-xs h-10 bg-black/25"
                  dir="ltr"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white mb-2 block text-xs font-bold">رسالة تحذير قبل الطلب</Label>
                <Input value={form.warningMessage} onChange={e => setForm(prev => ({ ...prev, warningMessage: e.target.value }))} placeholder="تحذير يظهر للمستخدم قبل الطلب" className="text-right h-10 bg-black/25" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white mb-2 block text-xs font-bold">ملاحظات داخلية للأدمن</Label>
                <Input value={form.internalNotes} onChange={e => setForm(prev => ({ ...prev, internalNotes: e.target.value }))} placeholder="لا تظهر للمستخدم النهائي" className="text-right h-10 bg-black/25" />
              </div>
              <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/20 p-4">
                <Label className="text-white mb-3 block text-xs font-bold">تحميل/رفع صورة البطاقة</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <img src={form.imageUrl || "/images/logo/logo.png"} alt="" className="h-14 w-14 rounded-xl bg-primary/10 object-contain border border-white/10" />
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-primary/30 px-4 text-xs font-bold text-primary hover:bg-primary/10">
                    <ImagePlus size={14} />
                    رفع صورة مخصصة
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageFile(event.target.files?.[0])} />
                  </label>
                  <span className="text-[10px] text-muted-foreground">الرفع مدعوم للهواتف والكمبيوتر. سيتم حفظها كـ Base64</span>
                </div>
              </div>
              <div>
                <Label className="text-white mb-2 block text-xs font-bold">الفئة</Label>
                <Select value={form.category} onValueChange={v => setForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger className="h-10 bg-black/25"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["topups", "شحن ألعاب"], ["gift_cards", "بطاقات الهدايا"], ["subscriptions", "اشتراكات رقمية"], ["social", "رشق وخدمات سوشال"]].map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white mb-2 block text-xs font-bold">اللعبة / الخدمة</Label>
                <Select value={form.gameId} onValueChange={v => setForm(prev => ({ ...prev, gameId: v }))}>
                  <SelectTrigger className="h-10 bg-black/25"><SelectValue placeholder="اختر لعبة" /></SelectTrigger>
                  <SelectContent>
                    {games.map((g: any) => <SelectItem key={g.id} value={String(g.id)}>{g.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white mb-2 block text-xs font-bold">طريقة التنفيذ</Label>
                <Select value={form.fulfillmentType} onValueChange={v => setForm(prev => ({ ...prev, fulfillmentType: v }))}>
                  <SelectTrigger className="h-10 bg-black/25"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">يدوي</SelectItem>
                    <SelectItem value="api">API تلقائي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white mb-2 block text-xs font-bold">حالة الخدمة</Label>
                <Select value={form.isActive} onValueChange={v => setForm(prev => ({ ...prev, isActive: v }))}>
                  <SelectTrigger className="h-10 bg-black/25"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">فعالة وتظهر للمستخدم</SelectItem>
                    <SelectItem value="false">مخفية مؤقتاً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex gap-3 mt-4 border-t border-white/10 pt-4">
                <Button type="submit" className="bg-primary hover:bg-primary/90 font-bold" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-product">{editingId ? "حفظ التعديل" : "إضافة"}</Button>
                <Button type="button" variant="outline" className="font-bold" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}>إلغاء</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CLONED STOREFRONT INTERFACE */}
      <AnimatePresence mode="wait">
        {!selectedGame ? (
          // ----------------------------------------------------
          // STAGE 1: MAIN GAMES DIRECTORY GRID (ADMIN PORTAL)
          // ----------------------------------------------------
          <motion.div
            key="directory"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                  <Package size={28} className="text-primary" />
                  {lang === "en" ? "Manage Products & Services" : "إدارة المنتجات والباقات"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {lang === "en" ? "Add and configure packages and services from a premium mirror of the storefront" : "تعديل وإضافة باقات شحن الألعاب والبطاقات من واجهة متجر تفاعلية"}
                </p>
              </div>
              <Button onClick={() => {
                setForm({ ...emptyForm, category });
                setShowForm(true);
              }} className="bg-primary hover:bg-primary/90 font-bold">
                <Plus size={16} className="ml-1" />
                {lang === "en" ? "Add General Product" : "إضافة منتج عام"}
              </Button>
            </div>

            {/* Categories filter tabs with Add Product Button */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat.id}
                    variant={category === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setCategory(cat.id);
                      setSearchQuery("");
                    }}
                    className="flex-shrink-0 font-bold px-5"
                    data-testid={`button-category-${cat.id}`}
                  >
                    {lang === "en" ? cat.labelEn : cat.labelAr}
                  </Button>
                ))}
              </div>
              <Button 
                onClick={() => {
                  setForm({ ...emptyForm, category });
                  setShowForm(true);
                }} 
                className="bg-primary hover:bg-primary/90 font-bold text-xs h-9"
              >
                <Plus size={14} className="ml-1" />
                {lang === "en" ? `Add Product to ${CATEGORIES.find(c => c.id === category)?.labelEn}` : `إضافة منتج لقسم ${CATEGORIES.find(c => c.id === category)?.labelAr}`}
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === "en" ? "Search games or gift cards to edit packages..." : "ابحث عن لعبة أو بطاقة هدايا لتعديل باقاتها..."}
                className="pr-10 text-right h-11 bg-card/60"
                data-testid="input-search"
              />
            </div>

            {/* Games Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {searchedGamesList.map((game: any, i: number) => (
                <motion.div
                  key={game.id}
                  onClick={() => {
                    setSelectedGame(game.id);
                    setSearchQuery("");
                  }}
                  className="rounded-xl p-3 sm:p-4 cursor-pointer text-center relative overflow-hidden transition-all border border-border/40 flex flex-col justify-between items-center group min-h-[190px] sm:min-h-[215px]"
                  style={{ background: "hsl(var(--card))" }}
                  whileHover={{ scale: 1.03, borderColor: "hsl(142 70% 35% / 0.5)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  data-testid={`card-game-${game.id}`}
                >
                  <div className="w-full aspect-[4/3] max-h-32 sm:max-h-40 rounded-xl mx-auto mb-3 bg-primary/10 flex items-center justify-center overflow-hidden transition-all group-hover:bg-primary/20">
                    <img src={game.imageUrl || "/images/logo/logo.png"} onError={onImageError} alt={game.nameAr} className="h-full w-full object-contain p-1.5 sm:p-2 transition-transform group-hover:scale-105" />
                  </div>
                  <h3 className="text-white font-bold text-sm sm:text-base mb-1 line-clamp-2 min-h-[2.5rem] flex items-center justify-center max-w-full">
                    {lang === "en" ? (game.nameEn || game.name) : (game.nameAr || game.name)}
                  </h3>
                  <span className="text-[11px] sm:text-xs text-muted-foreground truncate max-w-full">{game.name}</span>
                </motion.div>
              ))}
            </div>

            {searchedGamesList.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <LayoutGrid size={48} className="mx-auto mb-4 opacity-40" />
                <p className="text-lg">{lang === "en" ? "No products in this category" : "لا توجد خدمات متاحة في هذا القسم حالياً"}</p>
              </div>
            )}
          </motion.div>
        ) : (
          // ----------------------------------------------------
          // STAGE 2: ORGANIZED DETAILED GAME PAGE (ADMIN VIEW)
          // ----------------------------------------------------
          <motion.div
            key="game-detail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 animate-fade-in"
          >
            {/* Header / Navigation back */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedGame(0)}
                  className="p-2.5 rounded-xl bg-card border border-border hover:bg-card/85 transition-all text-white"
                  data-testid="button-back-to-games"
                >
                  <ArrowRight size={18} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/20 overflow-hidden">
                    <img src={activeGame?.imageUrl || "/images/logo/logo.png"} onError={onImageError} alt="" className="h-full w-full object-contain p-1.5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-white">
                      {lang === "en" ? ((activeGame as any)?.nameEn || activeGame?.name) : ((activeGame as any)?.nameAr || activeGame?.name)}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">{lang === "en" ? "Admin control panel for this game's products and packages" : "لوحة إدارة باقات ومنتجات القسم والخدمات اليدوية والـ API"}</p>
                  </div>
                </div>
              </div>

              {/* Add Package inside Game */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button onClick={() => {
                  setForm({ ...emptyForm, category, gameId: String(selectedGame) });
                  setShowForm(true);
                }} className="bg-primary hover:bg-primary/90 font-bold shrink-0">
                  <Plus size={16} className="ml-1" />
                  {lang === "en" ? "Add Package to Game" : "إضافة باقة جديدة لهذا القسم"}
                </Button>

                <div className="relative w-full sm:w-48">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={lang === "en" ? "Search..." : "ابحث..."}
                    className="pr-9 text-right h-9 text-xs bg-card/60"
                  />
                </div>
              </div>
            </div>

            {/* Service groups Sub-tabs */}
            {activeGameGroups.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-white/[0.04] p-1">
                {activeGameGroups.map(grp => (
                  <Button
                    key={grp.id}
                    variant={activeGroup === grp.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveGroup(grp.id)}
                    className={`flex-shrink-0 text-xs font-bold rounded-lg px-4 h-9 ${
                      activeGroup === grp.id 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    {grp.titleAr}
                  </Button>
                ))}
              </div>
            )}

            {/* Server filter: if Server Tab is selected */}
            {activeGroup === "ff-server" && (
              <div className="flex items-center gap-3 bg-card/40 p-4 rounded-2xl border border-border/40">
                <Globe size={18} className="text-primary animate-pulse" />
                <Label className="text-white text-sm shrink-0">اختر السيرفر أولاً لتصفية الباقات المتاحة:</Label>
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger className="w-48 text-right text-xs bg-black/25">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Global", "MENA", "Europe", "Brazil", "Indonesia", "Thailand", "Vietnam", "Singapore", "Malaysia", "LATAM"].map(srv => (
                      <SelectItem key={srv} value={srv}>{srv}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts
                .filter((p: any) => {
                  if (activeGroup === "ff-server") {
                    const name = (p.nameAr || p.name || "").toLowerCase();
                    const srv = selectedServer.toLowerCase();
                    return name.includes(srv) || p.server?.toLowerCase() === srv;
                  }
                  return true;
                })
                .map((product: any, i: number) => {
                  const pointsEarned = Math.floor(product.price) * 10;
                  const productName = lang === "en" ? (product.nameEn || product.name) : (product.nameAr || product.name);
                  const isApi = product.fulfillmentType === "api";
                  const isOutOfStock = Number(product.stock ?? 0) <= 0;
                  const isActive = product.isActive !== false;

                  return (
                    <div 
                      key={product.id}
                      className="rounded-xl p-3 sm:p-4 h-full min-h-[260px] flex flex-col justify-between group transition-all relative border overflow-hidden"
                      style={{ 
                        background: "hsl(var(--card))", 
                        borderColor: !isActive ? "hsl(var(--destructive)/0.3)" : isOutOfStock ? "hsl(var(--warning)/0.3)" : "hsl(var(--border))" 
                      }}
                      data-testid={`card-product-${product.id}`}
                    >
                      {/* Controls Overlay - sleeker layout that transitions on hover */}
                      <div className="absolute top-2 left-2 flex gap-1.5 z-10">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="h-8 w-8 rounded-lg bg-black/75 hover:bg-primary text-white border border-white/10 transition-colors" 
                          onClick={() => startEdit(product)}
                        >
                          <Edit2 size={12} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="h-8 w-8 rounded-lg bg-red-600/90 hover:bg-red-700 text-white border border-red-500/20 transition-colors" 
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>

                      <div className="w-full aspect-[4/3] max-h-36 rounded-lg mb-3 flex items-center justify-center bg-primary/5 overflow-hidden transition-colors group-hover:bg-primary/10">
                        <img src={product.imageUrl || "/images/logo/logo.png"} onError={onImageError} alt="" className="h-full w-full object-contain p-1.5 sm:p-2 transition-transform group-hover:scale-105" />
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-white font-bold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">{productName}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${!isActive ? "bg-red-500/10 text-red-400" : isOutOfStock ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400"}`}>
                            {!isActive 
                              ? (lang === "en" ? "Hidden" : "مخفية") 
                              : isOutOfStock 
                                ? (lang === "en" ? "Out of Stock" : "نفدت الكمية") 
                                : (lang === "en" ? `Stock: ${product.stock}` : `مخزون: ${product.stock}`)
                            }
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground font-semibold">
                            {isApi ? (lang === "en" ? "Instant (API)" : "شحن فوري (API)") : (lang === "en" ? "Manual" : "شحن يدوي")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] mt-auto">
                        <span className="text-primary font-black text-sm">{formatJod(product.price)}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Star size={8} className="text-primary fill-primary" />
                          +{pointsEarned}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-20 text-muted-foreground">
                  <LayoutGrid size={36} className="mx-auto mb-3 opacity-40 animate-pulse" />
                  <p className="text-sm">{lang === "en" ? "No products found inside this game tab" : "لا توجد باقات متوفرة في هذا القسم حالياً"}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
