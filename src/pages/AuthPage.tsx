import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
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
