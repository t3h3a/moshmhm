import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  Home, Gamepad2, Tag, ShoppingBag, User, Wallet, ClipboardList,
  Star, ShieldCheck, HeadphonesIcon, Settings, LayoutDashboard,
  Users, Package, Megaphone, Trophy, StoreIcon, Menu, X, Music, Music2, LockKeyhole, Gift, Hammer, FileText, LogOut, CircleDollarSign, Radio, Bell, MessageSquarePlus
} from "lucide-react";
import { AUTH_EVENT, getUser, isAdmin, setUser, clearUser } from "@/lib/auth";
import { isMusicEnabled, toggleMusic } from "@/lib/audio";
import { FloatingCigarettesBackground } from "@/components/FloatingCigarettesBackground";
import { LOGO_SRC } from "@/lib/branding";
import { getThemeForUser } from "@/lib/themeProfiles";
import { useLanguage } from "@/lib/language";
import { useGetMe, useGetPoints, useGetWallet, getGetWalletQueryKey, getGetPointsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { RankBadge, VerifiedBadge } from "@/components/UserBadge";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    label: "الرئيسية",
    items: [
      { href: "/", label: "الرئيسية", icon: Home },
      { href: "/games", label: "الشحن", icon: Gamepad2 },
      { href: "/gift-cards", label: "بطاقات الهدايا", icon: Gift },
      { href: "/activations", label: "تفعيلات ألعاب", icon: Package },
      { href: "/creation", label: "إنشاء", icon: Hammer },
      { href: "/offers", label: "العروض", icon: Tag },
      { href: "/fortune-wheel", label: "دولاب الحظ", icon: CircleDollarSign },
      { href: "/marketplace", label: "سوق الحسابات", icon: StoreIcon },
      { href: "/policies", label: "السياسات", icon: FileText },
    ],
  },
  {
    label: "حسابي",
    requiresAuth: true,
    items: [
      { href: "/profile", label: "الملف الشخصي", icon: User },
      { href: "/wallet", label: "المحفظة", icon: Wallet },
      { href: "/orders", label: "طلباتي", icon: ClipboardList },
      { href: "/points", label: "النقاط والرتب", icon: Star },
      { href: "/verification", label: "التحقق", icon: ShieldCheck },
      { href: "/suggestions", label: "اقتراحات وشكاوي", icon: MessageSquarePlus },
      { href: "/support", label: "الدعم", icon: HeadphonesIcon },
      { href: "/security", label: "الأمان", icon: LockKeyhole },
      { href: "/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

const adminNav = {
  label: "الإدارة",
  items: [
    { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/admin/users", label: "المستخدمون", icon: Users },
    { href: "/admin/orders", label: "الطلبات", icon: ClipboardList },
    { href: "/admin/deposits", label: "الإيداعات", icon: Wallet },
    { href: "/admin/services", label: "إدارة الخدمات", icon: Package },
    { href: "/admin/products", label: "المنتجات", icon: Package },
    { href: "/admin/games", label: "الألعاب", icon: Gamepad2 },
    { href: "/admin/ads", label: "الإعلانات", icon: Megaphone },
    { href: "/admin/notifications", label: "الإشعارات", icon: Bell },
    { href: "/admin/event", label: "إعلان مباشر", icon: Radio },
    { href: "/admin/rewards", label: "المكافآت والرتب", icon: Trophy },
    { href: "/admin/fortune-wheel", label: "تحكم الدولاب", icon: CircleDollarSign },
    { href: "/admin/marketplace", label: "سوق الحسابات", icon: StoreIcon },
    { href: "/admin/verification", label: "التحقق", icon: ShieldCheck },
    { href: "/admin/support", label: "الدعم", icon: HeadphonesIcon },
    { href: "/admin/settings", label: "الإعدادات", icon: Settings },
  ],
};

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const [user, setLocalUser] = useState(getUser());
  const musicEnabled = isMusicEnabled();
  
  const theme = getThemeForUser(user?.gender);
  const [logoSrc, setLogoSrc] = useState(theme.logo);

  useEffect(() => {
    setLogoSrc(theme.logo);
  }, [user?.gender]);
  const [language, setLanguage] = useLanguage();
  const { data: walletData } = useGetWallet({ query: { queryKey: getGetWalletQueryKey(), enabled: !!user, refetchInterval: 5000 } });
  const { data: pointsData } = useGetPoints({ query: { queryKey: getGetPointsQueryKey(), enabled: !!user, refetchInterval: 5000 } });
  const { data: meData } = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: !!user, refetchInterval: 8000 } });

  useEffect(() => {
    function syncUser() {
      setLocalUser(getUser());
    }

    window.addEventListener(AUTH_EVENT, syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener(AUTH_EVENT, syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    if (!user || !meData) return;
    const next = {
      ...user,
      ...meData,
      walletBalance: walletData?.balance ?? meData.walletBalance ?? user.walletBalance,
      points: pointsData?.points ?? meData.points ?? user.points,
      rank: pointsData?.rank ?? meData.rank ?? user.rank,
    };
    setUser(next);
    setLocalUser(next);
  }, [meData, walletData?.balance, pointsData?.points, pointsData?.rank]);

  const walletBalance = walletData?.balance ?? user?.walletBalance ?? 0;
  const points = pointsData?.points ?? user?.points ?? 0;
  const rank = pointsData?.rank ?? user?.rank ?? "Bronze";

  const groups = [...navGroups];
  if (user && isAdmin()) {
    groups.push(adminNav);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "hsl(var(--sidebar))", borderLeft: "1px solid hsl(var(--sidebar-border))" }}>
      <div className="p-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
        <div className="flex items-center justify-between">
          <Link href="/" onClick={onClose}>
            <span className="flex items-center gap-2">
              <img src={logoSrc} onError={() => setLogoSrc(LOGO_SRC)} alt="Grove Street" className="h-9 w-9 rounded-md object-contain" />
              <span className="text-xl font-black tracking-widest text-primary">GROVE STREET</span>
            </span>
          </Link>
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="px-2 py-1 rounded-lg text-xs font-bold text-muted-foreground hover:text-white transition-colors"
            title="Language"
            data-testid="button-toggle-language"
          >
            {language === "ar" ? "EN" : "AR"}
          </button>
          <button
            onClick={() => toggleMusic()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white transition-colors"
            title={musicEnabled ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
            data-testid="button-toggle-music"
          >
            {musicEnabled ? <Music size={16} className="text-primary" /> : <Music2 size={16} />}
          </button>
        </div>
        {user ? (
          <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-xl animate-fade-in" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2">
              <div className={`relative w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 ${rank === "Niga" ? "nega-avatar" : ""}`}>
                {user.name?.[0] ?? "U"}
                {(user.role === "owner" || user.role === "admin") && (
                  <span className="absolute -bottom-1 -right-1"><VerifiedBadge /></span>
                )}
              </div>
              <div className="text-right min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">{user.name}</p>
                <div className="mt-0.5 flex items-center gap-1">
                  <RankBadge rank={rank} />
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                clearUser();
                window.location.href = "/";
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
              title="تسجيل الخروج"
              data-testid="button-sidebar-logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2 animate-fade-in border-t border-white/5 pt-4">
            <Link href="/login" onClick={onClose} className="w-full">
              <div className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs py-2 rounded-lg text-center cursor-pointer transition-all">
                تسجيل الدخول
              </div>
            </Link>
            <Link href="/register" onClick={onClose} className="w-full">
              <div className="w-full border border-white/10 hover:bg-white/5 text-white font-bold text-xs py-2 rounded-lg text-center cursor-pointer transition-all">
                إنشاء حساب جديد
              </div>
            </Link>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-4">
        {groups.map(group => (
          <div key={group.label}>
            {group.requiresAuth && !user ? null : (
              <>
                <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        data-testid={`link-nav-${item.label}`}
                      >
                        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                          active
                            ? "bg-primary/15 text-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                        }`}>
                          <Icon size={18} className={active ? "text-primary" : ""} />
                          {item.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </nav>

      {user && (
        <div className="p-3 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الرصيد</span>
              <span className="text-primary font-bold">{Number(walletBalance).toFixed(2)} د.أ</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">النقاط</span>
              <span className="text-white font-bold">{Number(points).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">الرتبة</span>
              <RankBadge rank={rank} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdminArea = location.startsWith("/admin");

  const [user, setUserState] = useState(getUser());
  useEffect(() => {
    function syncUser() {
      setUserState(getUser());
    }
    window.addEventListener(AUTH_EVENT, syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener(AUTH_EVENT, syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const theme = getThemeForUser(user?.gender);
  const [logoSrc, setLogoSrc] = useState(theme.logo);
  useEffect(() => {
    setLogoSrc(theme.logo);
  }, [user?.gender]);

  const mobileNavItems = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/games", label: "الشحن", icon: Gamepad2 },
    { href: "/offers", label: "العروض", icon: Tag },
    { href: "/orders", label: "طلباتي", icon: ClipboardList },
    { href: "/profile", label: "حسابي", icon: User },
  ];

  return (
    <div className="relative flex h-screen overflow-hidden">
      <FloatingCigarettesBackground density={isAdminArea ? "low" : "default"} />

      {/* Desktop Sidebar */}
      <div className="relative z-10 hidden lg:flex w-64 flex-shrink-0 flex-col h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-72">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 left-4 p-2 rounded-lg bg-card text-white"
            data-testid="button-close-sidebar"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b sticky top-0 z-40"
          style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-white"
            style={{ background: "rgba(255,255,255,0.05)" }}
            data-testid="button-open-sidebar"
          >
            <Menu size={20} />
          </button>
          <span className="flex items-center gap-2">
            <img src={logoSrc} onError={() => setLogoSrc(LOGO_SRC)} alt="Grove Street" className="h-8 w-8 rounded-md object-contain" />
            <span className="text-lg font-black text-primary tracking-widest">GROVE STREET</span>
          </span>
          <div className="w-10" />
        </div>

        {!user && (
          <div className="w-full px-6 pt-6 animate-fade-in">
            <div 
              className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl border text-right"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                borderColor: "rgba(255,255,255,0.06)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                backdropFilter: "blur(8px)"
              }}
            >
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">انضم لمجتمع Grove Street المميز</h4>
                <p className="text-xs text-muted-foreground">
                  اكسب نقاطا مع الطلبات المكتملة، ارتق في الرتب، واستبدل مكافآت حصرية.
                </p>
              </div>
              <div className="flex gap-2.5 w-full md:w-auto">
                <Link href="/login" className="flex-1 md:flex-none">
                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90 font-bold px-5 py-4 text-xs">
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link href="/register" className="flex-1 md:flex-none">
                  <Button size="sm" variant="outline" className="w-full border-white/10 hover:bg-white/5 font-bold px-5 py-4 text-xs">
                    إنشاء حساب جديد
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
        <AssistantLauncher />

        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t"
          style={{ background: "hsl(var(--sidebar))", borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="flex items-center justify-around py-2">
            {mobileNavItems.map(item => {
              const Icon = item.icon;
              const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} data-testid={`link-mobile-nav-${item.label}`}>
                  <div className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}>
                    <Icon size={20} />
                    <span className="text-xs">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

