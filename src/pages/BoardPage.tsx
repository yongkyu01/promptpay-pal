import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ArrowLeft, Plus, Pencil, Trash2, Megaphone, Headphones, FileText, HelpCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";

type Lang = "th" | "en" | "ko" | "ja";

interface Post {
  id: string;
  board: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

interface I18nPayload {
  __i18n: true;
  v: number;
  translations: Record<Lang, { title: string; content: string }>;
}

function parseI18n(raw: string): I18nPayload | null {
  if (!raw || raw[0] !== "{") return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__i18n && parsed.translations) return parsed as I18nPayload;
    return null;
  } catch {
    return null;
  }
}

function localized(post: Post, lang: Lang): { title: string; content: string } {
  const i18n = parseI18n(post.content);
  if (!i18n) return { title: post.title, content: post.content };
  const order: Lang[] = [lang, "en", "ko", "th", "ja"];
  for (const l of order) {
    const t = i18n.translations[l];
    if (t && t.content) return { title: t.title || post.title, content: t.content };
  }
  return { title: post.title, content: post.content };
}

const LABELS = {
  notice: { th: "ประกาศ", en: "Notices", ko: "공지사항", ja: "お知らせ" },
  support: { th: "ศูนย์ช่วยเหลือ", en: "Help Center", ko: "고객센터", ja: "カスタマーセンター" },
  terms: { th: "ข้อกำหนดและนโยบาย", en: "Terms & Policies", ko: "약관 및 정책", ja: "規約・ポリシー" },
  faq: { th: "คำถามที่พบบ่อย", en: "FAQ", ko: "자주 묻는 질문", ja: "よくある質問" },
  back: { th: "กลับ", en: "Back", ko: "뒤로", ja: "戻る" },
  empty: { th: "ยังไม่มีโพสต์", en: "No posts yet", ko: "게시글이 없어요", ja: "まだ投稿がありません" },
  newPost: { th: "เขียนใหม่", en: "New Post", ko: "새 글", ja: "新規作成" },
  title: { th: "หัวข้อ", en: "Title", ko: "제목", ja: "タイトル" },
  content: { th: "เนื้อหา", en: "Content", ko: "내용", ja: "内容" },
  save: { th: "บันทึก", en: "Save", ko: "저장", ja: "保存" },
  cancel: { th: "ยกเลิก", en: "Cancel", ko: "취소", ja: "キャンセル" },
  edit: { th: "แก้ไข", en: "Edit", ko: "수정", ja: "編集" },
  delete: { th: "ลบ", en: "Delete", ko: "삭제", ja: "削除" },
  confirmDelete: { th: "ลบโพสต์นี้?", en: "Delete this post?", ko: "이 글을 삭제할까요?", ja: "この投稿を削除しますか？" },
  contact: { th: "ติดต่อเรา", en: "Contact Us", ko: "문의하기", ja: "お問い合わせ" },
  contactDesc: {
    th: "ส่งคำถามถึงทีมงานโดยตรง",
    en: "Send your question directly to our team",
    ko: "운영팀에 직접 문의를 남겨보세요",
    ja: "運営チームに直接お問い合わせください",
  },
  faqDesc: {
    th: "ดูคำตอบสำหรับคำถามที่พบบ่อย",
    en: "Browse answers to frequently asked questions",
    ko: "자주 묻는 질문과 답변을 확인하세요",
    ja: "よくある質問と回答を確認できます",
  },
} as const;

export default function BoardPage() {
  const { board } = useParams<{ board: "notice" | "support" | "terms" | "faq" }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useApp();
  const { isAdmin } = useIsAdmin();
  const L = (k: keyof typeof LABELS) => LABELS[k][lang as Lang] ?? LABELS[k].en;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const boardKey = (board === "support" || board === "terms" || board === "faq" ? board : "notice") as
    | "notice"
    | "support"
    | "terms"
    | "faq";
  const Icon =
    boardKey === "notice"
      ? Megaphone
      : boardKey === "support"
      ? Headphones
      : boardKey === "faq"
      ? BookOpen
      : FileText;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts" as any)
      .select("*")
      .eq("board", boardKey)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPosts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [boardKey]);

  const startNew = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setComposing(true);
  };

  const startEdit = (p: Post) => {
    setEditing(p);
    const view = localized(p, lang as Lang);
    setTitle(view.title);
    setContent(view.content);
    setComposing(true);
  };

  const save = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    if (editing) {
      // Preserve multilingual structure if present: update only the current language.
      const i18n = parseI18n(editing.content);
      let nextContent = content;
      let nextTitle = title;
      if (i18n) {
        const updated: I18nPayload = {
          ...i18n,
          translations: {
            ...i18n.translations,
            [lang as Lang]: { title, content },
          },
        };
        nextContent = JSON.stringify(updated);
        // Keep stored top-level title as Korean (or first available) for stability
        nextTitle = updated.translations.ko?.title || title;
      }
      const { error } = await supabase
        .from("posts" as any)
        .update({ title: nextTitle, content: nextContent })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("posts" as any)
        .insert({ title, content, board: boardKey, author_id: user.id });
      if (error) return toast.error(error.message);
    }
    setComposing(false);
    setEditing(null);
    setTitle("");
    setContent("");
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(L("confirmDelete"))) return;
    const { error } = await supabase.from("posts" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
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
        <Icon className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold flex-1">{L(boardKey)}</h1>
        {isAdmin && !composing && boardKey !== "support" && (
          <button
            onClick={startNew}
            className="flex items-center gap-1 rounded-full gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-primary active:scale-95 transition-transform"
          >
            <Plus className="h-3.5 w-3.5" />
            {L("newPost")}
          </button>
        )}
      </div>

      {boardKey === "support" && !composing && !editing && (
        <div className="mb-4 space-y-2">
          <button
            onClick={() => navigate("/board/faq")}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:bg-secondary transition-colors active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">{L("faq")}</span>
              <span className="block text-xs text-muted-foreground">{L("faqDesc")}</span>
            </span>
            <span className="text-muted-foreground">›</span>
          </button>
          <button
            onClick={() => navigate("/inquiry")}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:bg-secondary transition-colors active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">{L("contact")}</span>
              <span className="block text-xs text-muted-foreground">{L("contactDesc")}</span>
            </span>
            <span className="text-muted-foreground">›</span>
          </button>
        </div>
      )}

      {composing && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{L("title")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{L("content")}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex-1 rounded-xl gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-primary active:scale-95 transition-transform"
            >
              {L("save")}
            </button>
            <button
              onClick={() => { setComposing(false); setEditing(null); }}
              className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              {L("cancel")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-10 text-center text-sm text-muted-foreground">
          {L("empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => {
            const isOpen = openId === p.id;
            const view = localized(p, lang as Lang);
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : p.id)}
                  className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-sm flex-1 line-clamp-2">{view.title}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                      {view.content}
                    </p>
                    {isAdmin && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => startEdit(p)}
                          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          {L("edit")}
                        </button>
                        <button
                          onClick={() => remove(p.id)}
                          className="flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          {L("delete")}
                        </button>
                      </div>
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