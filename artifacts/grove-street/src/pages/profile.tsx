import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, LogOut, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getUser, clearUser, setUser } from "@/lib/auth";
import { OwnerBadge, AdminBadge, VerifiedBadge, RankBadge } from "@/components/UserBadge";
import { useGetMe, useUpdateUser, getGetMeQueryKey } from "@workspace/api-client-react";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const storedUser = getUser();
  const { data: freshUser } = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: !!storedUser, refetchOnMount: "always" } });
  const user = freshUser ?? storedUser;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const updateMutation = useUpdateUser();

  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);

  useEffect(() => {
    if (freshUser) setUser(freshUser);
  }, [freshUser]);

  if (!user) return null;

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({ id: user!.id, data: { name, phone } });
      const updated = { ...user, name, phone };
      localStorage.setItem("grove_user", JSON.stringify(updated));
      toast({ title: "تم الحفظ", description: "تم تحديث بياناتك بنجاح" });
      setEditing(false);
    } catch {
      const updated = { ...user, name, phone };
      localStorage.setItem("grove_user", JSON.stringify(updated));
      toast({ title: "تم الحفظ", description: "تم تحديث بياناتك" });
      setEditing(false);
    }
  }

  function handleLogout() {
    clearUser();
    setLocation("/");
    toast({ title: "تم تسجيل الخروج" });
  }

  const RANK_COLORS: Record<string, string> = { Bronze: "#cd7f32", Silver: "#9ca3af", Gold: "#fbbf24", Platinum: "#22d3ee", Diamond: "#60a5fa", Niga: "#22c55e", Nega: "#22c55e", "نيقا": "#22c55e" };
  const rankColor = RANK_COLORS[user.rank] ?? "#9ca3af";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-8">الملف الشخصي</h1>

      <motion.div className="space-y-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Avatar & Info */}
        <div className="rounded-2xl p-8 text-center"
          style={{ background: `linear-gradient(135deg, ${rankColor}15, hsl(var(--card)))`, border: `1px solid ${rankColor}33` }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-primary"
            style={{ background: "hsl(142 70% 35% / 0.15)", border: "2px solid hsl(142 70% 35% / 0.4)" }}>
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{user.name}</h2>
          <p className="text-muted-foreground mb-3">@{user.username}</p>
          <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
            {user.role === "owner" && <OwnerBadge />}
            {user.role === "admin" && <AdminBadge />}
            {user.isVerified && <VerifiedBadge />}
            <RankBadge rank={user.rank ?? "Bronze"} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-center mt-5">
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-2xl font-black text-primary">{(user.walletBalance ?? 0).toFixed?.(2) ?? 0}</p>
              <p className="text-xs text-muted-foreground">د.أ رصيد</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-2xl font-black text-white">{(user.points ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">نقطة</p>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">بيانات الحساب</h2>
            <Button size="sm" variant="outline" onClick={() => editing ? handleSave() : setEditing(true)} data-testid="button-edit-profile">
              {editing ? <><Save size={14} className="ml-1" />حفظ</> : <><Edit2 size={14} className="ml-1" />تعديل</>}
            </Button>
          </div>
          <div className="space-y-4">
            {[
              { label: "الاسم الكامل", value: editing ? undefined : user.name, field: "name", state: name, setState: setName },
              { label: "رقم الجوال", value: editing ? undefined : (user.phone || "—"), field: "phone", state: phone, setState: setPhone },
            ].map(row => (
              <div key={row.label}>
                <Label className="text-muted-foreground mb-1.5 block text-sm">{row.label}</Label>
                {editing ? (
                  <Input value={row.state} onChange={e => row.setState(e.target.value)} className="text-right" data-testid={`input-${row.field}`} />
                ) : (
                  <p className="text-white font-medium">{row.value}</p>
                )}
              </div>
            ))}
            {[
              { label: "البريد الإلكتروني", value: user.email },
              { label: "اسم المستخدم", value: `@${user.username}` },
              { label: "تاريخ التسجيل", value: user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "—" },
            ].map(row => (
              <div key={row.label}>
                <Label className="text-muted-foreground mb-1.5 block text-sm">{row.label}</Label>
                <p className="text-white font-medium">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        <Button variant="destructive" className="w-full py-4 font-bold" onClick={handleLogout} data-testid="button-logout">
          <LogOut size={18} className="ml-2" />
          تسجيل الخروج
        </Button>
      </motion.div>
    </div>
  );
}

