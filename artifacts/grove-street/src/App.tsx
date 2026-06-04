import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { useEffect } from "react";
import { initAudio } from "@/lib/audio";
import { applySavedLanguage, setupLanguageObserver } from "@/lib/language";
import { AUTH_EVENT, getUser, setUser } from "@/lib/auth";
import { getThemeForUser, injectThemeStyles } from "@/lib/themeProfiles";
import { customFetch, useGetSettings } from "@workspace/api-client-react";
import { Hammer, Instagram, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EventAnnouncementOverlay } from "@/components/EventAnnouncementOverlay";
import { LuckyWheelReadyNotifier } from "@/components/LuckyWheelReadyNotifier";
import { parseSharedSocialLinks } from "@/lib/sharedSiteState";

// Pages
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import GamesPage from "@/pages/games";
import ProductPage from "@/pages/product";
import WalletPage from "@/pages/wallet";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import PointsPage from "@/pages/points";
import RanksPage from "@/pages/ranks";
import MarketplacePage from "@/pages/marketplace";
import MarketplaceSellPage from "@/pages/marketplace-sell";
import MarketplaceDetailPage from "@/pages/marketplace-detail";
import ProfilePage from "@/pages/profile";
import SupportPage from "@/pages/support";
import SupportDetailPage from "@/pages/support-detail";
import VerificationPage from "@/pages/verification";
import OffersPage from "@/pages/offers";
import SettingsPage from "@/pages/settings";
import SecurityPage from "@/pages/security";
import PoliciesPage from "@/pages/policies";
import SuggestionsPage from "@/pages/suggestions";
import CreationPage from "@/pages/creation";
import ActivationsPage from "@/pages/activations";
import GiftCardsPage from "@/pages/gift-cards";
import FortuneWheelPage from "@/pages/fortune-wheel";

// Admin Pages
import AdminDashboard from "@/pages/admin/index";
import AdminUsersPage from "@/pages/admin/users";
import AdminOrdersPage from "@/pages/admin/orders";
import AdminDepositsPage from "@/pages/admin/deposits";
import AdminProductsPage from "@/pages/admin/products";
import AdminServicesPage from "@/pages/admin/services";
import AdminGamesPage from "@/pages/admin/games";
import AdminAdsPage from "@/pages/admin/ads";
import AdminRewardsPage from "@/pages/admin/rewards";
import AdminFortuneWheelPage from "@/pages/admin/fortune-wheel";
import AdminMarketplacePage from "@/pages/admin/marketplace";
import AdminVerificationPage from "@/pages/admin/verification";
import AdminSupportPage from "@/pages/admin/support";
import AdminSuggestionsPage from "@/pages/admin/suggestions";
import AdminSettingsPage from "@/pages/admin/settings";
import AdminEventPage from "@/pages/admin/event";
import AdminNotificationsPage from "@/pages/admin/notifications";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const DEFAULT_INSTAGRAM_HANDLE = "thaerstore";

function getContactInstagram(settingsData?: any) {
  const socialLinks = parseSharedSocialLinks(settingsData?.socialLinks);
  if (socialLinks.instagram) return socialLinks.instagram;
  return localStorage.getItem("grove-contact-instagram") || DEFAULT_INSTAGRAM_HANDLE;
}

function InstagramFollowNotice() {
  const { toast } = useToast();

  useEffect(() => {
    const key = "grove-instagram-follow-notice-v1";
    if (localStorage.getItem(key) === "seen") return;
    localStorage.setItem(key, "seen");
    const timer = window.setTimeout(() => {
      toast({
        title: "تابعنا على إنستغرام",
        description: "رح ننزل عروض وفعاليات كثيرة على صفحتنا. تابعنا حتى ما يفوتك شيء.",
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return null;
}

function MaintenanceScreen({
  isFemale,
  bothSectionsClosed,
  contactPhone,
  instagramHandle,
  onSwitchToAvailable,
}: {
  isFemale: boolean;
  bothSectionsClosed: boolean;
  contactPhone: string;
  instagramHandle: string;
  onSwitchToAvailable?: () => void;
}) {
  useEffect(() => {
    if (bothSectionsClosed || !onSwitchToAvailable) return;
    const timer = window.setTimeout(onSwitchToAvailable, 7000);
    return () => window.clearTimeout(timer);
  }, [bothSectionsClosed, onSwitchToAvailable]);

  const cleanInstagramHandle = instagramHandle.replace(/^@/, "");
  const instagramUrl = `https://instagram.com/${cleanInstagramHandle}`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 text-center select-none"
      style={{
        background: isFemale ? "radial-gradient(circle at center, hsl(290 20% 12%) 0%, hsl(290 20% 6%) 100%)" : "radial-gradient(circle at center, hsl(0 0% 8%) 0%, hsl(0 0% 4%) 100%)"
      }}
    >
      <div
        className="w-full max-w-md p-8 rounded-3xl backdrop-blur-md border border-white/5 relative overflow-hidden space-y-6"
        style={{
          background: isFemale ? "hsla(290, 15%, 10%, 0.6)" : "hsla(0, 0%, 7%, 0.65)",
          boxShadow: isFemale ? "0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(219,39,119,0.15)" : "0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(34,197,94,0.1)"
        }}
      >
        <div className="relative flex items-center justify-center w-20 h-20 mx-auto rounded-2xl bg-primary/10 border border-primary/20 animate-pulse">
          <Hammer size={40} className="text-primary animate-spin" style={{ animationDuration: "12s" }} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">القسم قيد التطوير</h2>
          <p className="text-sm font-semibold" style={{ color: isFemale ? "hsl(330 85% 65%)" : "hsl(142 70% 35%)" }}>
            {bothSectionsClosed ? "القسمين مغلقين مؤقتاً للتحديث" : isFemale ? "قسم البنات قيد الصيانة والتحديث" : "قسم الذكور قيد الصيانة والتحديث"}
          </p>
        </div>

        {bothSectionsClosed ? (
          <div className="space-y-3 text-white/75 text-xs leading-relaxed max-w-sm mx-auto">
            <p>حالياً المتجر قيد التحديث بالكامل. للتواصل والطلبات المستعجلة تابعونا وتواصلوا معنا من القنوات التالية.</p>
            <div className="grid gap-2">
              <a href={contactPhone ? `tel:${contactPhone}` : undefined} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
                <Phone size={14} />
                {contactPhone || "سيتم إضافة الرقم قريباً"}
              </a>
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
                <Instagram size={14} />
                @{cleanInstagramHandle}
              </a>
            </div>
            <p className="text-primary font-bold">تابعونا على إنستغرام، رح يكون في عروض وفعاليات كثيرة.</p>
          </div>
        ) : (
          <p className="text-white/70 text-xs leading-relaxed max-w-sm mx-auto">
            سيتم تحويلك تلقائياً خلال 7 ثواني إلى القسم المتاح حالياً.
          </p>
        )}

        <div className="pt-2 text-[10px] text-muted-foreground">
          Grove Street Digital · 2026
        </div>
      </div>
    </div>
  );
}

function MainRouter() {
  const { data: settingsData } = useGetSettings();
  const [location] = useLocation();
  const user = getUser();
  
  const isFemale = user?.gender === "female";
  const isAdminOrOwner = user?.role === "admin" || user?.role === "owner";

  // Maintenance Checks
  const isGeneralMaintenance = settingsData?.maintenanceMode === true;
  const isBoysMaintenance = (settingsData as any)?.boysMaintenanceMode === true;
  const isGirlsMaintenance = (settingsData as any)?.girlsMaintenanceMode === true;
  const bothSectionsClosed = isBoysMaintenance && isGirlsMaintenance;
  const contactPhone = settingsData?.contactPhone || "";
  const instagramHandle = getContactInstagram(settingsData);

  const isAuthRoute = location === "/login" || location === "/register" || location === "/forgot-password";
  const showMaintenance = !isAuthRoute && !isAdminOrOwner && (
    isGeneralMaintenance || 
    (isFemale && isGirlsMaintenance) || 
    (!isFemale && isBoysMaintenance)
  );

  if (showMaintenance) {
    const availableGender = isGirlsMaintenance && !isBoysMaintenance ? "male" : "female";
    const shouldSwitch = !isGeneralMaintenance && !bothSectionsClosed;

    const switchToAvailable = shouldSwitch ? async () => {
      const current = getUser();
      if (current) {
        const nextUser = { ...current, gender: availableGender as "male" | "female" };
        setUser(nextUser);
        try {
          await customFetch("/api/auth/me", {
            method: "PATCH",
            body: JSON.stringify({ gender: availableGender }),
          });
        } catch {
          // Local fallback keeps the user on the available section until the API is reachable.
        }
      }
      window.location.href = "/";
    } : undefined;

    return (
      <MaintenanceScreen
        isFemale={isFemale}
        bothSectionsClosed={bothSectionsClosed || isGeneralMaintenance}
        contactPhone={contactPhone}
        instagramHandle={instagramHandle}
        onSwitchToAvailable={switchToAvailable}
      />
    );
  }

  return (
    <Switch>
      {/* Auth routes — no layout */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />

      {/* Main app routes — with layout */}
      <Route>
        {() => (
          <Layout>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/games" component={GamesPage} />
              <Route path="/gift-cards" component={GiftCardsPage} />
              <Route path="/fortune-wheel" component={FortuneWheelPage} />
              <Route path="/activations" component={ActivationsPage} />
              <Route path="/creation" component={CreationPage} />
              <Route path="/products/:id" component={ProductPage} />
              <Route path="/offers" component={OffersPage} />
              <Route path="/wallet" component={WalletPage} />
              <Route path="/orders" component={OrdersPage} />
              <Route path="/orders/:id" component={OrderDetailPage} />
              <Route path="/points" component={PointsPage} />
              <Route path="/ranks" component={RanksPage} />
              <Route path="/marketplace/sell" component={MarketplaceSellPage} />
              <Route path="/marketplace/:id" component={MarketplaceDetailPage} />
              <Route path="/marketplace" component={MarketplacePage} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/support" component={SupportPage} />
              <Route path="/support/:id" component={SupportDetailPage} />
              <Route path="/verification" component={VerificationPage} />
              <Route path="/security" component={SecurityPage} />
              <Route path="/policies" component={PoliciesPage} />
              <Route path="/suggestions" component={SuggestionsPage} />
              <Route path="/settings" component={SettingsPage} />
              {/* Admin routes */}
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/users" component={AdminUsersPage} />
              <Route path="/admin/orders" component={AdminOrdersPage} />
              <Route path="/admin/deposits" component={AdminDepositsPage} />
              <Route path="/admin/products" component={AdminProductsPage} />
              <Route path="/admin/services" component={AdminServicesPage} />
              <Route path="/admin/games" component={AdminGamesPage} />
              <Route path="/admin/ads" component={AdminAdsPage} />
              <Route path="/admin/rewards" component={AdminRewardsPage} />
              <Route path="/admin/fortune-wheel" component={AdminFortuneWheelPage} />
              <Route path="/admin/marketplace" component={AdminMarketplacePage} />
              <Route path="/admin/verification" component={AdminVerificationPage} />
              <Route path="/admin/support" component={AdminSupportPage} />
              <Route path="/admin/suggestions" component={AdminSuggestionsPage} />
              <Route path="/admin/settings" component={AdminSettingsPage} />
              <Route path="/admin/event" component={AdminEventPage} />
              <Route path="/admin/notifications" component={AdminNotificationsPage} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    applySavedLanguage();
    const cleanupLanguageObserver = setupLanguageObserver();
    initAudio();
    document.body.classList.toggle("performance-mode", localStorage.getItem("grove-performance-mode") === "true");

    function applyUserTheme() {
      const user = getUser();
      const theme = getThemeForUser(user?.gender);
      injectThemeStyles(theme);
    }

    applyUserTheme();

    window.addEventListener(AUTH_EVENT, applyUserTheme);
    window.addEventListener("storage", applyUserTheme);

    return () => {
      cleanupLanguageObserver();
      window.removeEventListener(AUTH_EVENT, applyUserTheme);
      window.removeEventListener("storage", applyUserTheme);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <InstagramFollowNotice />
          <LuckyWheelReadyNotifier />
          <MainRouter />
          <EventAnnouncementOverlay />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
