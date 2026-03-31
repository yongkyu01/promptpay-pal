import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import AppHeader from "@/components/AppHeader";
import BottomTabBar from "@/components/BottomTabBar";
import DashboardPage from "@/pages/DashboardPage";
import UploadPage from "@/pages/UploadPage";
import TransactionsPage from "@/pages/TransactionsPage";
import CleanupPage from "@/pages/CleanupPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <div className="min-h-screen bg-background">
            <AppHeader />
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/cleanup" element={<CleanupPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomTabBar />
          </div>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
