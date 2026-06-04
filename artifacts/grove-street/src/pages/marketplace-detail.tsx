import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, MapPin, Trophy, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetListing, getGetListingQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

function parseImageUrls(value: unknown) {
  const text = String(value ?? "");
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {}
  if (text.startsWith("data:image/")) return [text];
  return text.split(/\n|\|\|\|/).map((item) => item.trim()).filter(Boolean);
}

export default function MarketplaceDetailPage() {
  const [, params] = useRoute("/marketplace/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id ?? "0");
  const { toast } = useToast();

  const { data: listing, isLoading } = useGetListing(id, { query: { queryKey: getGetListingQueryKey(id), enabled: !!id && id !== 0 } });

  if (isLoading) {
    return <div className="p-6 max-w-2xl mx-auto"><div className="h-60 rounded-xl animate-pulse bg-muted" /></div>;
  }

  if (!listing) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <p className="text-lg font-black text-white">هذا الحساب غير متاح حالياً</p>
        <p className="mt-2 text-sm text-muted-foreground">قد يكون تحت المراجعة أو لم يتم نشره بعد.</p>
        <Button onClick={() => setLocation("/marketplace")} className="mt-5 bg-primary font-bold">العودة للسوق</Button>
      </div>
    );
  }

  const l = listing;
  const primaryImage = parseImageUrls(l.imageUrls)[0];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => setLocation("/marketplace")} className="flex items-center gap-2 text-muted-foreground hover:text-white mb-6" data-testid="button-back">
        <ArrowRight size={18} />
        <span>سوق الحسابات</span>
      </button>

      <motion.div className="space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="h-56 flex items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(142 70% 35% / 0.2), hsl(142 20% 8%))" }}>
            {primaryImage ? <img src={primaryImage} alt="" className="h-full w-full object-cover" /> : <span className="text-5xl font-black text-primary">{l.gameName?.substring(0, 2) ?? "GS"}</span>}
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-2xl font-black text-white flex-1 ml-3">{l.title}</h1>
              <div className="text-right">
                <p className="text-3xl font-black text-primary">{Number(l.price ?? 0).toFixed(2)}</p>
                <p className="text-muted-foreground text-sm">د.أ</p>
              </div>
            </div>
            <p className="text-white/70 mb-5">{l.description}</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { icon: Trophy, label: "الرتبة", value: l.rank },
                { icon: Layers, label: "المستوى", value: l.level ? String(l.level) : null },
                { icon: MapPin, label: "المنطقة", value: l.region },
                { icon: ShieldCheck, label: "البائع", value: l.sellerName },
              ].filter(r => r.value).map(row => (
                <div key={row.label} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                    <row.icon size={14} />
                    <span className="text-xs">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-white font-medium text-sm">{row.value}</p>
                    {row.label === "البائع" && l.sellerVerified && <ShieldCheck size={12} className="text-primary" />}
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90 font-bold py-5"
              onClick={() => toast({ title: "تم تسجيل الاهتمام", description: "تواصل الوساطة يتم عبر Grove Street فقط، وسيتم تجهيز تدفق الطلب لاحقاً." })}
              data-testid="button-buy-listing"
            >
              طلب شراء عبر الوسيط
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

