import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LANG_OPTIONS, type Lang } from "@/lib/i18n";
import { Loader2, ShieldCheck, FileText } from "lucide-react";

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

function pickLocalized(
  raw: string,
  fallbackTitle: string,
  lang: Lang
): { title: string; content: string } {
  const i18n = parseI18n(raw);
  if (!i18n) return { title: fallbackTitle, content: raw };
  const order: Lang[] = [lang, "en", "ko", "th", "ja"];
  for (const l of order) {
    const t = i18n.translations[l];
    if (t && t.content) return { title: t.title || fallbackTitle, content: t.content };
  }
  return { title: fallbackTitle, content: raw };
}

function renderRichText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const HEADER_LABELS = {
  terms: { th: "ข้อกำหนดในการให้บริการ", en: "Terms of Service", ko: "서비스 이용 약관", ja: "利用規約" },
  privacy: { th: "นโยบายความเป็นส่วนตัว", en: "Privacy Policy", ko: "개인정보 처리방침", ja: "プライバシーポリシー" },
  back: { th: "กลับสู่แอป", en: "Back to app", ko: "앱으로 돌아가기", ja: "アプリに戻る" },
  loading: { th: "กำลังโหลด...", en: "Loading...", ko: "불러오는 중...", ja: "読み込み中..." },
  notFound: { th: "ไม่พบเอกสาร", en: "Document not found", ko: "문서를 찾을 수 없어요", ja: "ドキュメントが見つかりません" },
} as const;

function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem("kebdee_lang") as Lang | null;
    if (stored && ["th", "en", "ko", "ja"].includes(stored)) return stored;
    const nav = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase();
    if (nav.startsWith("ko")) return "ko";
    if (nav.startsWith("ja")) return "ja";
    if (nav.startsWith("th")) return "th";
    return "en";
  } catch {
    return "en";
  }
}

export default function PublicLegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const [lang, setLang] = useState<Lang>(detectInitialLang());
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<string | null>(null);
  const [fallbackTitle, setFallbackTitle] = useState<string>("");

  // Match the board post by Korean title (those are stable identifiers in DB).
  const koreanTitle = kind === "terms" ? "서비스 이용 약관" : "개인정보 처리방침";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("posts" as any)
        .select("title, content")
        .eq("board", "terms")
        .eq("title", koreanTitle)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setRaw((data as any).content as string);
        setFallbackTitle((data as any).title as string);
      } else {
        setRaw(null);
        setFallbackTitle("");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [koreanTitle]);

  const view = useMemo(() => {
    if (!raw) return null;
    return pickLocalized(raw, fallbackTitle, lang);
  }, [raw, fallbackTitle, lang]);

  const HL = (k: keyof typeof HEADER_LABELS) => HEADER_LABELS[k][lang] ?? HEADER_LABELS[k].en;
  const Icon = kind === "terms" ? FileText : ShieldCheck;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Link
            to="/"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            ← {HL("back")}
          </Link>
          <div className="flex-1" />
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setLang(opt.key as Lang);
                  try { localStorage.setItem("kebdee_lang", opt.key); } catch {}
                }}
                className={
                  "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors " +
                  (lang === opt.key
                    ? "bg-primary text-primary-foreground shadow-primary"
                    : "text-muted-foreground hover:bg-secondary")
                }
                aria-label={opt.label}
              >
                <span>{opt.flag}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary shadow-primary">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </span>
          <h1 className="text-xl font-bold text-foreground">
            {view?.title || HL(kind)}
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !view ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center text-sm text-muted-foreground">
            {HL("notFound")}
          </div>
        ) : (
          <article className="rounded-2xl border border-border bg-card p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {renderRichText(view.content)}
            </p>
          </article>
        )}
      </main>
    </div>
  );
}