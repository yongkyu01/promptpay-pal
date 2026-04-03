import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { getCategoryLabel, getCategoryColor, getCategoryIcon, type Category } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, Share2, X, Calendar, Clock, User, Hash, FileText, Briefcase } from "lucide-react";
import FortuneScoreCard from "@/components/FortuneScoreCard";
import { useState } from "react";
import { toast } from "sonner";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: slipImage } = useQuery({
    queryKey: ["slip-image", expense?.slip_id],
    queryFn: async () => {
      if (!expense?.slip_id) return null;
      const { data } = await supabase
        .from("slips")
        .select("image_url")
        .eq("id", expense.slip_id)
        .single();
      return data?.image_url ?? null;
    },
    enabled: !!expense?.slip_id,
  });

  const handleDelete = async () => {
    if (!expense) return;
    try {
      await supabase.from("expenses").delete().eq("id", expense.id);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(lang === "th" ? "ลบรายการสำเร็จ" : "Expense deleted");
      navigate(-1);
    } catch {
      toast.error(lang === "th" ? "ลบไม่สำเร็จ" : "Failed to delete");
    }
  };

  const handleShareLine = () => {
    if (!expense) return;
    const text = [
      `💸 ${lang === "th" ? "รายจ่าย" : "Expense"}`,
      `📍 ${expense.recipient}`,
      `💰 ฿${Number(expense.amount).toLocaleString()}`,
      `📅 ${expense.date}${expense.time ? ` ${expense.time}` : ""}`,
      `🏷️ ${getCategoryLabel(expense.category as Category, lang)}`,
      (expense as any).ref_no ? `🔖 Ref: ${(expense as any).ref_no}` : "",
    ].filter(Boolean).join("\n");
    const encoded = encodeURIComponent(text);
    window.open(`https://social-plugins.line.me/lineit/share?text=${encoded}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{lang === "th" ? "ไม่พบข้อมูล" : "Not found"}</p>
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary">
          {lang === "th" ? "กลับ" : "Go back"}
        </button>
      </div>
    );
  }

  const Icon = getCategoryIcon(expense.category);
  const color = getCategoryColor(expense.category);
  const refNo = (expense as any).ref_no;
  const expenseType = (expense as any).expense_type;
  const { convert: toKRW } = useExchangeRate();

  return (
    <div className="mx-auto max-w-lg pb-24 animate-slide-up">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background/80 backdrop-blur-md px-4 py-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span>{lang === "th" ? "รายละเอียด" : "Detail"}</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => toast.info(lang === "th" ? "ฟีเจอร์แก้ไข กำลังพัฒนา" : "Edit feature coming soon")}
            className="rounded-lg p-2 transition-colors hover:bg-secondary"
          >
            <Pencil className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="rounded-lg p-2 transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4.5 w-4.5 text-destructive" />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Amount Hero */}
        <div className="rounded-2xl gradient-primary p-6 text-center shadow-primary">
          <p className="text-sm font-medium text-primary-foreground/70">
            {lang === "th" ? "ยอดเงิน" : "Amount"}
          </p>
          <p className="mt-1 text-4xl font-extrabold text-primary-foreground tracking-tight">
            ฿{Number(expense.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-primary-foreground/50">≈ ₩{toKRW(Number(expense.amount)).toLocaleString()} KRW</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1">
              <Icon className="h-4 w-4 text-primary-foreground" />
              <span className="text-xs font-semibold text-primary-foreground">
                {getCategoryLabel(expense.category as Category, lang)}
              </span>
            </div>
            {expenseType === "business" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-3 py-1">
                <Briefcase className="h-3 w-3 text-primary-foreground" />
                <span className="text-xs font-semibold text-primary-foreground">BIZ</span>
              </span>
            )}
          </div>
        </div>

        {/* Slip Image */}
        {slipImage && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground">
                {lang === "th" ? "ภาพสลิป" : "Slip Image"}
              </p>
            </div>
            <button
              onClick={() => setImageFullscreen(true)}
              className="w-full"
            >
              <img
                src={slipImage}
                alt="Payment slip"
                className="w-full max-h-64 object-contain bg-secondary/50 transition-transform hover:scale-[1.02]"
              />
            </button>
          </div>
        )}

        {/* Details Card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground">
              {lang === "th" ? "ข้อมูลที่ AI วิเคราะห์" : "AI Extracted Data"}
            </p>
          </div>
          <div className="divide-y divide-border">
            <DetailRow
              icon={<User className="h-4 w-4" />}
              label={lang === "th" ? "ผู้รับเงิน" : "Receiver"}
              value={expense.recipient}
              color={color}
            />
            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label={lang === "th" ? "วันที่" : "Date"}
              value={expense.date}
              color={color}
            />
            <DetailRow
              icon={<Clock className="h-4 w-4" />}
              label={lang === "th" ? "เวลา" : "Time"}
              value={expense.time || "-"}
              color={color}
            />
            {refNo && (
              <DetailRow
                icon={<Hash className="h-4 w-4" />}
                label="Ref No."
                value={refNo}
                color={color}
                mono
              />
            )}
            <DetailRow
              icon={<FileText className="h-4 w-4" />}
              label={lang === "th" ? "หมวดหมู่" : "Category"}
              value={getCategoryLabel(expense.category as Category, lang)}
              color={color}
            />
          </div>
        </div>

        {/* LINE Share Button */}
        <button
          onClick={handleShareLine}
          className="flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-base font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
          style={{ background: "#06C755" }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          {lang === "th" ? "แชร์ผ่าน LINE" : "Share via LINE"}
        </button>
      </div>

      {/* Fullscreen Image Overlay */}
      {imageFullscreen && slipImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
          onClick={() => setImageFullscreen(false)}
        >
          <button className="absolute top-4 right-4 rounded-full bg-secondary p-2" onClick={() => setImageFullscreen(false)}>
            <X className="h-6 w-6 text-foreground" />
          </button>
          <img src={slipImage} alt="Slip full" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" />
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "th" ? "ยืนยันการลบ" : "Confirm Delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "th"
                ? "คุณต้องการลบรายจ่ายนี้หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้"
                : "Are you sure you want to delete this expense? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "th" ? "ยกเลิก" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {lang === "th" ? "ลบ" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  color,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ background: color + "15", color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-medium text-foreground truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
