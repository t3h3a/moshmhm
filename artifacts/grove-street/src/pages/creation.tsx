import { Code2, Globe2, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function CreationPage() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2">صفحة الإنشاء</h1>
        <p className="text-muted-foreground">مواقع وتطبيقات حسب الطلب. السعر يحدد بعد معرفة الفكرة والتفاصيل داخل تذكرة الدعم.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { title: "إنشاء مواقع", icon: Globe2, desc: "متاجر، صفحات تعريفية، لوحات تحكم، صفحات هبوط، وربط دفع حسب الحاجة." },
          { title: "إنشاء تطبيقات", icon: Smartphone, desc: "تطبيقات موبايل أو ويب أب بواجهة مناسبة وفكرة واضحة حسب المتطلبات." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <Icon size={34} className="text-primary mb-4" />
              <h2 className="text-2xl font-black text-white mb-2">{item.title}</h2>
              <p className="text-white/70 mb-5 leading-7">{item.desc}</p>
              <Link href="/support">
                <Button className="bg-primary hover:bg-primary/90 font-bold">
                  <Code2 size={18} className="ml-2" />
                  تواصل مع الدعم للإنشاء
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-2xl p-5 text-sm leading-relaxed text-white/75" style={{ background: "hsl(142 70% 35% / 0.08)", border: "1px solid hsl(142 70% 35% / 0.22)" }}>
        سياسة الإنشاء: يبدأ العمل بعد الاتفاق على المتطلبات والسعر والمدة داخل تذكرة الدعم. السعر يختلف حسب عدد الصفحات، نظام الدفع، لوحة التحكم، التصميم، والاستضافة.
      </div>
    </div>
  );
}
