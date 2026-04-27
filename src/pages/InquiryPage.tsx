import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ArrowLeft, Plus, HelpCircle, Lock, Trash2, Reply, Shield } from "lucide-react";
import { toast } from "sonner";

type Lang = "th" | "en" | "ko" | "ja";

interface Inquiry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_private: boolean;
  created_at: string;
}

interface ReplyRow {
  id: string;
  inquiry_id: string;
  author_id: string;
  content: string;
  is_private: boolean;
  created_at: string;
}

const L = {
  title: { th: "ติดต่อเรา", en: "Contact Us", ko: "문의하기", ja: "お問い合わせ" },
  back: { th: "กลับ", en: "Back", ko: "뒤로", ja: "戻る" },
  newInquiry: { th: "เขียนคำถาม", en: "New Inquiry", ko: "새 문의", ja: "新規問い合わせ" },
  empty: { th: "ยังไม่มีคำถาม", en: "No inquiries yet", ko: "문의가 없어요", ja: "まだ問い合わせがありません" },
  subject: { th: "หัวข้อ", en: "Subject", ko: "제목", ja: "タイトル" },
  content: { th: "เนื้อหา", en: "Content", ko: "내용", ja: "内容" },
  private: { th: "ตั้งเป็นส่วนตัว", en: "Private", ko: "비공개", ja: "非公開" },
  privateDesc: { th: "เฉพาะคุณและผู้ดูแลระบบเท่านั้นที่จะเห็น", en: "Only you and admins can see this", ko: "본인과 관리자만 볼 수 있어요", ja: "あなたと管理者だけが閲覧できます" },
  submit: { th: "ส่งคำถาม", en: "Submit", ko: "등록", ja: "送信" },
  cancel: { th: "ยกเลิก", en: "Cancel", ko: "취소", ja: "キャンセル" },
  reply: { th: "ตอบกลับ", en: "Reply", ko: "답글", ja: "返信" },
  adminReply: { th: "ตอบจากผู้ดูแล", en: "Admin Reply", ko: "관리자 답변", ja: "管理者からの返信" },
  noReplyYet: { th: "ยังไม่มีคำตอบ", en: "No reply yet", ko: "아직 답변이 없어요", ja: "まだ返信がありません" },
  privateReply: { th: "ตอบกลับแบบส่วนตัว", en: "Private reply", ko: "비공개 답변", ja: "非公開の返信" },
  send: { th: "ส่ง", en: "Send", ko: "등록", ja: "送信" },
  confirmDelete: { th: "ลบโพสต์นี้?", en: "Delete this inquiry?", ko: "이 문의를 삭제할까요?", ja: "この問い合わせを削除しますか？" },
  delete: { th: "ลบ", en: "Delete", ko: "삭제", ja: "삭제" } as any,
  privateBadge: { th: "ส่วนตัว", en: "Private", ko: "비공개", ja: "非公開" },
  loginRequired: { th: "กรุณาเข้าสู่ระบบ", en: "Please sign in", ko: "로그인이 필요합니다", ja: "ログインが必要です" },
} as const;

function tr(k: keyof typeof L, lang: Lang): string {
  const v = (L[k] as any)[lang];
  return (v ?? (L[k] as any).en) as string;
}

export default function InquiryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useApp();
  const { isAdmin } = useIsAdmin();
  const t = (k: keyof typeof L) => tr(k, lang as Lang);

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [replies, setReplies] = useState<Record<string, ReplyRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data: ins, error: e1 } = await supabase
      .from("inquiries" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (e1) toast.error(e1.message);
    const list = ((ins as any) || []) as Inquiry[];
    setInquiries(list);
    if (list.length) {
      const ids = list.map((i) => i.id);
      const { data: rs } = await supabase
        .from("inquiry_replies" as any)
        .select("*")
        .in("inquiry_id", ids)
        .order("created_at", { ascending: true });
      const grouped: Record<string, ReplyRow[]> = {};
      ((rs as any) || []).forEach((r: ReplyRow) => {
        (grouped[r.inquiry_id] ||= []).push(r);
      });
      setReplies(grouped);
    } else {
      setReplies({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setTitle("");
    setContent("");
    setIsPrivate(false);
    setComposing(true);
  };

  const submit = async () => {
    if (!user) return toast.error(t("loginRequired"));
    if (!title.trim() || !content.trim()) return;
    const { error } = await supabase.from("inquiries" as any).insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      is_private: isPrivate,
    });
    if (error) return toast.error(error.message);
    setComposing(false);
    setTitle("");
    setContent("");
    setIsPrivate(false);
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("confirmDelete"))) return;
    const { error } = await supabase.from("inquiries" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const sendReply = async (inq: Inquiry) => {
    if (!user || !isAdmin) return;
    const text = (replyText[inq.id] || "").trim();
    if (!text) return;
    const { error } = await supabase.from("inquiry_replies" as any).insert({
      inquiry_id: inq.id,
      author_id: user.id,
      content: text,
      // Replies inherit privacy from the inquiry: private inquiry => private reply.
      is_private: inq.is_private,
    });
    if (error) return toast.error(error.message);
    setReplyText((s) => ({ ...s, [inq.id]: "" }));
    load();
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4 pb-24 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 hover:bg-secondary transition-colors"
          aria-label="back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <HelpCircle className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold flex-1">{t("title")}</h1>
        {!composing && (
          <button
            onClick={startNew}
            className="flex items-center gap-1 rounded-full gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-primary active:scale-95 transition-transform"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("newInquiry")}
          </button>
        )}
      </div>

      {composing && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("subject")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t("content")}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer rounded-xl border border-border bg-secondary/30 p-3">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Lock className="h-3.5 w-3.5" />
                {t("private")}
              </span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">{t("privateDesc")}</span>
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={submit}
              className="flex-1 rounded-xl gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-primary active:scale-95 transition-transform"
            >
              {t("submit")}
            </button>
            <button
              onClick={() => setComposing(false)}
              className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-10 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inq) => {
            const isOpen = openId === inq.id;
            const mine = inq.user_id === user?.id;
            const inqReplies = replies[inq.id] || [];
            return (
              <div key={inq.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : inq.id)}
                  className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {inq.is_private && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            <Lock className="h-2.5 w-2.5" />
                            {t("privateBadge")}
                          </span>
                        )}
                        {inqReplies.length > 0 && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {t("adminReply")}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm mt-0.5 line-clamp-2">{inq.title}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                      {new Date(inq.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                    <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                      {inq.content}
                    </p>

                    {(mine || isAdmin) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => remove(inq.id)}
                          className="flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("delete")}
                        </button>
                      </div>
                    )}

                    {inqReplies.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {inqReplies.map((r) => (
                          <div
                            key={r.id}
                            className="rounded-xl border border-primary/20 bg-primary/5 p-3"
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Shield className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold text-primary">{t("adminReply")}</span>
                              {r.is_private && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  <Lock className="h-2.5 w-2.5" />
                                  {t("privateBadge")}
                                </span>
                              )}
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                {new Date(r.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                              {r.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Reply className="h-3.5 w-3.5 text-primary" />
                          {t("reply")}
                          {inq.is_private && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              <Lock className="h-2.5 w-2.5" />
                              {t("privateReply")}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={replyText[inq.id] || ""}
                          onChange={(e) =>
                            setReplyText((s) => ({ ...s, [inq.id]: e.target.value }))
                          }
                          rows={3}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                        />
                        <button
                          onClick={() => sendReply(inq)}
                          className="rounded-xl gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-primary active:scale-95 transition-transform"
                        >
                          {t("send")}
                        </button>
                      </div>
                    )}

                    {!isAdmin && inqReplies.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">{t("noReplyYet")}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}