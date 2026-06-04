import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Save, Users, Search, Filter, Shield, Plus, Minus, FileText, Wallet, Ban, CheckCircle, X, ChevronRight, ShoppingBag, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getListUsersQueryKey, useListUsers, useUpdateUser, useListAllOrders, useListAllDeposits } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isAdmin, getUser as getLoggedInUser } from "@/lib/auth";
import { AdminBadge, OwnerBadge, RankBadge, VerifiedBadge } from "@/components/UserBadge";
import {
  DEFAULT_FORTUNE_USER_CONFIG,
  FORTUNE_AUTO_PRIZE,
  FORTUNE_PRIZES,
  fetchFortuneUserConfig,
  getAvailableBonusSpins,
  getFortuneGlobalConfig,
  getFortuneUserKey,
  persistFortuneUserConfig,
  type FortuneUserConfig,
} from "@/lib/fortuneWheel";

const RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Legend", "Niga"];
const ROLES = ["user", "admin", "owner"];

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const loggedInUser = getLoggedInUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Queries
  const { data: users = [], isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey(), refetchInterval: 5000 } });
  const { data: allOrders = [] } = useListAllOrders();
  const { data: allDeposits = [] } = useListAllDeposits();
  
  const updateMutation = useUpdateUser();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [filterVerified, setFilterVerified] = useState("all");
  const [filterRank, setFilterRank] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGender, setFilterGender] = useState("all");

  // Selection Detail Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [fortuneConfig, setFortuneConfig] = useState<FortuneUserConfig>(DEFAULT_FORTUNE_USER_CONFIG);

  // Safety checker
  function isSuperAdmin(email: string) {
    return email === "tthhaaeeeerr@gmail.com" || email === "qtybhrbas774@gmail.com";
  }

  useEffect(() => {
    if (!selectedUser) return;
    fetchFortuneUserConfig(getFortuneUserKey(selectedUser)).then(setFortuneConfig);
  }, [selectedUser?.id]);

  async function saveSelectedUserFortuneConfig() {
    if (!selectedUser) return;
    setFortuneConfig(await persistFortuneUserConfig(getFortuneUserKey(selectedUser), fortuneConfig));
    toast({ title: "تم حفظ تحكم الدولاب", description: "تم تحديث اللفات ونسبة الحظ والجائزة القادمة لهذا المستخدم." });
  }

  function startEdit(user: any) {
    setEditingUser(user);
    setDraft({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
      rank: user.rank ?? "Bronze",
      walletBalance: user.walletBalance ?? 0,
      points: user.points ?? 0,
      isVerified: Boolean(user.isVerified),
      isBanned: Boolean(user.isBanned),
      gender: user.gender ?? "male",
      password: "",
    });
  }

  async function handleQuickAction(userId: number, fieldUpdates: Record<string, any>, successMsg: string) {
    const userToEdit = users.find(u => u.id === userId);
    if (!userToEdit) return;

    if (isSuperAdmin(userToEdit.email)) {
      if (fieldUpdates.role !== undefined || fieldUpdates.isBanned !== undefined) {
        toast({ title: "عملية ممنوعة", description: "لا يمكن تعديل صلاحيات أو حظر حساب الإدارة العليا", variant: "destructive" });
        return;
      }
    }

    try {
      await updateMutation.mutateAsync({ id: userId, data: fieldUpdates as any });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      
      // Update selectedUser modal state if it's active
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser((prev: any) => ({ ...prev, ...fieldUpdates }));
      }
      
      toast({ title: "نجحت العملية", description: successMsg });
    } catch {
      toast({ title: "خطأ", description: "فشل تنفيذ العملية الإدارية", variant: "destructive" });
    }
  }

  async function handleBalanceAdjustment(add: boolean) {
    if (!selectedUser) return;
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0) {
      toast({ title: "مبلغ غير صحيح", description: "يرجى كتابة مبلغ صحيح أكبر من صفر", variant: "destructive" });
      return;
    }

    const currentBalance = parseFloat(String(selectedUser.walletBalance ?? 0));
    const newBalance = add ? (currentBalance + val) : (currentBalance - val);

    if (newBalance < 0) {
      toast({ title: "عملية مرفوضة", description: "لا يمكن خصم مبلغ يجعل رصيد المحفظة سالباً", variant: "destructive" });
      return;
    }

    await handleQuickAction(
      selectedUser.id,
      { walletBalance: newBalance },
      add ? `تمت إضافة ${val.toFixed(2)} د.أ لمحفظة المستخدم` : `تم خصم ${val.toFixed(2)} د.أ من محفظة المستخدم`
    );
    setAmountInput("");
  }

  async function handlePointsAdjustment(add: boolean) {
    if (!selectedUser) return;
    const val = parseInt(pointsInput, 10);
    if (isNaN(val) || val <= 0) {
      toast({ title: "نقاط غير صحيحة", description: "يرجى كتابة عدد نقاط صحيح أكبر من صفر", variant: "destructive" });
      return;
    }

    const currentPoints = parseInt(String(selectedUser.points ?? 0), 10);
    const newPoints = add ? (currentPoints + val) : (currentPoints - val);

    if (newPoints < 0) {
      toast({ title: "عملية مرفوضة", description: "لا يمكن خصم نقاط تجعل رصيد النقاط سالباً", variant: "destructive" });
      return;
    }

    await handleQuickAction(
      selectedUser.id,
      { points: newPoints },
      add ? `تمت إضافة ${val} نقطة لرصيد المستخدم` : `تم خصم ${val} نقطة من رصيد المستخدم`
    );
    setPointsInput("");
  }

  async function handlePasswordReset() {
    if (!selectedUser) return;
    const nextPassword = resetPasswordInput.trim();
    if (nextPassword.length < 6) {
      toast({ title: "كلمة سر غير صالحة", description: "اكتب كلمة سر جديدة من 6 أحرف على الأقل.", variant: "destructive" });
      return;
    }

    await handleQuickAction(
      selectedUser.id,
      { password: nextPassword },
      "تم تعيين كلمة سر جديدة للمستخدم. أعطه البريد وكلمة السر الجديدة فقط."
    );
    setResetPasswordInput("");
  }

  async function saveDraft(userId: number) {
    try {
      const payload = { ...draft };
      if (!payload.password) delete payload.password;
      
      const userToEdit = users.find(u => u.id === userId);
      if (userToEdit && isSuperAdmin(userToEdit.email)) {
        delete payload.role;
        delete payload.isBanned;
      }

      await updateMutation.mutateAsync({ id: userId, data: payload as any });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setEditingUser(null);
      
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser((prev: any) => ({ ...prev, ...payload }));
      }
      
      toast({ title: "تم الحفظ", description: "تم تحديث بيانات المستخدم بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل تحديث بيانات المستخدم", variant: "destructive" });
    }
  }

  // Filter Logic
  const filteredUsers = users.filter((u) => {
    // 1. Search Query
    const query = search.trim().toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.phone && u.phone.toLowerCase().includes(query)) ||
      u.username.toLowerCase().includes(query);

    // 2. Verification Filter
    const matchesVerified =
      filterVerified === "all" ||
      (filterVerified === "verified" && u.isVerified) ||
      (filterVerified === "unverified" && !u.isVerified);

    // 3. Rank Filter
    const matchesRank = filterRank === "all" || u.rank === filterRank;

    // 4. Status Filter
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "banned" && u.isBanned) ||
      (filterStatus === "active" && !u.isBanned);

    // 5. Gender Filter
    const matchesGender =
      filterGender === "all" ||
      u.gender === filterGender;

    return matchesSearch && matchesVerified && matchesRank && matchesStatus && matchesGender;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <Users size={28} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">إدارة الأعضاء والمستخدمين</h1>
          <p className="text-muted-foreground text-sm">البحث، فلترة وتعديل رصيد ونقاط مستخدمي Grove Street بالكامل</p>
        </div>
      </div>

      {/* Control Bar (Search & Filter) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-2xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، البريد، الجوال..."
            className="text-right pr-9 bg-black/25 text-xs h-10"
          />
        </div>

        {/* Verification Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">التوثيق:</span>
          <Select value={filterVerified} onValueChange={setFilterVerified}>
            <SelectTrigger className="h-10 bg-black/25 text-xs text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="verified">موثق فقط</SelectItem>
              <SelectItem value="unverified">غير موثق</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rank Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">الرتبة:</span>
          <Select value={filterRank} onValueChange={setFilterRank}>
            <SelectTrigger className="h-10 bg-black/25 text-xs text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Account Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">الحالة:</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-10 bg-black/25 text-xs text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="banned">محظور</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gender Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">الجنس:</span>
          <Select value={filterGender} onValueChange={setFilterGender}>
            <SelectTrigger className="h-10 bg-black/25 text-xs text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="male">ذكور ♂</SelectItem>
              <SelectItem value="female">إناث ♀</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Grid List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl animate-pulse bg-muted/40" />)}</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-white/5 rounded-2xl">
          <p className="text-sm">لم يتم العثور على مستخدمين يطابقون خيارات البحث.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user, i) => {
            const shownRank = user.rank ?? "Bronze";
            const isSuper = isSuperAdmin(user.email);
            return (
              <motion.div
                key={user.id}
                className="rounded-2xl p-5 cursor-pointer relative hover:scale-[1.01] transition-all flex flex-col justify-between"
                style={{ background: "hsl(var(--card))", border: user.isBanned ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid hsl(var(--border))" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setSelectedUser(user)}
              >
                <div className="space-y-4">
                  {/* Top user profile header card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`relative h-12 w-12 rounded-full bg-primary/10 grid place-items-center text-primary font-black ${shownRank === "Niga" ? "nega-avatar border border-emerald-500/20" : ""}`}>
                        {user.name?.[0] ?? "U"}
                        {user.isVerified && <span className="absolute -bottom-1 -right-1"><VerifiedBadge /></span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-white font-bold text-sm leading-none">{user.name}</p>
                          {user.role === "owner" ? <OwnerBadge /> : user.role === "admin" ? <AdminBadge /> : <RankBadge rank={shownRank} />}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">@{user.username} · ID #{user.id}</p>
                      </div>
                    </div>

                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}>
                      <ChevronRight size={18} />
                    </Button>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-white/5">
                    <div className="p-2 rounded bg-black/10">
                      <span className="text-muted-foreground block mb-0.5">المحفظة:</span>
                      <strong className="text-primary font-mono">{Number(user.walletBalance ?? 0).toFixed(2)} د.أ</strong>
                    </div>
                    <div className="p-2 rounded bg-black/10">
                      <span className="text-muted-foreground block mb-0.5">النقاط:</span>
                      <strong className="text-white font-mono">{Number(user.points ?? 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-4 pt-2 border-t border-white/5">
                  <span>{user.isBanned ? "🚫 محظور" : "🟢 نشط"} · {user.gender === "female" ? "♀ أنثى" : "♂ ذكر"}</span>
                  <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "تاريخ غير معروف"}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Advanced Inspection Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              className="w-full max-w-4xl rounded-2xl overflow-hidden text-right flex flex-col max-h-[90vh]"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/15">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => { setSelectedUser(null); setEditingUser(null); }}>
                  <X size={20} />
                </Button>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">تفاصيل وملف العضو</h3>
                  <Shield size={16} className="text-primary" />
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-right">
                
                {/* 1. Core Profile Details & Toggles */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Avatar, Badges & Toggles */}
                  <div className="lg:col-span-1 p-5 rounded-2xl bg-black/15 border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-black relative">
                      {selectedUser.name?.[0]}
                      {selectedUser.isVerified && <span className="absolute -bottom-1 -right-1"><VerifiedBadge /></span>}
                    </div>

                    <div>
                      <h4 className="text-white font-bold text-lg">{selectedUser.name}</h4>
                      <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                      <div className="flex justify-center mt-2">
                        {selectedUser.role === "owner" ? <OwnerBadge /> : selectedUser.role === "admin" ? <AdminBadge /> : <RankBadge rank={selectedUser.rank} />}
                      </div>
                    </div>

                    {/* Admin Actions buttons toggles */}
                    <div className="w-full pt-4 border-t border-white/5 space-y-2">
                      <Button
                        size="sm"
                        variant={selectedUser.isVerified ? "default" : "outline"}
                        className="w-full text-xs font-bold"
                        onClick={() => handleQuickAction(selectedUser.id, { isVerified: !selectedUser.isVerified }, selectedUser.isVerified ? "تمت إزالة توثيق العضو" : "تم توثيق العضو بنجاح")}
                      >
                        <CheckCircle size={14} className="ml-1.5" />
                        {selectedUser.isVerified ? "إلغاء التوثيق" : "توثيق العضو يدوياً"}
                      </Button>

                      <Button
                        size="sm"
                        variant={selectedUser.isBanned ? "destructive" : "outline"}
                        className="w-full text-xs font-bold"
                        disabled={isSuperAdmin(selectedUser.email)}
                        onClick={() => handleQuickAction(selectedUser.id, { isBanned: !selectedUser.isBanned }, selectedUser.isBanned ? "تم إلغاء حظر العضو" : "تم حظر العضو بنجاح")}
                      >
                        <Ban size={14} className="ml-1.5" />
                        {selectedUser.isBanned ? "إلغاء الحظر" : "حظر المستخدم"}
                      </Button>
                      
                      {isSuperAdmin(selectedUser.email) && (
                        <p className="text-[10px] text-amber-400 font-bold">⚠️ حساب إدارة أساسي - محمي ضد الحظر.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Information list & Forms */}
                  <div className="lg:col-span-2 space-y-4">
                    {editingUser?.id !== selectedUser.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-muted-foreground block mb-0.5">البريد الإلكتروني:</span>
                          <strong className="text-white text-sm">{selectedUser.email}</strong>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-muted-foreground block mb-0.5">رقم الهاتف:</span>
                          <strong className="text-white text-sm">{selectedUser.phone || "غير مسجل"}</strong>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-muted-foreground block mb-0.5">رصيد المحفظة:</span>
                          <strong className="text-primary text-sm font-black">{Number(selectedUser.walletBalance ?? 0).toFixed(2)} د.أ</strong>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-muted-foreground block mb-0.5">رصيد النقاط:</span>
                          <strong className="text-white text-sm">{Number(selectedUser.points ?? 0).toLocaleString()} نقطة</strong>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-muted-foreground block mb-0.5">رتبة المستخدم:</span>
                          <strong className="text-white text-sm">{selectedUser.rank || "Bronze"}</strong>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-muted-foreground block mb-0.5">الجنس:</span>
                          <strong className="text-white text-sm">{selectedUser.gender === "female" ? "♀ أنثى" : "♂ ذكر"}</strong>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <span className="text-muted-foreground block mb-0.5">تاريخ التسجيل:</span>
                          <strong className="text-white text-sm">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString("ar-SA") : "غير متوفر"}</strong>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => startEdit(selectedUser)}>
                            <Edit3 size={12} className="ml-1.5" /> تعديل البيانات بالكامل
                          </Button>
                        </div>
                        <div className="md:col-span-2 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
                          <div className="mb-3 flex items-center gap-2">
                            <KeyRound size={14} className="text-amber-300" />
                            <div>
                              <p className="text-xs font-black text-white">استعادة دخول المستخدم</p>
                              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                كلمة السر القديمة لا تظهر للأمان. إذا نسيها المستخدم عيّن كلمة جديدة وأعطه بريده وكلمته الجديدة.
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                            <Input
                              type="text"
                              value={resetPasswordInput}
                              onChange={(e) => setResetPasswordInput(e.target.value)}
                              placeholder="كلمة سر جديدة للمستخدم"
                              className="h-9 text-right text-xs"
                            />
                            <Button size="sm" onClick={handlePasswordReset} className="h-9 text-xs font-bold">
                              <KeyRound size={13} className="ml-1.5" />
                              تعيين كلمة السر
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs mb-1 block">الاسم</Label>
                          <Input value={draft.name} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} className="text-right h-9 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">اسم المستخدم</Label>
                          <Input value={draft.username} onChange={(e) => setDraft(d => ({ ...d, username: e.target.value }))} className="text-right h-9 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">البريد الإلكتروني</Label>
                          <Input value={draft.email} onChange={(e) => setDraft(d => ({ ...d, email: e.target.value }))} className="text-right h-9 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">الهاتف</Label>
                          <Input value={draft.phone} onChange={(e) => setDraft(d => ({ ...d, phone: e.target.value }))} className="text-right h-9 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">رصيد المحفظة</Label>
                          <Input type="number" step="0.01" value={draft.walletBalance} onChange={(e) => setDraft(d => ({ ...d, walletBalance: parseFloat(e.target.value) || 0 }))} className="text-right h-9 text-xs font-mono" />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">النقاط</Label>
                          <Input type="number" value={draft.points} onChange={(e) => setDraft(d => ({ ...d, points: parseInt(e.target.value) || 0 }))} className="text-right h-9 text-xs font-mono" />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">كلمة سر جديدة</Label>
                          <Input type="password" value={draft.password} onChange={(e) => setDraft(d => ({ ...d, password: e.target.value }))} placeholder="اتركها فارغة للتخطي" className="text-right h-9 text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">الدور</Label>
                          <Select value={draft.role} disabled={isSuperAdmin(selectedUser.email)} onValueChange={(val) => setDraft(d => ({ ...d, role: val }))}>
                            <SelectTrigger className="h-9 bg-black/20 text-xs text-right"><SelectValue /></SelectTrigger>
                            <SelectContent dir="rtl">
                              {ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">الجنس</Label>
                          <Select value={draft.gender} onValueChange={(val) => setDraft(d => ({ ...d, gender: val }))}>
                            <SelectTrigger className="h-9 bg-black/20 text-xs text-right"><SelectValue /></SelectTrigger>
                            <SelectContent dir="rtl">
                              <SelectItem value="male">ذكر ♂</SelectItem>
                              <SelectItem value="female">أنثى ♀</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-white/5">
                          <Button size="sm" onClick={() => saveDraft(selectedUser.id)}>
                            <Save size={12} className="ml-1.5" /> حفظ التغييرات
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Manual Wallet & Points Adjustments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Balance Adjuster widget */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                    <p className="text-xs font-bold text-white flex items-center gap-1">
                      <Wallet size={14} className="text-primary" /> تعديل رصيد المحفظة يدوياً
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="المبلغ بالدينار د.أ"
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        className="text-right h-9 text-xs font-mono"
                      />
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" onClick={() => handleBalanceAdjustment(true)} className="h-9 bg-green-600 hover:bg-green-700">
                          <Plus size={14} className="ml-1" /> إضافة
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleBalanceAdjustment(false)} className="h-9">
                          <Minus size={14} className="ml-1" /> خصم
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Points Adjuster widget */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                    <p className="text-xs font-bold text-white flex items-center gap-1">
                      <Plus size={14} className="text-primary" /> تعديل رصيد النقاط يدوياً
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="عدد النقاط"
                        value={pointsInput}
                        onChange={(e) => setPointsInput(e.target.value)}
                        className="text-right h-9 text-xs font-mono"
                      />
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" onClick={() => handlePointsAdjustment(true)} className="h-9 bg-green-600 hover:bg-green-700">
                          <Plus size={14} className="ml-1" /> إضافة
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handlePointsAdjustment(false)} className="h-9">
                          <Minus size={14} className="ml-1" /> خصم
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fortune Wheel User Controls */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-white">تحكم دولاب الحظ لهذا المستخدم</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        اللفات المتاحة حالياً: {getAvailableBonusSpins(getFortuneGlobalConfig(), fortuneConfig)}
                      </p>
                    </div>
                    <Button size="sm" onClick={saveSelectedUserFortuneConfig} className="h-9 text-xs font-bold">
                      <Save size={13} className="ml-1" />
                      حفظ
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">لفات إضافية</Label>
                      <Input
                        type="number"
                        min={0}
                        value={fortuneConfig.extraSpins}
                        onChange={(event) => setFortuneConfig(prev => ({ ...prev, extraSpins: Math.max(0, parseInt(event.target.value, 10) || 0) }))}
                        className="text-right h-9 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs mb-1 block">نسبة حظ خاصة</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder={`فارغ = العام ${getFortuneGlobalConfig().globalLuck}%`}
                        value={fortuneConfig.luckOverride ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const nextLuck = raw === "" ? null : Math.min(100, Math.max(0, parseInt(raw, 10) || 0));
                          setFortuneConfig(prev => ({ ...prev, luckOverride: nextLuck }));
                        }}
                        className="text-right h-9 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs mb-1 block">نتيجة اللفة القادمة</Label>
                      <Select
                        value={fortuneConfig.forcedPrizeId}
                        onValueChange={(value) => setFortuneConfig(prev => ({ ...prev, forcedPrizeId: value }))}
                      >
                        <SelectTrigger className="h-9 bg-black/20 text-xs text-right">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value={FORTUNE_AUTO_PRIZE}>تلقائي</SelectItem>
                          {FORTUNE_PRIZES.map(prize => (
                            <SelectItem key={prize.id} value={prize.id}>{prize.labelAr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 3. User Specific Orders */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-primary" /> تاريخ طلبات العضو ({allOrders.filter(o => o.userId === selectedUser.id).length})
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-white/5 bg-black/10 text-xs">
                    {allOrders.filter(o => o.userId === selectedUser.id).length === 0 ? (
                      <p className="text-muted-foreground p-3 text-center">لا توجد طلبات سابقة لهذا المستخدم.</p>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {allOrders.filter(o => o.userId === selectedUser.id).map(order => (
                          <div key={order.id} className="p-3 flex justify-between items-center hover:bg-white/[0.02]">
                            <span className="text-muted-foreground font-mono">#{order.id}</span>
                            <span className="text-white font-medium">{order.productNameAr || order.productName}</span>
                            <span className="text-primary font-bold">{order.price} د.أ</span>
                            <span className="text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("ar-SA")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. User Specific Deposits */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Wallet size={14} className="text-primary" /> تاريخ شحن المحفظة ({allDeposits.filter(d => d.userId === selectedUser.id).length})
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-white/5 bg-black/10 text-xs">
                    {allDeposits.filter(d => d.userId === selectedUser.id).length === 0 ? (
                      <p className="text-muted-foreground p-3 text-center">لا توجد إيداعات سابقة لهذا المستخدم.</p>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {allDeposits.filter(d => d.userId === selectedUser.id).map(deposit => (
                          <div key={deposit.id} className="p-3 flex justify-between items-center hover:bg-white/[0.02]">
                            <span className="text-muted-foreground font-mono">#{deposit.id}</span>
                            <span className="text-white">{deposit.method === "orange_money" ? "Orange Money" : deposit.method}</span>
                            <span className="text-primary font-bold">{deposit.amount} د.أ</span>
                            <span className="text-muted-foreground">{deposit.status === "approved" ? "🟢 مقبول" : deposit.status === "rejected" ? "🔴 مرفوض" : "🟡 معلق"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

