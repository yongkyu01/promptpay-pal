import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  isNative,
  NATIVE_REDIRECT_URI,
  openOAuthUrlNative,
  setSessionFromCallbackUrl,
} from "@/lib/nativeAuth";

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
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSignUp ? (
              <UserPlus className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isSignUp
              ? (lang === "th" ? "สมัครสมาชิก" : "Sign Up")
              : (lang === "th" ? "เข้าสู่ระบบ" : "Sign In")}
          </button>

          {isSignUp && (
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
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
              <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
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
            </div>
          )}
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{lang === "th" ? "หรือ" : "or"}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={async () => {
            try {
              if (isNative()) {
                // Native: use deep-link redirect, open in system browser, then
                // capture the callback URL and set the Supabase session.
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: NATIVE_REDIRECT_URI,
                });
                if (result.error) {
                  toast.error(result.error.message);
                  return;
                }
                // The lovable SDK returns a URL to open externally on native.
                // Fallback: if SDK already handled redirect (web), bail out.
                const oauthUrl = (result as any).url as string | undefined;
                if (!oauthUrl) return;
                const callback = await openOAuthUrlNative(oauthUrl);
                await setSessionFromCallbackUrl(callback);
              } else {
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) toast.error(error.message);
              }
            } catch (e: any) {
              toast.error(e?.message ?? "Google login failed");
            }
          }}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
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
          onClick={async () => {
            try {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const callbackUrl = `${supabaseUrl}/functions/v1/line-auth?action=callback`;
              const appRedirect = isNative() ? NATIVE_REDIRECT_URI : window.location.origin;
              const loginUrl = `${supabaseUrl}/functions/v1/line-auth?action=login&redirect_uri=${encodeURIComponent(callbackUrl)}&app_redirect=${encodeURIComponent(appRedirect)}`;
              if (isNative()) {
                const callback = await openOAuthUrlNative(loginUrl);
                await setSessionFromCallbackUrl(callback);
              } else {
                window.location.href = loginUrl;
              }
            } catch (e: any) {
              toast.error(e?.message ?? "LINE login failed");
            }
          }}
          className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#06C755" }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="white">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          {lang === "th" ? "เข้าสู่ระบบด้วย LINE" : "Continue with LINE"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp
            ? (lang === "th" ? "มีบัญชีแล้ว?" : "Already have an account?")
            : (lang === "th" ? "ยังไม่มีบัญชี?" : "Don't have an account?")}
          {" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-semibold text-primary"
          >
            {isSignUp
              ? (lang === "th" ? "เข้าสู่ระบบ" : "Sign In")
              : (lang === "th" ? "สมัครสมาชิก" : "Sign Up")}
          </button>
        </p>
      </div>
    </div>
  );
}
