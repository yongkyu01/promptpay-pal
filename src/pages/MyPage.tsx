import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle, LogOut, QrCode, Wallet, Save, Megaphone, Headphones, FileText, HelpCircle, UserX } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function MyPage() {
  const { lang } = useApp();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [promptpayId, setPromptpayId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, promptpay_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name || "");
        setPromptpayId((data as any).promptpay_id || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { data: existing } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    const payload: any = {
      user_id: user.id,
      display_name: displayName || null,
      promptpay_id: promptpayId || null,
      email: user.email,
    };
    const { error } = existing
      ? await supabase.from("profiles").update(payload).eq("user_id", user.id)
      : await supabase.from("profiles").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("✓");
  };

  const supportLabels = {
    title: { th: "ฝ่ายสนับสนุน", en: "Support", ko: "고객지원", ja: "カスタマーサポート" },
    notice: { th: "ประกาศ", en: "Notices", ko: "공지사항", ja: "お知らせ" },
    center: { th: "ศูนย์ช่วยเหลือ", en: "Help Center", ko: "고객센터", ja: "カスタマーセンター" },
    terms: { th: "ข้อกำหนดและนโยบาย", en: "Terms & Policies", ko: "약관 및 정책", ja: "規約・ポリシー" },
    contact: { th: "ติดต่อเรา", en: "Contact Us", ko: "문의하기", ja: "お問い合わせ" },
    deleteAccount: { th: "ลบบัญชี", en: "Delete Account", ko: "회원 탈퇴", ja: "退会" },
  } as const;
  const L = (k: keyof typeof supportLabels) => supportLabels[k][lang as "th" | "en" | "ko" | "ja"] ?? supportLabels[k].en;

  const notImplemented = () => toast.info("Coming soon");

  const handleDeleteAccount = () => {
    const confirmMsg = {
      th: "ต้องการลบบัญชีจริงหรือไม่?",
      en: "Are you sure you want to delete your account?",
      ko: "정말 회원 탈퇴하시겠습니까?",
      ja: "本当に退会しますか？",
    }[lang as "th" | "en" | "ko" | "ja"] ?? "Are you sure?";
    if (!window.confirm(confirmMsg)) return;
    toast.info("Coming soon");
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24 animate-slide-up">
      <div className="rounded-2xl gradient-primary p-6 text-center shadow-primary">
        <UserCircle className="mx-auto h-14 w-14 text-white/90" />
        <p className="mt-2 text-base font-semibold text-white">{displayName || t("myAccount", lang)}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("displayName", lang)}</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Your name"
            disabled={loading}
          />
        </div>

        <div className="rounded-xl bg-accent/10 p-3 border border-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <QrCode className="h-4 w-4 text-accent-foreground" />
            <span className="text-sm font-semibold">{t("myPromptpay", lang)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">{t("myPromptpayDesc", lang)}</p>
          <input
            value={promptpayId}
            onChange={(e) => setPromptpayId(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="0812345678"
            disabled={loading}
            inputMode="numeric"
          />
        </div>

        <button
          onClick={save}
          disabled={saving || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-primary disabled:opacity-50 active:scale-95 transition-transform"
        >
          <Save className="h-4 w-4" />
          {t("saveSettings", lang)}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2 space-y-1">
        <button
          onClick={() => navigate("/budgets")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <Wallet className="h-4 w-4 text-primary" />
          {t("budgetSettings", lang)}
        </button>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t("signOut", lang)}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2 space-y-1">
        <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground">{L("title")}</p>
        <button
          onClick={notImplemented}
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <span className="flex items-center gap-3">
            <Megaphone className="h-4 w-4 text-primary" />
            {L("notice")}
          </span>
          <span className="text-muted-foreground">›</span>
        </button>
        <button
          onClick={notImplemented}
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <span className="flex items-center gap-3">
            <Headphones className="h-4 w-4 text-primary" />
            {L("center")}
          </span>
          <span className="text-muted-foreground">›</span>
        </button>
        <button
          onClick={notImplemented}
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <span className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-primary" />
            {L("terms")}
          </span>
          <span className="text-muted-foreground">›</span>
        </button>
        <button
          onClick={notImplemented}
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <span className="flex items-center gap-3">
            <HelpCircle className="h-4 w-4 text-primary" />
            {L("contact")}
          </span>
          <span className="text-muted-foreground">›</span>
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2">
        <button
          onClick={handleDeleteAccount}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
        >
          <UserX className="h-4 w-4" />
          {L("deleteAccount")}
        </button>
      </div>
    </div>
  );
}