import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingCart, Star } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PurchaseSuccessModal } from "@/components/PurchaseSuccessModal";
import { useToast } from "@/hooks/use-toast";
import { getUser } from "@/lib/auth";
import { playSfx } from "@/lib/audio";
import { getLanguage } from "@/lib/language";
import { getSticker } from "@/lib/stickers";
import {
  getGetMeQueryKey,
  getGetPointsQueryKey,
  getGetProductQueryKey,
  getGetWalletQueryKey,
  useCreateOrder,
  useGetProduct,
  useGetWallet,
} from "@workspace/api-client-react";

type InputField = {
  name: string;
  label: string;
  labelAr?: string;
  labelEn?: string;
  type: string;
  required: boolean;
};

const copy = {
  ar: {
    back: "رجوع",
    jod: "د.أ",
    points: "نقطة",
    stock: "متوفر",
    out: "نفدت الكمية",
    disabled: "الخدمة غير متاحة حاليا",
    disabledText: "هذه الخدمة موقوفة مؤقتا من الإدارة أو نفدت كميتها. يمكنك الرجوع لاحقا.",
    before: "تنبيه قبل الطلب",
    beforeText: "أدخل بيانات صحيحة ودقيقة. يمكنك متابعة حالة الطلب من صفحة طلباتي بعد الشراء.",
    socialTitle: "تنبيه مهم",
    socialText: "يجب أن يكون الحساب أو المنشور عاما وليس خاصا. تأكد من أن الرابط صحيح وأن الحساب أو المنشور غير محذوف. يمنع تغيير اسم المستخدم أو إغلاق الحساب أثناء تنفيذ الطلب. المتجر غير مسؤول عن أي تأخير أو فشل بسبب رابط خاطئ أو حساب خاص أو تغيير البيانات أثناء التنفيذ. خدمات المتابعين واللايكات والمشاهدات قد تنقص بعد التسليم وقد لا تكون النتائج ثابتة دائما.",
    info: "معلومات الطلب",
    wallet: "رصيد محفظتك",
    buy: "شراء الآن",
    buying: "جار الشراء...",
    loginRequired: "يجب تسجيل الدخول لإتمام الشراء",
    error: "خطأ",
    missing: "يرجى إدخال",
    badLink: "يرجى إدخال رابط صحيح للخدمة",
    failed: "فشلت عملية الشراء",
    unavailableToast: "الخدمة غير متاحة حاليا",
    minQuantity: "أقل كمية",
    perUnit: "السعر",
    quantity: "الكمية",
    total: "الإجمالي",
    forEach: "لكل",
    minQuantityError: "الحد الأدنى لهذه الخدمة هو",
    multipleError: "الكمية يجب أن تكون من مضاعفات",
  },
  en: {
    back: "Back",
    jod: "JOD",
    points: "points",
    stock: "Available",
    out: "Out of stock",
    disabled: "Service unavailable",
    disabledText: "This service is temporarily disabled by admin or out of stock. Please check again later.",
    before: "Before ordering",
    beforeText: "Enter accurate information. You can follow the order status from My Orders after purchase.",
    socialTitle: "Important notice",
    socialText: "Your account or post must be public and not private. Make sure the link is correct and the account or post is not deleted. Do not change the username or close the account during processing. The store is not responsible for delays or failed orders caused by wrong links, private accounts, or changed data. Followers, likes, views, and engagement services may drop after delivery and results are not always permanent.",
    info: "Order information",
    wallet: "Wallet balance",
    buy: "Buy now",
    buying: "Purchasing...",
    loginRequired: "You must log in to complete the purchase",
    error: "Error",
    missing: "Please enter",
    badLink: "Please enter a valid service link",
    failed: "Purchase failed",
    unavailableToast: "This service is currently unavailable",
    minQuantity: "Minimum quantity",
    perUnit: "Price",
    quantity: "Quantity",
    total: "Total",
    forEach: "per",
    minQuantityError: "Minimum quantity for this service is",
    multipleError: "Quantity must be a multiple of",
  },
};

function safeMoney(value: number) {
  return Number(value.toFixed(3));
}

export default function ProductPage() {
  const [, params] = useRoute("/products/:id");
  const id = parseInt(params?.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const lang = getLanguage() === "en" ? "en" : "ar";
  const t = copy[lang];

  const [inputData, setInputData] = useState<Record<string, string>>({});
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ productName: string; price: number; points: number; id: number } | null>(null);

  const { data: product, isLoading } = useGetProduct(id, { query: { queryKey: getGetProductQueryKey(id), enabled: !!id } });
  const { data: walletData } = useGetWallet({ query: { queryKey: getGetWalletQueryKey(), enabled: !!user } });
  const createOrderMutation = useCreateOrder();

  const p: any = product ?? { id, name: "Product", nameAr: "منتج", nameEn: "Product", price: 0, description: "", descriptionAr: "", descriptionEn: "", stock: 99, isActive: true, inputFields: "" };
  const isSocial = p.category === "social";
  const isQuantityBased = isSocial && (p.isQuantityBased === true || p.pricingType === "per_unit" || p.priceUnitAmount || p.unitQuantity);
  const priceUnitAmount = Math.max(1, Number(p.priceUnitAmount ?? p.unitQuantity ?? p.minQuantity ?? 1));
  const pricePerUnitJod = Number(p.pricePerUnitJod ?? p.price ?? 0);
  const minQuantity = Math.max(1, Number(p.minQuantity ?? priceUnitAmount));
  const quantityValue = String(inputData.quantity ?? (isQuantityBased ? minQuantity : ""));
  const quantityNumber = Number(quantityValue);
  const orderTotal = isQuantityBased && Number.isFinite(quantityNumber) && quantityNumber > 0
    ? safeMoney((quantityNumber / priceUnitAmount) * pricePerUnitJod)
    : Number(p.price ?? 0);
  const isOutOfStock = Number(p.stock ?? 0) <= 0;
  const isUnavailable = p.isActive === false || isOutOfStock;
  const productName = lang === "en" ? (p.nameEn || p.name) : (p.nameAr || p.name);
  const productDescription = lang === "en" ? (p.descriptionEn || p.description) : (p.descriptionAr || p.description);
  const pointsEarned = Math.floor(Number(orderTotal ?? 0)) * 10;
  const cleanPlaySticker = getSticker("clean_play");
  const outOfStockSticker = getSticker("out_of_stock");

  const inputFields: InputField[] = (() => {
    try {
      const parsed = p.inputFields ? JSON.parse(p.inputFields) : [];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return isSocial ? [{ name: "link", label: lang === "en" ? "Account or post link" : "رابط الحساب أو المنشور", type: "text", required: true }] : [];
      }
      return parsed.map((field: any) => ({
        name: String(field.name),
        label: lang === "en" ? (field.labelEn || field.label || field.name) : (field.labelAr || field.label || field.name),
        type: field.type || "text",
        required: field.required !== false,
      }));
    } catch {
      return [{ name: "player_id", label: lang === "en" ? "Player ID" : "رقم اللاعب أو المعرف", type: "text", required: true }];
    }
  })();

  const socialLink = () => {
    const direct = String(inputData.link ?? inputData.url ?? inputData.profileLink ?? inputData.videoLink ?? "").trim();
    if (direct) return direct;
    const linkField = inputFields.find((field) => /link|url|profile|post|video|channel/i.test(field.name));
    return String(linkField ? inputData[linkField.name] ?? "" : "").trim();
  };

  async function handlePurchase() {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (isUnavailable) {
      toast({ title: t.unavailableToast, description: t.disabledText, variant: "destructive" });
      return;
    }
    for (const field of inputFields) {
      if (field.required && !String(inputData[field.name] ?? "").trim()) {
        toast({ title: t.error, description: `${t.missing} ${field.label}`, variant: "destructive" });
        return;
      }
    }
    if (isSocial) {
      const link = socialLink();
      if (!/^https?:\/\/|^[\w.-]+\.[a-z]{2,}/i.test(link)) {
        toast({ title: t.error, description: t.badLink, variant: "destructive" });
        return;
      }
      if (isQuantityBased) {
        if (!Number.isFinite(quantityNumber) || quantityNumber < minQuantity) {
          toast({ title: t.error, description: `${t.minQuantityError} ${minQuantity}`, variant: "destructive" });
          return;
        }
        if (quantityNumber % priceUnitAmount !== 0) {
          toast({ title: t.error, description: `${t.multipleError} ${priceUnitAmount}`, variant: "destructive" });
          return;
        }
      }
    }

    try {
      const orderInputData = {
        ...inputData,
        ...(isQuantityBased ? {
          quantity: quantityNumber,
          unitAmount: priceUnitAmount,
          pricePerUnitJod,
          totalPriceJod: orderTotal,
        } : {}),
        ...(isSocial ? { socialLink: socialLink() } : {}),
      };
      const order = await createOrderMutation.mutateAsync({
        data: { productId: id, userInputData: JSON.stringify(orderInputData) },
      });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPointsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLastOrder({ productName: order.productNameAr || order.productName, price: order.price, points: order.pointsEarned, id: order.id });
      playSfx(order.price >= 100 ? "big_purchase" : "purchase_success");
      setSuccessOpen(true);
    } catch (error: any) {
      playSfx("not_enough_balance");
      toast({ title: t.error, description: error?.response?.data?.error ?? t.failed, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/2 rounded bg-muted" />
          <div className="h-40 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <button onClick={() => setLocation("/games")} className="flex items-center gap-2 text-muted-foreground hover:text-white mb-6 transition-colors" data-testid="button-back">
        <ArrowRight size={18} />
        <span>{t.back}</span>
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className={`rounded-2xl overflow-hidden mb-6 ${isUnavailable ? "grayscale opacity-75" : ""}`} style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="h-40 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(142 70% 35% / 0.2), hsl(142 20% 10%))" }}>
            <img src={p.imageUrl || "/images/logo/logo.png"} alt="" className="h-28 w-28 rounded-2xl bg-black/20 object-contain p-2" loading="lazy" />
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="text-2xl font-black text-white mb-1">{productName}</h1>
                {p.gameName && <p className="text-primary font-medium">{p.gameName}</p>}
              </div>
              <div className="text-end shrink-0">
                <p className="text-3xl font-black text-primary">{Number(isQuantityBased ? pricePerUnitJod : p.price ?? 0).toFixed(3)}</p>
                <p className="text-muted-foreground text-sm">{t.jod}</p>
              </div>
            </div>
            {productDescription && <p className="text-white/70 text-sm mb-4">{productDescription}</p>}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-primary"><Star size={14} />+{pointsEarned} {t.points}</span>
              <span className={isOutOfStock ? "font-bold text-red-300" : "text-muted-foreground"}>{isOutOfStock ? t.out : t.stock}</span>
              {isQuantityBased && <span className="text-white/45">{t.minQuantity}: {minQuantity}</span>}
              {isQuantityBased && <span className="text-white/45">{Number(pricePerUnitJod).toFixed(3)} {t.jod} {t.forEach} {priceUnitAmount}</span>}
            </div>
          </div>
        </div>

        {isUnavailable && (
          <div className="rounded-2xl p-5 mb-6 text-sm leading-relaxed flex items-center gap-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.24)" }}>
            <img src={outOfStockSticker.image} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <div>
              <p className="font-bold text-red-300 mb-1">{isOutOfStock ? t.out : t.disabled}</p>
              <p className="text-white/75">{t.disabledText}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl p-5 mb-6 text-sm leading-relaxed" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <p className="font-bold text-amber-400 mb-1">{t.before}</p>
          <p className="text-white/80">{t.beforeText}</p>
        </div>

        {isSocial && (
          <div className="rounded-2xl p-5 mb-6 text-sm leading-relaxed flex items-start gap-4" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.22)" }}>
            <img src={cleanPlaySticker.image} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <div>
              <p className="font-bold text-blue-300 mb-1">{t.socialTitle}</p>
              <p className="text-white/80">{lang === "en" ? (p.warningEn || t.socialText) : (p.warningAr || p.warningMessage || t.socialText)}</p>
            </div>
          </div>
        )}

        {isQuantityBased && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="grid gap-3 sm:grid-cols-3 mb-4 text-sm">
              <div className="rounded-xl p-3 bg-white/5">
                <p className="text-muted-foreground">{t.perUnit}</p>
                <p className="font-black text-primary">{Number(pricePerUnitJod).toFixed(3)} {t.jod} {t.forEach} {priceUnitAmount}</p>
              </div>
              <div className="rounded-xl p-3 bg-white/5">
                <p className="text-muted-foreground">{t.minQuantity}</p>
                <p className="font-black text-white">{minQuantity}</p>
              </div>
              <div className="rounded-xl p-3 bg-white/5">
                <p className="text-muted-foreground">{t.total}</p>
                <p className="font-black text-primary">{Number(orderTotal || 0).toFixed(3)} {t.jod}</p>
              </div>
            </div>
            <Label className="text-white mb-1.5 block">
              {t.quantity}
              <span className="text-destructive mx-1">*</span>
            </Label>
            <Input
              type="number"
              min={minQuantity}
              step={priceUnitAmount}
              value={quantityValue}
              onChange={(event) => setInputData((prev) => ({ ...prev, quantity: event.target.value }))}
              className={lang === "ar" ? "text-right" : "text-left"}
              data-testid="input-quantity"
            />
          </div>
        )}

        {inputFields.length > 0 && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h2 className="text-lg font-bold text-white mb-4">{t.info}</h2>
            <div className="space-y-4">
              {inputFields.map((field) => (
                <div key={field.name}>
                  <Label className="text-white mb-1.5 block">
                    {field.label}
                    {field.required && <span className="text-destructive mx-1">*</span>}
                  </Label>
                  <Input
                    type={field.type}
                    value={inputData[field.name] ?? ""}
                    onChange={(event) => setInputData((prev) => ({ ...prev, [field.name]: event.target.value }))}
                    placeholder={field.label}
                    className={lang === "ar" ? "text-right" : "text-left"}
                    data-testid={`input-${field.name}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {user && (
          <div className="rounded-xl p-4 mb-4 flex items-center justify-between" style={{ background: "hsl(142 70% 35% / 0.08)", border: "1px solid hsl(142 70% 35% / 0.2)" }}>
            <span className="text-muted-foreground text-sm">{t.wallet}</span>
            <span className="text-primary font-bold">{Number(walletData?.balance ?? user.walletBalance ?? 0).toFixed(2)} {t.jod}</span>
          </div>
        )}

        <Button onClick={handlePurchase} className="w-full bg-primary hover:bg-primary/90 font-bold py-5 text-lg" disabled={createOrderMutation.isPending || isUnavailable} data-testid="button-purchase">
          {isOutOfStock ? t.out : createOrderMutation.isPending ? t.buying : <><ShoppingCart size={20} className="mx-2" />{t.buy} - {Number(orderTotal || 0).toFixed(3)} {t.jod}</>}
        </Button>

        {!user && <p className="text-center text-sm text-muted-foreground mt-3">{t.loginRequired}</p>}
      </motion.div>

      {lastOrder && (
        <PurchaseSuccessModal
          open={successOpen}
          onClose={() => setSuccessOpen(false)}
          productName={lastOrder.productName}
          price={lastOrder.price}
          pointsEarned={lastOrder.points}
          orderId={lastOrder.id}
          newBalance={(walletData?.balance ?? user?.walletBalance ?? 0) - lastOrder.price}
        />
      )}
    </div>
  );
}
