import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ShieldCheck, Crown, UserX, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useApp } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Lang = "th" | "en" | "ko" | "ja";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

const i18n: Record<Lang, Record<string, string>> = {
  th: {
    title: "จัดการสมาชิก", total: "สมาชิกทั้งหมด", search: "ค้นหา...",
    name: "ชื่อ", email: "อีเมล", joined: "สมัคร", actions: "จัดการ",
    admin: "แอดมิน", setAdmin: "ตั้งเป็นแอดมิน", removeAdmin: "ถอนสิทธิ์",
    deleteUser: "ลบ", confirmDelete: "ลบบัญชีผู้ใช้นี้? ไม่สามารถย้อนกลับได้",
    confirmSetAdmin: "ตั้งเป็นแอดมินหรือไม่?", confirmRemoveAdmin: "ถอนสิทธิ์แอดมินหรือไม่?",
    cancel: "ยกเลิก", confirm: "ยืนยัน", noUsers: "ไม่พบสมาชิก", access: "ไม่มีสิทธิ์",
  },
  en: {
    title: "User Management", total: "Total Users", search: "Search...",
    name: "Name", email: "Email", joined: "Joined", actions: "Actions",
    admin: "Admin", setAdmin: "Make Admin", removeAdmin: "Remove Admin",
    deleteUser: "Delete", confirmDelete: "Delete this user? This cannot be undone.",
    confirmSetAdmin: "Grant admin role?", confirmRemoveAdmin: "Revoke admin role?",
    cancel: "Cancel", confirm: "Confirm", noUsers: "No users found", access: "Access denied",
  },
  ko: {
    title: "회원 관리", total: "전체 회원", search: "검색...",
    name: "이름", email: "이메일", joined: "가입일", actions: "관리",
    admin: "관리자", setAdmin: "관리자 지정", removeAdmin: "관리자 해제",
    deleteUser: "삭제", confirmDelete: "이 회원을 삭제하시겠습니까? 되돌릴 수 없습니다.",
    confirmSetAdmin: "관리자로 지정하시겠습니까?", confirmRemoveAdmin: "관리자 권한을 해제하시겠습니까?",
    cancel: "취소", confirm: "확인", noUsers: "회원이 없습니다", access: "접근 권한이 없습니다",
  },
  ja: {
    title: "ユーザー管理", total: "ユーザー合計", search: "検索...",
    name: "名前", email: "メール", joined: "登録日", actions: "管理",
    admin: "管理者", setAdmin: "管理者に設定", removeAdmin: "管理者解除",
    deleteUser: "削除", confirmDelete: "このユーザーを削除しますか？元に戻せません。",
    confirmSetAdmin: "管理者に設定しますか？", confirmRemoveAdmin: "管理者権限を解除しますか？",
    cancel: "キャンセル", confirm: "確認", noUsers: "ユーザーが見つかりません", access: "アクセス拒否",
  },
};

type ActionType = "delete" | "add_admin" | "remove_admin";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { lang } = useApp();
  const t = i18n[(lang as Lang) || "en"];

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<{ id: string; name: string; action: ActionType } | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles")
        .select("id, user_id, display_name, email, avatar_url, created_at")
        .order("created_at", { ascending: false }),
      (supabase as any).from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    setProfiles((profs as Profile[]) || []);
    setAdminIds(new Set((roles || []).map((r: any) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  if (roleLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{t.access}</p>
      </div>
    );
  }

  const filtered = profiles.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (p.display_name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q);
  });

  const runAction = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const action = target.action === "delete" ? "delete_user" : target.action;
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action, target_user_id: target.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("✓");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
      setTarget(null);
    }
  };

  const dialogDesc = () => {
    if (!target) return "";
    const name = `"${target.name}"`;
    if (target.action === "delete") return `${name} - ${t.confirmDelete}`;
    if (target.action === "add_admin") return `${name} - ${t.confirmSetAdmin}`;
    return `${name} - ${t.confirmRemoveAdmin}`;
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-4 pb-24 animate-slide-up">
      <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">{t.title}</h1>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary" className="shrink-0 gap-1">
            <Users className="h-3 w-3" />
            {filtered.length}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t.noUsers}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const isUserAdmin = adminIds.has(p.user_id);
            const isSelf = p.user_id === user?.id;
            const name = p.display_name || p.email || p.user_id.slice(0, 8);
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {(name[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      {isUserAdmin && (
                        <Badge variant="default" className="gap-1 px-1.5 py-0 text-[10px]">
                          <Crown className="h-3 w-3" />
                          {t.admin}
                        </Badge>
                      )}
                    </div>
                    {p.email && <p className="truncate text-xs text-muted-foreground">{p.email}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {t.joined}: {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {!isSelf && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isUserAdmin ? (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => setTarget({ id: p.user_id, name, action: "remove_admin" })}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t.removeAdmin}
                      </Button>
                    ) : (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => setTarget({ id: p.user_id, name, action: "add_admin" })}
                      >
                        <Crown className="h-3.5 w-3.5" />
                        {t.setAdmin}
                      </Button>
                    )}
                    <Button
                      size="sm" variant="destructive"
                      onClick={() => setTarget({ id: p.user_id, name, action: "delete" })}
                    >
                      <UserX className="h-3.5 w-3.5" />
                      {t.deleteUser}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.action === "delete" ? t.deleteUser
                : target?.action === "add_admin" ? t.setAdmin
                : t.removeAdmin}
            </AlertDialogTitle>
            <AlertDialogDescription>{dialogDesc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={runAction} disabled={busy}>
              {t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}