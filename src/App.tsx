import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Portfolios from "./pages/Portfolios";
import PortfolioDetail from "./pages/PortfolioDetail";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import AuditLogs from "./pages/AuditLogs";
import Reports from "./pages/Reports";
import MarketWatch from "./pages/MarketWatch";
import Messages from "./pages/Messages";
import AdvisorPanel from "./pages/AdvisorPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="portfolios" element={<Portfolios />} />
            <Route path="portfolios/:id" element={<PortfolioDetail />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="admin" element={<Admin />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="market-watch" element={<MarketWatch />} />
            <Route path="messages" element={<Messages />} />
            <Route path="advisor-panel" element={<AdvisorPanel />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
