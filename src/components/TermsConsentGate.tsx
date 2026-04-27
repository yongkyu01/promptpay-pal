import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

const L = {
  title: { th: "ยอมรับข้อกำหนด", en: "Accept Terms", ko: "약관 동의", ja: "規約への同意" },
  desc: {
    th: "เพื่อใช้งาน Keb-Dee กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว",
    en: "To use Keb-Dee, please agree to the Terms of Service and Privacy Policy.",
    ko: "Keb-Dee 이용을 위해 서비스 이용 약관과 개인정보 처리방침에 동의해주세요.",
    ja: "Keb-Deeのご利用にあたり、利用規約とプライバシーポリシーに同意してください。",
  },
  agreeTerms: { th: "ฉันยอมรับข้อกำหนดในการให้บริการ", en: "I agree to the Terms of Service", ko: "서비스 이용 약관에 동의합니다 (필수)", ja: "利用規約に同意します（必須）" },
  agreePrivacy: { th: "ฉันยอมรับนโยบายความเป็นส่วนตัว", en: "I agree to the Privacy Policy", ko: "개인정보 처리방침에 동의합니다 (필수)", ja: "プライバシーポリシーに同意します（必須）" },
  view: { th: "ดูเนื้อหา", en: "View", ko: "보기", ja: "表示" },
  continue: { th: "ดำเนินการต่อ", en: "Continue", ko: "동의하고 시작하기", ja: "同意して続ける" },
  signOut: { th: "ออกจากระบบ", en: "Sign out", ko: "로그아웃", ja: "ログアウト" },
} as const;

export default function TermsConsentGate({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { lang } = useApp();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [saving, setSaving] = useState(false);

  const tr = (k: keyof typeof L) => (L[k] as any)[lang] ?? (L[k] as any).en;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, terms_agreed_at, privacy_agreed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const hasConsent = !!(data && (data as any).terms_agreed_at && (data as any).privacy_agreed_at);
      if (hasConsent) {
        setNeedsConsent(false);
        setChecking(false);
        return;
      }
      // Auto-record consent if user already agreed at signup form
      let pending: any = null;
      try {
        const raw = localStorage.getItem("kebdee_pending_consent");
        if (raw) pending = JSON.parse(raw);
      } catch {}
      if (pending?.terms && pending?.privacy) {
        const now = new Date().toISOString();
        const payload: any = {
          user_id: user.id,
          email: user.email,
          terms_agreed_at: now,
          privacy_agreed_at: now,
        };
        if (data) {
          await supabase.from("profiles").update(payload).eq("user_id", user.id);
        } else {
          await supabase.from("profiles").insert(payload);
        }
        try { localStorage.removeItem("kebdee_pending_consent"); } catch {}
        setNeedsConsent(false);
        setChecking(false);
        return;
      }
      setNeedsConsent(true);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleAccept = async () => {
    if (!user || !agreeTerms || !agreePrivacy) return;
    setSaving(true);
    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    const payload: any = {
      user_id: user.id,
      email: user.email,
      terms_agreed_at: now,
      privacy_agreed_at: now,
    };
    const { error } = existing
      ? await supabase.from("profiles").update(payload).eq("user_id", user.id)
      : await supabase.from("profiles").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNeedsConsent(false);
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!needsConsent) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-primary">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{tr("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{tr("desc")}</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <label className="flex items-start gap-3 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span className="flex-1">
              {tr("agreeTerms")}{" "}
              <button type="button" onClick={() => navigate("/board/terms")} className="text-primary underline">
                {tr("view")}
              </button>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span className="flex-1">
              {tr("agreePrivacy")}{" "}
              <button type="button" onClick={() => navigate("/board/terms")} className="text-primary underline">
                {tr("view")}
              </button>
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!agreeTerms || !agreePrivacy || saving}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-primary disabled:opacity-50 transition-transform active:scale-95"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("continue")}
          </button>
        </div>

        <button
          onClick={() => signOut()}
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {tr("signOut")}
        </button>
      </div>
    </div>
  );
}