import { useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ExternalLink, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListAds } from "@workspace/api-client-react";
import { AD_IMAGES } from "@/lib/branding";
import { playSfx } from "@/lib/audio";

export default function OffersPage() {
  const { data: adsData } = useListAds();

  useEffect(() => {
    playSfx("offers_opened");
  }, []);

  const ads = Array.isArray(adsData)
    ? adsData.map((ad, index) => ({
        id: ad.id,
        titleAr: ad.titleAr || ad.title || "عرض",
        descriptionAr: ad.descriptionAr || ad.description || "",
        buttonTextAr: ad.buttonTextAr || ad.buttonText || "اعرف المزيد",
        linkUrl: ad.linkUrl || "/games",
        imageUrl: (ad as any).imageUrl || AD_IMAGES[index % AD_IMAGES.length],
        pinned: Boolean((ad as any).pinned),
      }))
    : [];

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6" dir="rtl">
      <div className="mb-8 flex items-center gap-3">
        <Tag size={28} className="text-primary" />
        <div>
          <h1 className="text-3xl font-black text-white">العروض</h1>
          <p className="mt-1 text-sm text-muted-foreground">العروض الفعالة التي ينشرها الأدمن فقط.</p>
        </div>
      </div>

      {ads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/70 p-10 text-center">
          <p className="text-lg font-bold text-white">لا توجد عروض فعالة حاليا</p>
          <p className="mt-2 text-sm text-muted-foreground">تابعنا قريبا.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {ads.map((ad, index) => (
            <motion.div
              key={ad.id}
              className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-5"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              data-testid={`card-ad-${ad.id}`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,197,94,0.18),transparent_35%)]" />
              <div className="relative">
                {ad.pinned && <span className="mb-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">مثبت</span>}
                <img src={ad.imageUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" loading="lazy" />
                <h3 className="mb-3 text-xl font-black leading-tight text-white">{ad.titleAr}</h3>
                <p className="mb-5 text-sm leading-7 text-white/70">{ad.descriptionAr}</p>
                <Link href={ad.linkUrl}>
                  <Button className="bg-primary font-bold hover:bg-primary/90" data-testid={`button-ad-cta-${ad.id}`}>
                    {ad.buttonTextAr}
                    <ExternalLink size={14} className="mr-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
