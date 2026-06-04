import { Link } from "wouter";
import { motion } from "framer-motion";
import { Package, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useListProducts } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { getLanguage } from "@/lib/language";

type CategoryProductsPageProps = {
  category: string;
  title: string;
  description: string;
};

export function CategoryProductsPage({ category, title, description }: CategoryProductsPageProps) {
  const [search, setSearch] = useState("");
  const { data: products = [] } = useListProducts({ category });
  const lang = getLanguage();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product: any) => {
      const name = lang === "en" ? (product.nameEn || product.name || "") : (product.nameAr || product.name || "");
      return (
        name.toLowerCase().includes(q) ||
        (product.gameName || "").toLowerCase().includes(q)
      );
    });
  }, [products, search, lang]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-7 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
          <Package size={22} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === "en" ? "Search..." : "بحث..."} className="pr-10 text-right" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((product: any, index: number) => {
          const name = lang === "en" ? (product.nameEn || product.name) : (product.nameAr || product.name);
          return (
            <Link key={product.id} href={`/products/${product.id}`}>
              <motion.div
                className="h-full rounded-xl p-4 cursor-pointer"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                whileHover={{ scale: 1.02, borderColor: "hsl(142 70% 35% / 0.45)" }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="mb-3 h-24 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                  <img src={product.imageUrl || "/images/logo/logo.png"} alt="" className="h-16 w-16 object-contain" />
                </div>
                <p className="text-sm font-bold text-white leading-6">{name}</p>
                {product.gameName && <p className="text-xs text-muted-foreground mt-1">{product.gameName}</p>}
                
                {category === "activations" ? (
                  <div className="mt-3 text-xs text-muted-foreground border-t pt-2 space-y-1" style={{ borderColor: "hsl(var(--border))" }}>
                    <p className="text-primary font-bold">🎯 {lang === "en" ? "Headshot 80%" : "تفعيلة هيد شوت نسبة 80"}</p>
                    <p className="text-green-400 font-bold">🛡️ {lang === "en" ? "No Ban" : "بدون باند"}</p>
                    <p className="text-blue-400 font-bold">✨ {lang === "en" ? "With Warranty" : "مع ضمان"}</p>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between border-t pt-2" style={{ borderColor: "hsl(var(--border))" }}>
                    <span className="font-black text-primary">{product.price} {lang === "en" ? "JOD" : "د.أ"}</span>
                    <span className="text-xs text-muted-foreground">+{product.pointsEarned} {lang === "en" ? "Pts" : "نقطة"}</span>
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          {lang === "en" ? "No products found in this section." : "لا توجد منتجات حاليا في هذا القسم."}
        </div>
      )}
    </div>
  );
}

export default CategoryProductsPage;
