import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, RefreshCw, Eye, EyeOff, Lock, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useListAllOrders, useUpdateOrderStatus, getListAllOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { isAdmin } from "@/lib/auth";

const STATUS_COLORS: Record<string, string> = {
  pending: "#fbbf24",
  pending_review: "#fbbf24",
  awaiting_execution: "#f59e0b",
  processing: "#60a5fa",
  completed: "#22c55e",
  cancelled: "#6b7280",
  rejected: "#ef4444",
  refunded: "#a78bfa"
};

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار (API)",
  pending_review: "قيد المراجعة",
  awaiting_execution: "بانتظار التنفيذ",
  processing: "قيد التنفيذ",
  completed: "تم التنفيذ / مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
  refunded: "مسترد"
};

Object.assign(STATUS_LABELS, {
  pending: "\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631",
  pending_review: "\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  awaiting_execution: "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0646\u0641\u064a\u0630",
  processing: "\u0642\u064a\u062f \u0627\u0644\u062a\u0646\u0641\u064a\u0630",
  completed: "\u0645\u0643\u062a\u0645\u0644",
  cancelled: "\u0645\u0644\u063a\u064a",
  rejected: "\u0645\u0631\u0641\u0648\u0636",
  refunded: "\u0645\u0633\u062a\u0631\u062f",
});

export default function AdminOrdersPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useListAllOrders();
  const updateMutation = useUpdateOrderStatus();
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [notesInput, setNotesInput] = useState<string>("");

  async function handleStatusChange(orderId: number, status: string, customNote?: string) {
    setUpdatingId(orderId);
    try {
      const data: any = { status };
      if (customNote !== undefined) {
        data.notes = customNote;
      }
      await updateMutation.mutateAsync({ id: orderId, data });
      queryClient.invalidateQueries({ queryKey: getListAllOrdersQueryKey() });
      toast({ title: "تم تحديث حالة الطلب بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل تحديث حالة الطلب", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  function toggleExpandRow(order: any) {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
      setNotesInput("");
    } else {
      setExpandedOrderId(order.id);
      setNotesInput(order.notes || "");
    }
  }

  async function handleSaveNotes(orderId: number, currentStatus: string) {
    setUpdatingId(orderId);
    try {
      await updateMutation.mutateAsync({ id: orderId, data: { status: currentStatus, notes: notesInput } });
      queryClient.invalidateQueries({ queryKey: getListAllOrdersQueryKey() });
      toast({ title: "تم حفظ ملاحظة العميل" });
    } catch {
      toast({ title: "خطأ", description: "فشل حفظ الملاحظة", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ClipboardList size={28} className="text-primary" />
        <h1 className="text-3xl font-black text-white">إدارة الطلبات</h1>
        <span className="text-muted-foreground">({orders.length})</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-muted" />)}</div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  {["#", "الطلب", "العميل", "السعر", "الحالة", "التاريخ", ""].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-muted-foreground text-sm font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => {
                  const color = STATUS_COLORS[order.status] ?? "#9ca3af";
                  const isExpanded = expandedOrderId === order.id;
                  
                  // Parse shipping inputs
                  let parsedInputs: Record<string, string> = {};
                  try {
                    if (order.userInputData) {
                      parsedInputs = JSON.parse(order.userInputData);
                    }
                  } catch {
                    if (typeof order.userInputData === "string" && order.userInputData.trim()) {
                      parsedInputs = { "البيانات المستلمة": order.userInputData };
                    }
                  }

                  return (
                    <>
                      <tr 
                        key={order.id} 
                        style={{ borderBottom: isExpanded ? "none" : "1px solid hsl(var(--border))" }} 
                        className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${isExpanded ? "bg-white/[0.02]" : ""}`}
                        onClick={() => toggleExpandRow(order)}
                        data-testid={`row-order-${order.id}`}
                      >
                        <td className="px-4 py-4 text-muted-foreground text-sm">#{order.id}</td>
                        <td className="px-4 py-4">
                          <p className="text-white font-medium text-sm">{order.productNameAr || order.productName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">غير محدد</p>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground text-sm">{order.userName || `#${order.userId}`}</td>
                        <td className="px-4 py-4 text-primary font-bold">{order.price} د.أ</td>
                        <td className="px-4 py-4">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}22`, color }}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleDateString("ar-SA")}</td>
                        <td className="px-4 py-4 text-left">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <Select value={order.status} onValueChange={v => handleStatusChange(order.id, v)}>
                              <SelectTrigger className="h-8 w-28 text-xs bg-black/20" data-testid={`select-order-status-${order.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => toggleExpandRow(order)}>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="bg-white/[0.015]" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                          <td colSpan={7} className="px-6 py-4">
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="text-right space-y-4"
                            >
                              {/* 1. SECURE SHIPMENT DATA */}
                              <div className="rounded-xl p-4 bg-muted/20 border border-border/40 animate-fade-in">
                                <p className="text-primary font-bold text-sm flex items-center gap-1.5 mb-3">
                                  <Lock size={14} className="text-primary animate-pulse" />
                                  قسم آمن: بيانات التنفيذ المطلوبة من العميل
                                </p>
                                {Object.keys(parsedInputs).length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    {Object.entries(parsedInputs).map(([k, v]) => (
                                      <div key={k} className="p-2 rounded-lg bg-black/10 border border-white/[0.04]">
                                        <span className="text-muted-foreground text-xs block mb-0.5">{k}</span>
                                        <span className="text-white font-mono font-bold select-all break-all">{v || "—"}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground text-xs">لا توجد بيانات إدخال لهذا الطلب.</p>
                                )}
                              </div>

                              {/* 2. ADMINISTRATIVE QUICK ACTIONS */}
                              <div className="space-y-2">
                                <p className="text-white font-bold text-xs">إجراءات التحكم السريع بالطلب:</p>
                                <div className="flex flex-wrap gap-2">
                                  <Button 
                                    size="sm" 
                                    disabled={updatingId === order.id}
                                    onClick={() => handleStatusChange(order.id, "awaiting_execution")} 
                                    className="bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white px-3"
                                  >
                                    قبول الطلب
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    disabled={updatingId === order.id}
                                    onClick={() => handleStatusChange(order.id, "processing")} 
                                    className="bg-blue-600/90 hover:bg-blue-700 text-xs font-bold text-white px-3"
                                  >
                                    بدء التنفيذ
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    disabled={updatingId === order.id}
                                    onClick={() => handleStatusChange(order.id, "completed")} 
                                    className="bg-green-600 hover:bg-green-700 text-xs font-bold text-white px-3"
                                  >
                                    تم التنفيذ (إضافة نقاط للعميل)
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    disabled={updatingId === order.id}
                                    onClick={() => handleStatusChange(order.id, "rejected")} 
                                    className="bg-red-600 hover:bg-red-700 text-xs font-bold text-white px-3"
                                  >
                                    رفض الطلب (إرجاع الرصيد لمحفظة العميل)
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    disabled={updatingId === order.id}
                                    onClick={() => handleStatusChange(order.id, "refunded")} 
                                    className="bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white px-3"
                                  >
                                    استرداد قيمة الطلب
                                  </Button>
                                </div>
                              </div>

                              {/* 3. CUSTOMER NOTE & ADMIN MEMO */}
                              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                                <label className="text-white font-bold text-xs block mb-1 flex items-center gap-1">
                                  <MessageSquare size={12} className="text-primary" />
                                  ملاحظة المسؤول الموجهة للعميل (تظهر في حسابه):
                                </label>
                                <div className="flex gap-2 max-w-xl">
                                  <Input 
                                    value={notesInput} 
                                    onChange={e => setNotesInput(e.target.value)} 
                                    placeholder="اكتب ملاحظة أو توجيه للعميل (مثال: تم إرسال الكود للواتساب)" 
                                    className="text-right h-9 text-xs bg-black/25" 
                                  />
                                  <Button 
                                    size="sm" 
                                    disabled={updatingId === order.id}
                                    variant="outline" 
                                    onClick={() => handleSaveNotes(order.id, order.status)} 
                                    className="h-9 text-xs font-bold px-3 shrink-0"
                                  >
                                    {updatingId === order.id ? <RefreshCw size={12} className="animate-spin" /> : "حفظ الملاحظة"}
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && <p className="text-center text-muted-foreground py-12">لا توجد طلبات</p>}
          </div>
        </div>
      )}
    </div>
  );
}
