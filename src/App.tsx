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
import Analytics from "./pages/Analytics";
import Subscriptions from "./pages/Subscriptions";
import CustomerPortal from "./pages/CustomerPortal";
import Chargebacks from "./pages/Chargebacks";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import Docs from "./pages/Docs";
import Invoices from "./pages/Invoices";
import PayInvoice from "./pages/PayInvoice";
import ResellerPortal from "./pages/ResellerPortal";
import Customers from "./pages/Customers";
import MerchantDisputes from "./pages/merchant/MerchantDisputes";
import MerchantEvidence from "./pages/merchant/MerchantEvidence";
import MerchantAnalytics from "./pages/merchant/MerchantAnalytics";
import Refunds from "./pages/Refunds";
import Settlements from "./pages/Settlements";
import Reconciliation from "./pages/Reconciliation";
import Reports from "./pages/Reports";
import BankAccounts from "./pages/BankAccounts";
import Recipients from "./pages/Recipients";
import Treasury from "./pages/Treasury";
import AuditTrail from "./pages/AuditTrail";
import Webhooks from "./pages/Webhooks";
import Products from "./pages/Products";
import KYCOnboarding from "./pages/KYCOnboarding";
import RiskProfile from "./pages/RiskProfile";
import ChargeflowDashboard from "./pages/ChargeflowDashboard";
import ThreeDSecureSettings from "./pages/ThreeDSecureSettings";
import SmartRetry from "./pages/SmartRetry";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
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
    <Route path="/" element={<AuthRoute><Auth defaultMode="login" /></AuthRoute>} />
    <Route path="/login" element={<AuthRoute><Auth defaultMode="login" /></AuthRoute>} />
    <Route path="/signup" element={<AuthRoute><Auth defaultMode="signup" /></AuthRoute>} />
    <Route path="/auth" element={<Navigate to="/login" replace />} />
    <Route path="/landing" element={<Landing />} />
    <Route path="/docs" element={<Docs />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
    <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
    <Route path="/wallets" element={<ProtectedRoute><Wallets /></ProtectedRoute>} />
    <Route path="/payouts" element={<ProtectedRoute><Payouts /></ProtectedRoute>} />
    <Route path="/payments/new" element={<ProtectedRoute><NewPayment /></ProtectedRoute>} />
    <Route path="/payment-links" element={<ProtectedRoute><PaymentLinks /></ProtectedRoute>} />
    <Route path="/checkout" element={<Checkout />} />
    <Route path="/pay/:invoiceId" element={<PayInvoice />} />
    <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
    <Route path="/portal" element={<ProtectedRoute><CustomerPortal /></ProtectedRoute>} />
    <Route path="/chargebacks" element={<ProtectedRoute><Chargebacks /></ProtectedRoute>} />
    <Route path="/chargebacks/disputes" element={<ProtectedRoute><MerchantDisputes /></ProtectedRoute>} />
    <Route path="/chargebacks/evidence" element={<ProtectedRoute><MerchantEvidence /></ProtectedRoute>} />
    <Route path="/chargebacks/analytics" element={<ProtectedRoute><MerchantAnalytics /></ProtectedRoute>} />
    <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/reseller" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['reseller']}><ResellerPortal /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
    <Route path="/refunds" element={<ProtectedRoute><Refunds /></ProtectedRoute>} />
    <Route path="/settlements" element={<ProtectedRoute><Settlements /></ProtectedRoute>} />
    <Route path="/reconciliation" element={<ProtectedRoute><Reconciliation /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/bank-accounts" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
    <Route path="/recipients" element={<ProtectedRoute><Recipients /></ProtectedRoute>} />
    <Route path="/treasury" element={<ProtectedRoute><Treasury /></ProtectedRoute>} />
    <Route path="/audit-trail" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
    <Route path="/webhooks" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />
    <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
    <Route path="/kyc" element={<ProtectedRoute><KYCOnboarding /></ProtectedRoute>} />
    <Route path="/risk" element={<ProtectedRoute><RiskProfile /></ProtectedRoute>} />
    <Route path="/chargeflow" element={<ProtectedRoute><ChargeflowDashboard /></ProtectedRoute>} />
    <Route path="/3ds-settings" element={<ProtectedRoute><ThreeDSecureSettings /></ProtectedRoute>} />
    <Route path="/smart-retry" element={<ProtectedRoute><SmartRetry /></ProtectedRoute>} />
    {/* Redirect old routes */}
    <Route path="/new-payment" element={<Navigate to="/payments/new" replace />} />
    <Route path="/merchant" element={<Navigate to="/chargebacks" replace />} />
    <Route path="/merchant/disputes" element={<Navigate to="/chargebacks/disputes" replace />} />
    <Route path="/merchant/evidence" element={<Navigate to="/chargebacks/evidence" replace />} />
    <Route path="/merchant/analytics" element={<Navigate to="/chargebacks/analytics" replace />} />
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
