import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Shield, Database, Clock, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Lang = "th" | "en" | "ko" | "ja";

const T = {
  back: { th: "ย้อนกลับ", en: "Back", ko: "뒤로", ja: "戻る" },
  title: { th: "คำขอลบบัญชี", en: "Account Deletion Request", ko: "계정 삭제 요청", ja: "アカウント削除リクエスト" },
  brand: { th: "Keb-Dee — Keb-Dee Team", en: "Keb-Dee — Keb-Dee Team", ko: "Keb-Dee — Keb-Dee Team", ja: "Keb-Dee — Keb-Dee Team" },
  procTitle: { th: "ขั้นตอนการลบบัญชี", en: "Deletion Procedure", ko: "계정 삭제 절차", ja: "削除手順" },
  proc1: { th: "1. ลงชื่อเข้าใช้ — เข้าสู่ระบบด้วยบัญชีที่ต้องการลบ", en: "1. Sign in — Log in with the account you want to delete", ko: "1. 로그인 — 삭제할 계정으로 로그인합니다", ja: "1. ログイン — 削除するアカウントでログインします" },
  proc2: { th: "2. เข้าหน้านี้ — เข้าสู่หน้าลบบัญชี", en: "2. Visit this page — Open this deletion page", ko: "2. 본 페이지 방문 — 이 계정 삭제 페이지에 접속합니다", ja: "2. このページを訪問 — このアカウント削除ページにアクセスします" },
  proc3: { th: "3. ยืนยันการลบ — เลือกช่องด้านล่างและกดปุ่ม “ลบบัญชี”", en: "3. Confirm — Check the box below and tap “Delete Account”", ko: "3. 삭제 확인 — 아래 체크박스를 선택하고 \"계정 삭제\" 버튼을 클릭합니다", ja: "3. 削除確認 — 下のチェックボックスを選択し「アカウント削除」を押します" },
  proc4: { th: "4. ลบเสร็จสิ้น — บัญชีและข้อมูลที่เกี่ยวข้องจะถูกลบทันที", en: "4. Done — Your account and related data are deleted immediately", ko: "4. 삭제 완료 — 계정과 관련 데이터가 즉시 삭제됩니다", ja: "4. 削除完了 — アカウントと関連データが即座に削除されます" },
  dataTitle: { th: "ข้อมูลที่จะถูกลบ", en: "Data to be Deleted", ko: "삭제되는 데이터", ja: "削除されるデータ" },
  d1: { th: "ข้อมูลโปรไฟล์ (ชื่อ, PromptPay, อีเมล)", en: "Profile info (name, PromptPay, email)", ko: "프로필 정보 (이름, PromptPay, 이메일)", ja: "プロフィール情報 (名前, PromptPay, メール)" },
  d2: { th: "รายการค่าใช้จ่ายและสลิปที่อัปโหลด", en: "Expenses and uploaded slips", ko: "지출 내역 및 업로드한 영수증", ja: "支出記録とアップロードしたレシート" },
  d3: { th: "งบประมาณรายเดือน", en: "Monthly budgets", ko: "월별 예산 설정", ja: "月別予算設定" },
  d4: { th: "รายการหารบิล (Dutch) และสมาชิก", en: "Dutch splits and members", ko: "더치페이 정산 및 멤버", ja: "割り勘記録とメンバー" },
  d5: { th: "รายชื่อเพื่อน", en: "Friends list", ko: "친구 목록", ja: "友達リスト" },
  d6: { th: "บันทึกคะแนนการพนันกอล์ฟ", en: "Golf bet records", ko: "골프 베팅 기록", ja: "ゴルフ賭け記録" },
  d7: { th: "ข้อมูลการยืนยันตัวตน (อีเมล, โซเชียลล็อกอิน)", en: "Authentication info (email, social login)", ko: "인증 정보 (이메일, 소셜 로그인)", ja: "認証情報 (メール, ソーシャルログイン)" },
  retainTitle: { th: "ระยะเวลาเก็บข้อมูล", en: "Data Retention Period", ko: "데이터 보관 기간", ja: "データ保管期間" },
  retainNow: { th: "ลบทันที:", en: "Immediate deletion:", ko: "즉시 삭제:", ja: "即時削除:" },
  retainNowDesc: { th: "โปรไฟล์, ค่าใช้จ่าย, สลิป, งบประมาณ, การหารบิล, รายชื่อเพื่อน จะถูกลบอย่างถาวรทันทีที่ลบบัญชี", en: "Profile, expenses, slips, budgets, splits, and friends are permanently deleted the moment your account is removed.", ko: "프로필, 지출, 영수증, 예산, 정산, 친구 목록은 계정 삭제 즉시 영구적으로 삭제됩니다.", ja: "プロフィール、支出、レシート、予算、割り勘、友達リストはアカウント削除と同時に永久削除されます。" },
  retainKeep: { th: "อาจมีการเก็บไว้:", en: "May be retained:", ko: "보관될 수 있는 데이터:", ja: "保管される可能性のあるデータ:" },
  retainKeepDesc: { th: "อีเมลของบัญชีที่ถูกลบอาจถูกเก็บไว้เพื่อป้องกันการสมัครซ้ำ ข้อมูลอื่นทั้งหมดจะถูกลบทันที", en: "The email of a deleted account may be retained to prevent re-registration. All other data is deleted immediately.", ko: "삭제된 계정의 이메일 주소는 재가입 방지를 위해 보관될 수 있습니다. 그 외 모든 데이터는 즉시 삭제됩니다.", ja: "削除されたアカウントのメールアドレスは再登録防止のため保管される場合があります。その他のデータは即時削除されます。" },
  warn: { th: "การลบบัญชีไม่สามารถย้อนกลับได้ ข้อมูลทั้งหมดจะถูกลบอย่างถาวร", en: "Account deletion is irreversible. All data is permanently deleted.", ko: "계정 삭제는 되돌릴 수 없습니다. 모든 데이터가 영구적으로 삭제됩니다.", ja: "アカウント削除は元に戻せません。すべてのデータが永久削除されます。" },
  agree: { th: "ฉันได้อ่านและยินยอมให้ลบบัญชีและข้อมูลที่เกี่ยวข้องอย่างถาวร", en: "I have read the above and agree to permanently delete my account and related data.", ko: "위 내용을 모두 확인했으며, 계정 및 관련 데이터의 영구 삭제에 동의합니다.", ja: "上記をすべて確認し、アカウントおよび関連データの永久削除に同意します。" },
  deleteBtn: { th: "ลบบัญชี", en: "Delete Account", ko: "계정 삭제", ja: "アカウント削除" },
  contact: { th: "หากมีข้อสงสัย กรุณาติดต่อผ่านศูนย์ช่วยเหลือในแอป", en: "If you have questions, please contact us via the in-app Help Center.", ko: "문의사항이 있으시면 앱 내 고객센터를 이용해 주세요.", ja: "ご質問がある場合は、アプリ内のカスタマーセンターをご利用ください。" },
  copyright: { th: "© 2026 Keb-Dee — Keb-Dee Team", en: "© 2026 Keb-Dee — Keb-Dee Team", ko: "© 2026 Keb-Dee — Keb-Dee Team", ja: "© 2026 Keb-Dee — Keb-Dee Team" },
  deleting: { th: "กำลังลบ...", en: "Deleting...", ko: "삭제 중...", ja: "削除中..." },
  successMsg: { th: "ลบบัญชีเรียบร้อย", en: "Account deleted", ko: "계정이 삭제되었습니다", ja: "アカウントを削除しました" },
  errorMsg: { th: "ลบบัญชีไม่สำเร็จ", en: "Failed to delete account", ko: "계정 삭제에 실패했습니다", ja: "アカウント削除に失敗しました" },
} as const;

export default function DeleteAccountPage() {
  const { lang } = useApp();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const L = (k: keyof typeof T) => T[k][lang as Lang] ?? T[k].en;

  const handleDelete = async () => {
    if (!user || !agreed || deleting) return;
    setDeleting(true);
    try {
      // Call edge function to permanently delete data + auth account
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(L("successMsg"));
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || L("errorMsg"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-4 pb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {L("back")}
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-destructive/10 mb-3">
            <Trash2 className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{L("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Keb-Dee</span> — Keb-Dee Team
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-destructive" />
            <h2 className="text-base font-bold text-foreground">{L("procTitle")}</h2>
          </div>
          <ul className="space-y-2 text-sm text-foreground/90 leading-relaxed">
            <li>{L("proc1")}</li>
            <li>{L("proc2")}</li>
            <li>{L("proc3")}</li>
            <li>{L("proc4")}</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-destructive" />
            <h2 className="text-base font-bold text-foreground">{L("dataTitle")}</h2>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/90">
            <li>{L("d1")}</li>
            <li>{L("d2")}</li>
            <li>{L("d3")}</li>
            <li>{L("d4")}</li>
            <li>{L("d5")}</li>
            <li>{L("d6")}</li>
            <li>{L("d7")}</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-destructive" />
            <h2 className="text-base font-bold text-foreground">{L("retainTitle")}</h2>
          </div>
          <p className="text-sm text-foreground/90 mb-2">
            <span className="font-bold">{L("retainNow")}</span> {L("retainNowDesc")}
          </p>
          <p className="text-sm text-foreground/90">
            <span className="font-bold">{L("retainKeep")}</span> {L("retainKeepDesc")}
          </p>
        </section>

        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 mb-6">
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-medium leading-relaxed">{L("warn")}</p>
          </div>
          <label className="flex items-start gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-destructive cursor-pointer"
            />
            <span className="text-sm text-foreground/90 leading-relaxed">{L("agree")}</span>
          </label>
          <button
            onClick={handleDelete}
            disabled={!agreed || deleting}
            className="w-full rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            {deleting ? L("deleting") : L("deleteBtn")}
          </button>
        </section>

        <p className="text-center text-xs text-muted-foreground">{L("contact")}</p>
        <p className="text-center text-xs text-muted-foreground mt-1">{L("copyright")}</p>
      </div>
    </div>
  );
}