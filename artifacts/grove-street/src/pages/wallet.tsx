import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, ArrowUpCircle, ArrowDownCircle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetWallet, useListDeposits, useListTransactions, useCreateDeposit, getGetWalletQueryKey, getListDepositsQueryKey, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getUser } from "@/lib/auth";
import { ORANGE_MONEY_INSTRUCTIONS, ORANGE_MONEY_NUMBER } from "@/lib/branding";
import { playSfx } from "@/lib/audio";

const METHODS = [
  { id: "orange_money", label: "Orange Money" },
  { id: "bank_transfer", label: "تحويل بنكي" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد المعالجة", color: "#fbbf24" },
  approved: { label: "مقبول", color: "#22c55e" },
  rejected: { label: "مرفوض", color: "#ef4444" },
};

async function imageToReceiptDataUrl(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = source;
  });

  const maxSide = 900;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.68);
}

export default function WalletPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getUser();
  const [showDeposit, setShowDeposit] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  const { data: walletData } = useGetWallet();
  const { data: deposits = [] } = useListDeposits();
  const { data: transactions = [] } = useListTransactions();
  const createDepositMutation = useCreateDeposit();

  const balance = walletData?.balance ?? user?.walletBalance ?? 0;

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!amount || !method) {
      toast({ title: "خطأ", description: "يرجى إدخال المبلغ واختيار طريقة الدفع", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      toast({ title: "خطأ", description: "أقل قيمة للشحن هي 1 دينار", variant: "destructive" });
      return;
    }
    if (proofFiles.length < 1) {
      toast({ title: "خطأ", description: "يرجى رفع صورة واحدة على الأقل لإثبات التحويل", variant: "destructive" });
      return;
    }
    try {
      const receiptImages = await Promise.all(proofFiles.map(imageToReceiptDataUrl));
      await createDepositMutation.mutateAsync({
        data: {
          amount: numericAmount,
          method,
          notes: `Transfer proof images: ${proofFiles.map((file) => file.name).join(", ")}`,
          receiptUrl: JSON.stringify(receiptImages),
        },
      });
      queryClient.invalidateQueries({ queryKey: getListDepositsQueryKey() });
      playSfx("wallet_loaded");
      toast({ title: "تم الإرسال", description: "سيتم مراجعة طلب الشحن وإضافة الرصيد قريباً" });
      setShowDeposit(false);
      setAmount("");
      setMethod("");
      setProofFiles([]);
    } catch {
      toast({ title: "خطأ", description: "فشل إرسال طلب الشحن", variant: "destructive" });
    }
  }

  function handleProofFiles(files: FileList | null) {
    const images = Array.from(files ?? []).filter((file) => file.type.startsWith("image/")).slice(0, 2);
    setProofFiles(images);
    if ((files?.length ?? 0) > 2) {
      toast({ title: "تنبيه", description: "تم اختيار أول صورتين فقط" });
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-white mb-8">المحفظة</h1>

      {/* Balance Card */}
      <motion.div
        className="rounded-2xl p-8 mb-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(142 70% 35% / 0.2), hsl(142 20% 8%))", border: "1px solid hsl(142 70% 35% / 0.4)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: "hsl(142 70% 35%)", transform: "translate(30%, -30%)" }} />
        <p className="text-muted-foreground mb-2">الرصيد الحالي</p>
        <p className="text-5xl font-black text-white mb-1">
          {typeof balance === "number" ? balance.toFixed(2) : balance}
        </p>
        <p className="text-primary font-medium">دينار أردني</p>
        <Button
          onClick={() => setShowDeposit(!showDeposit)}
          className="mt-6 bg-primary hover:bg-primary/90 font-bold"
          data-testid="button-charge-wallet"
        >
          <Plus size={18} className="ml-2" />
          شحن المحفظة
        </Button>
      </motion.div>

      {/* Deposit Form */}
      <AnimatePresence>
        {showDeposit && (
          <motion.div
            className="rounded-2xl p-6 mb-6"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h2 className="text-lg font-bold text-white mb-4">طلب شحن جديد</h2>
            <div className="mb-4 rounded-xl p-4 text-sm leading-relaxed" style={{ background: "hsl(142 70% 35% / 0.08)", border: "1px solid hsl(142 70% 35% / 0.2)" }}>
              <p className="font-bold text-primary mb-1">Orange Money: {ORANGE_MONEY_NUMBER}</p>
              <p className="text-white/75">{ORANGE_MONEY_INSTRUCTIONS}</p>
            </div>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <Label className="text-white mb-1.5 block">المبلغ (د.أ)</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="text-right"
                  data-testid="input-deposit-amount"
                />
              </div>
              <div>
                <Label className="text-white mb-1.5 block">طريقة الدفع</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger data-testid="select-deposit-method">
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white mb-1.5 block">إثبات التحويل</Label>
                <label
                  className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-5 text-center transition hover:bg-primary/10"
                  htmlFor="deposit-proof"
                >
                  <Upload size={22} className="text-primary" />
                  <span className="text-sm font-bold text-white">ارفع صورة أو صورتين للحوالة</span>
                  <span className="text-xs text-muted-foreground">يدعم الجوال واللابتوب - صور فقط</span>
                </label>
                <Input
                  id="deposit-proof"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => handleProofFiles(e.target.files)}
                  data-testid="input-deposit-proof"
                />
                {proofFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {proofFiles.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-white">
                        {file.name}
                        <button type="button" onClick={() => setProofFiles((current) => current.filter((item) => item !== file))} aria-label="إزالة الصورة">
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createDepositMutation.isPending} data-testid="button-submit-deposit">
                  {createDepositMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : "إرسال الطلب"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowDeposit(false)} data-testid="button-cancel-deposit">
                  إلغاء
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposits */}
        <div className="rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <h2 className="text-lg font-bold text-white mb-4">طلبات الشحن</h2>
          {deposits.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">لا توجد طلبات شحن بعد</p>
          ) : (
            <div className="space-y-3">
              {deposits.map(d => {
                const status = STATUS_MAP[d.status] ?? { label: d.status, color: "#9ca3af" };
                return (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} data-testid={`row-deposit-${d.id}`}>
                    <div>
                      <p className="text-white font-medium">{METHODS.find(m => m.id === d.method)?.label ?? d.method}</p>
                      <p className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString("ar-SA")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{d.amount} د.أ</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${status.color}22`, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <h2 className="text-lg font-bold text-white mb-4">سجل المعاملات</h2>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">لا توجد معاملات بعد</p>
          ) : (
            <div className="space-y-3">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} data-testid={`row-transaction-${t.id}`}>
                  {t.type === "credit"
                    ? <ArrowDownCircle size={20} className="text-green-500 flex-shrink-0" />
                    : <ArrowUpCircle size={20} className="text-red-400 flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("ar-SA")}</p>
                  </div>
                  <span className={`font-bold ${t.type === "credit" ? "text-green-500" : "text-red-400"}`}>
                    {t.type === "credit" ? "+" : "-"}{t.amount} د.أ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

