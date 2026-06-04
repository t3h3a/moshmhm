import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Archive, Edit2, Eye, Package, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getListProductsQueryKey, useDeleteProduct, useListProducts, useUpdateProduct } from "@workspace/api-client-react";
import { isAdmin } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { key: "topups", label: "الألعاب والشحن" },
  { key: "gift_cards", label: "بطاقات الهدايا" },
  { key: "subscriptions", label: "الاشتراكات" },
  { key: "social", label: "الرشق والخدمات الاجتماعية" },
  { key: "activations", label: "تفعيلات ألعاب" },
  { key: "creation", label: "خدمات رقمية" },
];

const activationCategory = categories.find((item) => item.key === "activations");
if (activationCategory) activationCategory.label = "التفعيلات";

export default function AdminServicesPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState(categories[0]!.key);
  const { data: products = [], isLoading } = useListProducts({ includeInactive: "true" } as any);
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const grouped = useMemo(() => {
    return products.filter((product: any) => {
      const category = product.category ?? "topups";
      if (activeCategory === "activations") return category === "activations" || /activation|تفعيل/i.test(String(product.name ?? "") + " " + String(product.nameAr ?? ""));
      return category === activeCategory;
    });
  }, [products, activeCategory]);

  async function toggleProduct(product: any) {
    await updateProduct.mutateAsync({ id: product.id, data: { isActive: product.isActive === false } });
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey({ includeInactive: "true" } as any) });
    toast({ title: product.isActive === false ? "تم تفعيل الخدمة" : "تم إخفاء الخدمة" });
  }

  async function archiveProduct(product: any) {
    const ok = window.confirm(`أرشفة ${product.nameAr || product.name}؟ سيختفي المنتج عن المستخدمين ويمكن إبقاؤه في سجل الإدارة.`);
    if (!ok) return;
    await deleteProduct.mutateAsync({ id: product.id });
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey({ includeInactive: "true" } as any) });
    toast({ title: "تمت أرشفة الخدمة", description: "تم إخفاء الخدمة عن المستخدمين بدون حذف بياناتها من السجل." });
  }

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Package size={28} className="text-primary" />
          <div>
            <h1 className="text-3xl font-black text-white">إدارة الخدمات</h1>
            <p className="mt-1 text-sm text-muted-foreground">نفس خدمات الواجهة العامة مع أدوات تعديل وتعطيل ومعاينة.</p>
          </div>
        </div>
        <Link href="/admin/products">
          <Button className="bg-primary font-bold hover:bg-primary/90">
            <Plus size={16} />
            إضافة أو تعديل منتج
          </Button>
        </Link>
      </header>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.key}
            onClick={() => setActiveCategory(category.key)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-bold transition ${
              activeCategory === category.key ? "border-primary bg-primary text-white" : "border-white/10 bg-card text-muted-foreground hover:text-white"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/70 p-10 text-center text-muted-foreground">
          لا توجد خدمات في هذا القسم بعد.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grouped.map((product: any) => {
            const isUnavailable = product.isActive === false || Number(product.stock ?? 9999) <= 0;
            return (
            <article key={product.id} className={`relative overflow-hidden rounded-2xl border p-4 transition ${isUnavailable ? "border-red-500/20 bg-zinc-900/70 grayscale" : "border-border bg-card"}`}>
              {isUnavailable && (
                <div className="absolute left-3 top-3 z-10 rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1 text-xs font-black text-red-300">
                  {Number(product.stock ?? 9999) <= 0 ? "نفذت الكمية" : "موقوف"}
                </div>
              )}
              <div className="mb-4 flex items-start gap-3">
                <img src={product.imageUrl || "/images/logo/logo.png"} alt="" className="h-16 w-16 rounded-xl bg-black/20 object-contain p-2" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-black text-white">{product.nameAr || product.name}</h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{product.descriptionAr || product.description || "بدون وصف"}</p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-black text-primary">{Number(product.price ?? 0).toFixed(2)} د.أ</span>
                <span className={`rounded-full px-3 py-1 font-bold ${product.isActive === false ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                  {product.isActive === false ? "مخفي" : "فعال"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/admin/products">
                  <Button variant="outline" className="w-full font-bold">
                    <Edit2 size={15} />
                    تعديل
                  </Button>
                </Link>
                <Button variant="outline" className="font-bold" onClick={() => toggleProduct(product)}>
                  {product.isActive === false ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {product.isActive === false ? "تفعيل" : "إيقاف"}
                </Button>
                <Link href={`/products/${product.id}`}>
                  <Button variant="ghost" className="w-full font-bold">
                    <Eye size={15} />
                    معاينة
                  </Button>
                </Link>
                <Link href="/admin/products">
                  <Button variant="ghost" className="w-full font-bold">
                    <Plus size={15} />
                    داخل القسم
                  </Button>
                </Link>
                <Button variant="ghost" className="col-span-2 font-bold text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => archiveProduct(product)}>
                  <Archive size={15} />
                  أرشفة آمنة
                </Button>
              </div>
            </article>
          )})}
        </div>
      )}
    </div>
  );
}
