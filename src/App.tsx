import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Transactions from "./pages/Transactions";
import Wallets from "./pages/Wallets";
import Payouts from "./pages/Payouts";
import NewPayment from "./pages/NewPayment";
import PaymentLinks from "./pages/PaymentLinks";
import Checkout from "./pages/Checkout";
import Activity from "./pages/Activity";
import Subscriptions from "./pages/Subscriptions";
import CustomerPortal from "./pages/CustomerPortal";
import Chargebacks from "./pages/Chargebacks";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import Docs from "./pages/Docs";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
    <Route path="/wallets" element={<ProtectedRoute><Wallets /></ProtectedRoute>} />
    <Route path="/payouts" element={<ProtectedRoute><Payouts /></ProtectedRoute>} />
    <Route path="/payments/new" element={<ProtectedRoute><NewPayment /></ProtectedRoute>} />
    <Route path="/payment-links" element={<ProtectedRoute><PaymentLinks /></ProtectedRoute>} />
    <Route path="/checkout" element={<Checkout />} />
    <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
    <Route path="/portal" element={<ProtectedRoute><CustomerPortal /></ProtectedRoute>} />
    <Route path="/chargebacks" element={<ProtectedRoute><Chargebacks /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
