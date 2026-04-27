import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import AppHeader from "@/components/AppHeader";
import BottomTabBar from "@/components/BottomTabBar";
import DashboardPage from "@/pages/DashboardPage";
import UploadPage from "@/pages/UploadPage";
import TransactionsPage from "@/pages/TransactionsPage";
import CleanupPage from "@/pages/CleanupPage";
import ExpenseDetailPage from "@/pages/ExpenseDetailPage";
import ManualEntryPage from "@/pages/ManualEntryPage";
import BudgetSettingsPage from "@/pages/BudgetSettingsPage";
import AuthPage from "@/pages/AuthPage";
import AddExpenseFAB from "@/components/AddExpenseFAB";
import DutchPage from "@/pages/DutchPage";
import DutchSplitPage from "@/pages/DutchSplitPage";
import MyPage from "@/pages/MyPage";
import BoardPage from "@/pages/BoardPage";
import DeleteAccountPage from "@/pages/DeleteAccountPage";
import InquiryPage from "@/pages/InquiryPage";
import TermsConsentGate from "@/components/TermsConsentGate";
import PublicLegalPage from "@/pages/PublicLegalPage";
import NotFound from "./pages/NotFound.tsx";
import { isNative, setSessionFromCallbackUrl } from "@/lib/nativeAuth";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Native deep-link listener: handles OAuth callbacks that arrive when the
  // in-app browser cannot deliver them directly to the awaiting promise.
  useEffect(() => {
    if (!isNative()) return;
    let sub: { remove: () => void } | null = null;
    CapacitorApp.addListener("appUrlOpen", async (data) => {
      try {
        const url = new URL(data.url);
        if (url.hash.includes("access_token") || url.search.includes("access_token")) {
          await Browser.close().catch(() => {});
          await setSessionFromCallbackUrl(url);
        }
      } catch (e) {
        console.error("Deep link handler failed", e);
      }
    }).then((s) => { sub = s; });
    return () => { sub?.remove(); };
  }, []);

  // Public legal pages — accessible without login.
  if (location.pathname === "/legal/terms") {
    return <PublicLegalPage kind="terms" />;
  }
  if (location.pathname === "/legal/privacy") {
    return <PublicLegalPage kind="privacy" />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <TermsConsentGate>
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/expense/:id" element={<ExpenseDetailPage />} />
        <Route path="/manual" element={<ManualEntryPage />} />
        <Route path="/budgets" element={<BudgetSettingsPage />} />
        <Route path="/cleanup" element={<CleanupPage />} />
        <Route path="/dutch" element={<DutchPage />} />
        <Route path="/dutch/:id" element={<DutchSplitPage />} />
        <Route path="/me" element={<MyPage />} />
        <Route path="/board/:board" element={<BoardPage />} />
        <Route path="/inquiry" element={<InquiryPage />} />
        <Route path="/me/delete" element={<DeleteAccountPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AddExpenseFAB />
      <BottomTabBar />
    </div>
    </TermsConsentGate>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
