import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  isNativeApp,
  isWebViewInApp,
  isLineInAppBrowser,
  openInExternalBrowser,
  writeStoredRelayState,
  clearStoredRelayState,
  readStoredRelayState,
  normalizeRelayId,
} from "@/lib/authRelay";

const PUBLISHED_URL = "https://promptpay-buddy.lovable.app";

const webViewWarnings: Record<string, string> = {
  th: "เบราว์เซอร์ในแอปไม่รองรับการเข้าสู่ระบบบางประเภท กรุณาเปิดใน Chrome หรือ Safari",
  en: "Some login methods are not supported in in-app browsers. Please open in Chrome or Safari.",
  ko: "인앱 브라우저에서는 일부 로그인 방식이 지원되지 않습니다. Chrome 또는 Safari에서 열어주세요.",
  ja: "アプリ内ブラウザでは一部のログイン方法がサポートされていません。ChromeまたはSafariで開いてください。",
};

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { lang } = useApp();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [relayState, setRelayState] = useState<string | null>(() => readStoredRelayState());
  const [relayStatus, setRelayStatus] = useState<string>("");
  const [callbackDone, setCallbackDone] = useState(false);

  const lineCbRef = useRef(false);
  const oauthRelayRef = useRef(false);
  const startGoogleRef = useRef(false);

  // Auto-redirect out of LINE in-app browser
  useEffect(() => {
    if (isLineInAppBrowser()) {
      const t = setTimeout(() => openInExternalBrowser(window.location.href), 300);
      return () => clearTimeout(t);
    }
  }, []);

  // Listen for relay status events from AuthContext polling
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.status) setRelayStatus(detail.status);
    };
    window.addEventListener("relay-status", handler);
    return () => window.removeEventListener("relay-status", handler);
  }, []);

  // Sync relay state on focus/visibility
  useEffect(() => {
    const sync = () => setRelayState(readStoredRelayState());
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Handle LINE callback success marker (?line_done=1&state=...).
  // The edge function (line-auth?action=callback) has already exchanged the
  // code, created the magiclink, and written it into login_relays — so on the
  // external browser we just show the success screen, and the app polls the
  // relay table to complete sign-in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lineDone = params.get("line_done");
    const lineError = params.get("line_error");
    const state = normalizeRelayId(params.get("state"));

    if (lineError) {
      toast.error(`LINE 로그인 실패: ${lineError}`);
      window.history.replaceState({}, "", "/");
      return;
    }
    if (!lineDone || !state || lineCbRef.current) return;
    lineCbRef.current = true;

    (async () => {
      const isStandaloneNow =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone || isNativeApp();

      if (isStandaloneNow) {
        // App context: pull token_hash from relay and verify directly.
        const { data, error } = await supabase
          .from("login_relays")
          .select("token_hash, token_type")
          .eq("id", state)
          .maybeSingle();
        if (error || !data?.token_hash) {
          toast.error("Relay 토큰을 찾을 수 없습니다");
          return;
        }
        try { await supabase.auth.signOut({ scope: "local" }); } catch {}
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: (data.token_type || "magiclink") as any,
        });
        if (verifyError) toast.error(verifyError.message);
        else clearStoredRelayState();
        window.history.replaceState({}, "", "/");
        return;
      }

      // External browser: relay row already exists, app is polling.
      setCallbackDone(true);
      window.history.replaceState({}, "", "/");
    })();
  }, []);

  // Handle Google relay callback (?oauth_relay=ID) — runs in EXTERNAL browser
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const relayIdFromUrl = params.get("oauth_relay");
    const relayIdFromStorage = localStorage.getItem("pending_oauth_relay");
    const relayId = relayIdFromUrl || relayIdFromStorage;
    if (!relayId || oauthRelayRef.current) return;
    oauthRelayRef.current = true;

    (async () => {
      // If we are inside the native app, just wait for our normal session to land
      if (isNativeApp()) {
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            clearStoredRelayState();
            localStorage.removeItem("pending_oauth_relay");
            window.history.replaceState({}, "", "/");
            return;
          }
          await new Promise((r) => setTimeout(r, 600));
        }
        return;
      }

      // External browser — wait for OAuth session, then create relay row
      let session: any = null;
      for (let i = 0; i < 20 && !session; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) session = data.session;
        else await new Promise((r) => setTimeout(r, 600));
      }
      if (!session) {
        await new Promise<void>((resolve) => {
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
            if (s) { session = s; subscription.unsubscribe(); resolve(); }
          });
          setTimeout(() => { subscription.unsubscribe(); resolve(); }, 10000);
        });
      }
      if (!session) {
        toast.error("로그인 세션을 가져오지 못했습니다");
        return;
      }

      try {
        const { data: relayData, error: relayErr } =
          await supabase.functions.invoke("generate-relay-token", {
            headers: { "Content-Type": "application/json" },
          });
        if (relayErr || !relayData?.token_hash) {
          console.error("[OAuth Relay] generate-relay-token failed", relayErr);
          toast.error("Relay 토큰 생성 실패");
          return;
        }
        const { error: upsertErr } = await supabase.from("login_relays").upsert({
          id: relayId,
          token_hash: relayData.token_hash,
          token_type: relayData.type || "magiclink",
        }, { onConflict: "id" });
        if (upsertErr) {
          console.error("[OAuth Relay] upsert failed", upsertErr);
          toast.error("Relay 저장 실패");
          return;
        }
        localStorage.removeItem("pending_oauth_relay");
        setCallbackDone(true);
        window.history.replaceState({}, "", "/");
      } catch (e: any) {
        console.error("[OAuth Relay] exception", e);
        toast.error(e?.message ?? "Relay 처리 실패");
      }
    })();
  }, []);

  // Handle Google two-hop trigger (?start_google=ID) — runs in EXTERNAL browser
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const relayId = params.get("start_google");
    if (!relayId || startGoogleRef.current) return;
    startGoogleRef.current = true;

    localStorage.setItem("pending_oauth_relay", relayId);
    window.history.replaceState({}, "", "/");

    const redirectUrl = `${PUBLISHED_URL}/?oauth_relay=${encodeURIComponent(relayId)}`;
    lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUrl,
      extraParams: { prompt: "select_account" },
    }).then(({ error }) => {
      if (error) {
        console.error("[Google Two-Hop] OAuth init failed", error);
        toast.error(error.message ?? "Google 로그인 실패");
      }
    }).catch((e) => {
      console.error("[Google Two-Hop] unexpected", e);
      toast.error(e?.message ?? "Google 로그인 실패");
    });
  }, []);

  const L = {
    agreeTerms: { th: "ข้อกำหนดในการให้บริการ", en: "Terms of Service", ko: "서비스 이용 약관 동의 (필수)", ja: "利用規約に同意 (必須)" },
    agreePrivacy: { th: "นโยบายความเป็นส่วนตัว", en: "Privacy Policy", ko: "개인정보 처리방침 동의 (필수)", ja: "プライバシーポリシーに同意 (必須)" },
    view: { th: "ดู", en: "View", ko: "보기", ja: "表示" },
    mustAgree: { th: "กรุณายอมรับข้อกำหนดและนโยบาย", en: "Please agree to the Terms and Privacy Policy", ko: "약관 및 개인정보 처리방침에 동의해주세요", ja: "規約とプライバシーポリシーに同意してください" },
  } as const;
  const tr = (k: keyof typeof L) => (L[k] as any)[lang] ?? (L[k] as any).en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && (!agreeTerms || !agreePrivacy)) {
      toast.error(tr("mustAgree"));
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        try {
          localStorage.setItem("kebdee_pending_consent", JSON.stringify({ terms: true, privacy: true, at: new Date().toISOString() }));
        } catch {}
        toast.success(lang === "th" ? "สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมล" : "Sign up successful! Please check your email.");
      } else {
        await signIn(email, password);
        toast.success(lang === "th" ? "เข้าสู่ระบบสำเร็จ" : "Logged in successfully");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Google login ----
  const handleGoogleLogin = async () => {
    if (isWebViewInApp()) {
      toast.error(webViewWarnings[lang] || webViewWarnings.en);
      return;
    }
    clearStoredRelayState();
    setLoading(true);
    try {
      try { await supabase.auth.signOut({ scope: "local" }); } catch {}

      const needsRelay =
        isNativeApp() ||
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone;

      if (needsRelay) {
        const relayId = crypto.randomUUID();
        writeStoredRelayState(relayId);
        setRelayState(relayId);
        const gatewayUrl = `${PUBLISHED_URL}/?start_google=${relayId}`;
        try {
          openInExternalBrowser(gatewayUrl);
        } catch (e) {
          window.location.href = gatewayUrl;
        }
        setTimeout(() => setLoading(false), 3000);
        return;
      }

      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/",
      });
      if (error) {
        toast.error(error.message);
        setLoading(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Google login failed");
      setLoading(false);
    }
  };

  // ---- LINE login ----
  const handleLineLogin = async () => {
    clearStoredRelayState();
    setLoading(true);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone || isNativeApp();
    const native = isNativeApp();

    let externalWin: Window | null = null;
    if (!native) {
      try { externalWin = window.open("about:blank", "_blank"); } catch {}
    }

    try { await supabase.auth.signOut({ scope: "local" }); } catch {}

    try {
      // No redirectUri needed — edge function uses the URL registered
      // in LINE Developers Console.
      const invokePromise = supabase.functions.invoke("line-auth", {
        body: {},
        headers: { "Content-Type": "application/json" },
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("LINE_AUTH_TIMEOUT")), 10000),
      );
      const res = (await Promise.race([invokePromise, timeoutPromise])) as Awaited<typeof invokePromise>;

      if (res.error || !res.data?.url) {
        if (externalWin) externalWin.close();
        toast.error("LINE 로그인 실패");
        setLoading(false);
        return;
      }

      let lineUrl = res.data.url;
      const url = new URL(lineUrl);
      const state = url.searchParams.get("state") || "";
      const relayStateValue = state;
      lineUrl = url.toString();
      writeStoredRelayState(relayStateValue);
      setRelayState(relayStateValue);

      if (native) {
        try {
          const win = window.open(lineUrl, "_blank");
          if (!win) {
            const stripped = lineUrl.replace(/^https?:\/\//, "");
            window.location.href = `intent://${stripped}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
          }
        } catch {
          const stripped = lineUrl.replace(/^https?:\/\//, "");
          window.location.href = `intent://${stripped}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
        }
      } else if (externalWin) {
        externalWin.location.href = lineUrl;
      } else {
        window.location.href = lineUrl;
      }
      setTimeout(() => setLoading(false), 3000);
    } catch (e: any) {
      if (externalWin) externalWin.close();
      toast.error(e?.message ?? "LINE 로그인 실패");
      setLoading(false);
    }
  };

  // ---- Callback success screen (external browser) ----
  if (callbackDone) {
    setTimeout(() => { try { window.close(); } catch {} }, 1500);
    const msgs: Record<string, { title: string; desc: string; closing: string; close: string }> = {
      th: { title: "✅ เข้าสู่ระบบสำเร็จ!", desc: "หน้านี้จะปิดอัตโนมัติ...", closing: "หากไม่ปิด กรุณาปิดหน้านี้แล้วกลับไปที่แอป", close: "ปิดหน้านี้" },
      en: { title: "✅ Login successful!", desc: "This page will close automatically...", closing: "If not, please close this tab and return to the app", close: "Close this tab" },
      ko: { title: "✅ 로그인 성공!", desc: "이 페이지는 자동으로 닫힙니다...", closing: "닫히지 않으면 이 탭을 닫고 앱으로 돌아가주세요", close: "이 탭 닫기" },
      ja: { title: "✅ ログイン成功！", desc: "このページは自動的に閉じます...", closing: "閉じない場合は、このタブを閉じてアプリに戻ってください", close: "このタブを閉じる" },
    };
    const m = msgs[lang] || msgs.en;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">{m.title}</h1>
          <p className="text-sm text-muted-foreground animate-pulse">{m.desc}</p>
          <p className="text-xs text-muted-foreground/70 mt-4">{m.closing}</p>
          <button
            onClick={() => { try { window.close(); } catch {} }}
            className="mt-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            {m.close}
          </button>
        </div>
      </div>
    );
  }

  // ---- Relay waiting screen (app side, waiting for external browser) ----
  if (relayState && !loading) {
    const wMsgs: Record<string, { title: string; desc: string }> = {
      th: { title: "กำลังเข้าสู่ระบบ...", desc: "กรุณาเสร็จสิ้นการเข้าสู่ระบบในเบราว์เซอร์แล้วกลับมาที่แอป" },
      en: { title: "Signing in...", desc: "Please complete login in the browser and return to the app" },
      ko: { title: "로그인 중...", desc: "브라우저에서 로그인을 완료하고 앱으로 돌아와주세요" },
      ja: { title: "ログイン中...", desc: "ブラウザでログインを完了してアプリに戻ってください" },
    };
    const m = wMsgs[lang] || wMsgs.en;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <h1 className="text-xl font-bold text-foreground">{m.title}</h1>
          <p className="text-sm text-muted-foreground">{m.desc}</p>
          {relayStatus && (
            <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1">
              {relayStatus}
            </p>
          )}
          <button
            onClick={() => { clearStoredRelayState(); setRelayState(null); setRelayStatus(""); }}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            {lang === "th" ? "ยกเลิก" : lang === "ko" ? "취소" : lang === "ja" ? "キャンセル" : "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-primary">
            <span className="text-2xl font-bold text-primary-foreground">K</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Keb-Dee</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "th" ? "จัดการสลิป PromptPay อัจฉริยะ" : "Smart PromptPay Slip Manager"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {lang === "th" ? "อีเมล" : "Email"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {lang === "th" ? "รหัสผ่าน" : "Password"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-primary transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {isSignUp ? (lang === "th" ? "สมัครสมาชิก" : "Sign Up") : (lang === "th" ? "เข้าสู่ระบบ" : "Sign In")}
          </button>

          {isSignUp && (
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
                <span className="flex-1">
                  {tr("agreeTerms")}{" "}
                  <button type="button" onClick={() => navigate("/board/terms")} className="text-primary underline">{tr("view")}</button>
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
                <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
                <span className="flex-1">
                  {tr("agreePrivacy")}{" "}
                  <button type="button" onClick={() => navigate("/board/terms")} className="text-primary underline">{tr("view")}</button>
                </span>
              </label>
            </div>
          )}
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{lang === "th" ? "หรือ" : "or"}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {lang === "th" ? "เข้าสู่ระบบด้วย Google" : "Continue with Google"}
        </button>

        <button
          onClick={handleLineLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#06C755" }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="white">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          {lang === "th" ? "เข้าสู่ระบบด้วย LINE" : "Continue with LINE"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? (lang === "th" ? "มีบัญชีแล้ว?" : "Already have an account?") : (lang === "th" ? "ยังไม่มีบัญชี?" : "Don't have an account?")}{" "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-primary">
            {isSignUp ? (lang === "th" ? "เข้าสู่ระบบ" : "Sign In") : (lang === "th" ? "สมัครสมาชิก" : "Sign Up")}
          </button>
        </p>
      </div>
    </div>
  );
}
