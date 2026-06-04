import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListListings, useListGames } from "@workspace/api-client-react";
import { getUser } from "@/lib/auth";

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

export default function MarketplacePage() {
  const [selectedGame, setSelectedGame] = useState(0);
  const user = getUser();

  const { data: gamesData } = useListGames();
  const { data: listingsData } = useListListings({ gameId: selectedGame || undefined });

  const games = gamesData ?? [];
  const listings = listingsData ?? [];
  const filtered = selectedGame ? listings.filter(l => l.gameId === selectedGame) : listings;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">سوق الحسابات</h1>
          <p className="text-muted-foreground">اشترِ وبع حسابات الألعاب بأمان تام</p>
        </div>
        {user && (
          <Link href="/marketplace/sell">
            <Button className="bg-primary hover:bg-primary/90 font-bold" data-testid="button-sell-account">
              <Plus size={18} className="ml-2" />
              بيع حسابك
            </Button>
          </Link>
        )}
      </div>

      {/* Game filter */}
      <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
        <button
          onClick={() => setSelectedGame(0)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all`}
          style={{
            background: selectedGame === 0 ? "hsl(142 70% 35%)" : "hsl(var(--card))",
            border: `1px solid ${selectedGame === 0 ? "hsl(142 70% 35%)" : "hsl(var(--border))"}`,
            color: selectedGame === 0 ? "white" : "hsl(var(--muted-foreground))",
          }}
          data-testid="button-game-filter-all"
        >
          كل الألعاب
        </button>
        {games.map(game => (
          <button
            key={game.id}
            onClick={() => setSelectedGame(game.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all`}
            style={{
              background: selectedGame === game.id ? "hsl(142 70% 35%)" : "hsl(var(--card))",
              border: `1px solid ${selectedGame === game.id ? "hsl(142 70% 35%)" : "hsl(var(--border))"}`,
              color: selectedGame === game.id ? "white" : "hsl(var(--muted-foreground))",
            }}
            data-testid={`button-game-filter-${game.id}`}
          >
            {game.nameAr}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((listing, i) => {
          const primaryImage = parseImageUrls(listing.imageUrls)[0];
          return (
          <Link key={listing.id} href={`/marketplace/${listing.id}`}>
            <motion.div
              className="group overflow-hidden rounded-2xl cursor-pointer"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              whileHover={{ scale: 1.02, borderColor: "hsl(142 70% 35% / 0.4)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              data-testid={`card-listing-${listing.id}`}
            >
              <div className="relative h-44 overflow-hidden"
                style={{ background: "linear-gradient(135deg, hsl(142 70% 35% / 0.15), hsl(142 20% 8%))" }}>
                {primaryImage ? (
                  <img src={primaryImage} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-4xl font-black text-primary">{listing.gameName?.substring(0, 2) ?? "GS"}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute bottom-3 right-3 rounded-full bg-primary/90 px-3 py-1 text-xs font-black text-white">وسيط آمن Grove Street</span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-bold leading-tight flex-1 ml-2">{listing.title}</h3>
                  <span className="text-primary font-black text-lg flex-shrink-0">{Number(listing.price ?? 0).toFixed(2)} د.أ</span>
                </div>
                <p className="text-muted-foreground text-xs mb-1">{listing.gameNameAr}</p>
                <p className="text-white/60 text-sm mb-3 line-clamp-2">{listing.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {listing.sellerVerified && <ShieldCheck size={12} className="text-primary" />}
                    <span>{listing.sellerName}</span>
                    {listing.sellerVerified && <span className="text-primary">Verified Seller</span>}
                  </div>
                  <div className="flex gap-2">
                    {listing.rank && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "hsl(142 70% 35% / 0.15)", color: "hsl(142 70% 35%)" }}>
                        {listing.rank}
                      </span>
                    )}
                    {listing.level ? <span className="text-xs text-muted-foreground">LV {listing.level}</span> : null}
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>
        )})}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-bold text-white">لا توجد حسابات متاحة حالياً</p>
          <p className="mt-2 text-sm">تابعنا قريباً</p>
        </div>
      )}
    </div>
  );
}

