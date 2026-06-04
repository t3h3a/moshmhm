import { CheckCircle, Crown, Shield } from "lucide-react";

const RANK_COLORS: Record<string, string> = {
  Bronze: "#cd7f32",
  Silver: "#9ca3af",
  Gold: "#fbbf24",
  Diamond: "#60a5fa",
  Legend: "#ffd700",
  "أسطوري": "#ffd700",
  Nega: "#22c55e",
  Niga: "#22c55e",
  "نيقا": "#22c55e",
};

const RANK_ICONS: Record<string, string> = {
  Bronze: "B",
  Silver: "S",
  Gold: "G",
  Diamond: "D",
  Legend: "L",
  "أسطوري": "L",
  Nega: "N",
  Niga: "N",
  "نيقا": "N",
};

export function OwnerBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: "linear-gradient(135deg, #ffd700, #b8860b)", color: "#000" }}
      title="مالك النظام"
    >
      <Crown size={10} />
      OWNER
    </span>
  );
}

export function AdminBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: "linear-gradient(135deg, hsl(142 70% 35%), hsl(142 60% 25%))", color: "#fff" }}
      title="مشرف"
    >
      <Shield size={10} />
      ADMIN
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span className="instagram-verify" title="موثق">
      <CheckCircle size={13} />
    </span>
  );
}

export function RankBadge({ rank }: { rank: string }) {
  const color = RANK_COLORS[rank] ?? "#9ca3af";
  const icon = RANK_ICONS[rank] ?? "B";
  const isNega = rank === "Niga";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isNega ? "nega-rank-badge" : ""}`}
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {isNega ? <img src="/chargre-badge.png" alt="" className="h-4 w-4 rounded-full object-cover" /> : icon}
      {rank}
    </span>
  );
}
