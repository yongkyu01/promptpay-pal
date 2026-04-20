import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();

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
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AddExpenseFAB />
      <BottomTabBar />
    </div>
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
