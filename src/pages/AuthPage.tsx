import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { lang } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
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
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{lang === "th" ? "หรือ" : "or"}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={async () => {
            const { error } = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (error) toast.error(error.message);
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
