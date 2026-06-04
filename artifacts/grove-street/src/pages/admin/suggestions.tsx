import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getLanguage } from "@/lib/language";

type Suggestion = {
  id: number;
  userName: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  status: string;
  adminReply?: string;
  createdAt: string;
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  new: { ar: "جديد", en: "New" },
  reviewing: { ar: "قيد المراجعة", en: "Reviewing" },
  responded: { ar: "تم الرد", en: "Responded" },
  closed: { ar: "مغلق", en: "Closed" },
  done: { ar: "تم", en: "Done" },
  rejected: { ar: "مرفوض", en: "Rejected" },
};

export default function AdminSuggestionsPage() {
  const lang = getLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-suggestions"],
    queryFn: async () => customFetch<Suggestion[]>("/api/suggestions"),
  });

  async function updateSuggestion(id: number, patch: Partial<Suggestion>) {
    try {
      await customFetch(`/api/suggestions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      await queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
      toast({
        title: lang === "en" ? "Saved" : "تم الحفظ",
        description: lang === "en" ? "Suggestion updated successfully." : "تم تحديث الاقتراح بنجاح.",
      });
    } catch (error: any) {
      toast({
        title: lang === "en" ? "Error" : "خطأ",
        description: error?.response?.data?.error ?? (lang === "en" ? "Update failed." : "فشل التحديث."),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">
            {lang === "en" ? "Suggestions and Complaints" : "الاقتراحات والشكاوي"}
          </h1>
          <p className="text-white/55 mt-2">
            {lang === "en" ? "Review user feedback, change status, and send public replies." : "راجع رسائل المستخدمين وغيّر الحالة وأرسل الرد المناسب."}
          </p>
        </div>
        <MessageSquare className="text-primary" size={34} />
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-white/70">
          {lang === "en" ? "Loading..." : "جار التحميل..."}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/65">
          {lang === "en" ? "No suggestions yet." : "لا توجد اقتراحات أو شكاوي حاليا."}
        </div>
      ) : (
        <div className="grid gap-4">
          {data.map((item) => (
            <div key={item.id} className="rounded-xl border border-primary/20 bg-card/80 p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/50 mb-2">
                    <span>#{item.id}</span>
                    <span>{item.userName || (lang === "en" ? "User" : "مستخدم")}</span>
                    <span>{item.type}</span>
                    <span>{item.priority}</span>
                    <span>{new Date(item.createdAt).toLocaleString(lang === "en" ? "en-US" : "ar-JO")}</span>
                  </div>
                  <h2 className="text-xl font-black text-white">{item.title}</h2>
                  <p className="text-white/70 mt-2 whitespace-pre-wrap">{item.message}</p>
                </div>
                <Select value={item.status} onValueChange={(status) => updateSuggestion(item.id, { status })}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{lang === "en" ? label.en : label.ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {item.adminReply && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-white/75">
                  <strong className="text-primary">{lang === "en" ? "Admin reply:" : "رد الإدارة:"}</strong> {item.adminReply}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-3">
                <Textarea
                  value={replyDrafts[item.id] ?? item.adminReply ?? ""}
                  onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                  placeholder={lang === "en" ? "Write a reply..." : "اكتب الرد..."}
                  className="min-h-24"
                />
                <Button
                  className="md:w-40"
                  onClick={() => updateSuggestion(item.id, { adminReply: replyDrafts[item.id] ?? item.adminReply ?? "", status: "responded" })}
                >
                  <Send size={16} className="ml-2" />
                  {lang === "en" ? "Reply" : "إرسال الرد"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
