import { Plus, ScanLine, PenLine } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

export default function AddExpenseFAB() {
  const { lang } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (location.pathname !== "/") return null;

  const options = [
    {
      icon: ScanLine,
      label: t("aiScan", lang),
      desc: t("aiScanDesc", lang),
      action: () => { setOpen(false); navigate("/upload"); },
      gradient: "gradient-primary",
    },
    {
      icon: PenLine,
      label: t("manualEntry", lang),
      desc: t("manualEntryDesc", lang),
      action: () => { setOpen(false); navigate("/manual"); },
      gradient: "gradient-gold",
    },
  ];

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-lg shadow-primary/40 transition-transform active:scale-90">
          <Plus className="h-7 w-7 text-primary-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="pb-8">
        <div className="mx-auto w-full max-w-lg px-4 pt-4">
          <h3 className="mb-4 text-center text-base font-bold text-foreground">
            {t("addExpense", lang)}
          </h3>
          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.action}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-secondary"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${opt.gradient}`}>
                  <opt.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
