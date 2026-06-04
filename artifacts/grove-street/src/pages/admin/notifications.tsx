import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isAdmin } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function AdminNotificationsPage() {
  const [, setLocation] = useLocation();
  if (!isAdmin()) { setLocation("/"); return null; }

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyById, setReplyById] = useState<Record<number, string>>({});
  const { data: notifications = [] } = useQuery<any[]>({ queryKey: ["admin-notifications"], queryFn: () => customFetch("/api/admin/notifications", { responseType: "json" }) });
  const { data: suggestions = [] } = useQuery<any[]>({ queryKey: ["admin-suggestions"], queryFn: () => customFetch("/api/suggestions", { responseType: "json" }) });
  const unread = notifications.filter((item: any) => !item.isRead).length;

  async function updateSuggestion(id: number, data: Record<string, unknown>) {
    await customFetch(`/api/suggestions/${id}`, { method: "PATCH", body: JSON.stringify(data), responseType: "json" });
    queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
    toast({ title: "تم الحفظ" });
  }

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6" dir="rtl">
      <div className="mb-8 flex items-center gap-3">
        <Bell size={28} className="text-primary" />
        <div>
          <h1 className="text-3xl font-black text-white">الإشعارات والاقتراحات</h1>
          <p className="mt-1 text-sm text-muted-foreground">{unread} إشعار غير مقروء</p>
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-black text-white">آخر الإشعارات</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {notifications.slice(0, 12).map((item: any) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-bold text-white">{item.titleAr || item.title}</span>
                {!item.isRead && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-white">جديد</span>}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{item.messageAr || item.message}</p>
            </div>
          ))}
          {notifications.length === 0 && <p className="text-sm text-muted-foreground">لا توجد إشعارات بعد.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={22} className="text-primary" />
          <h2 className="text-xl font-black text-white">صندوق الاقتراحات والشكاوي</h2>
        </div>
        {suggestions.map((item: any) => (
          <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-black text-white">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.userName} · {item.type} · {item.priority}</p>
              </div>
              <Select value={item.status} onValueChange={(status) => updateSuggestion(item.id, { status })}>
                <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">new</SelectItem>
                  <SelectItem value="reviewing">reviewing</SelectItem>
                  <SelectItem value="done">done</SelectItem>
                  <SelectItem value="rejected">rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="mb-4 text-sm leading-7 text-white/75">{item.message}</p>
            <Textarea
              value={replyById[item.id] ?? item.adminReply ?? ""}
              onChange={(event) => setReplyById((prev) => ({ ...prev, [item.id]: event.target.value }))}
              placeholder="رد الأدمن"
              className="mb-3 min-h-20 text-right"
            />
            <Button variant="outline" onClick={() => updateSuggestion(item.id, { adminReply: replyById[item.id] ?? item.adminReply ?? "", publicReply: true })}>حفظ الرد وإظهاره للمستخدم</Button>
          </article>
        ))}
      </section>
    </div>
  );
}
