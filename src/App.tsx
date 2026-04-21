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
import DocsLayout from "@/components/docs/DocsLayout";
import DocsOverview from "./pages/docs/DocsOverview";
import DocsQuickStart from "./pages/docs/DocsQuickStart";
import DocsAuthentication from "./pages/docs/DocsAuthentication";
import DocsPayments from "./pages/docs/DocsPayments";
import DocsCustomers from "./pages/docs/DocsCustomers";
import DocsWebhooks from "./pages/docs/DocsWebhooks";
import DocsApiKeys from "./pages/docs/DocsApiKeys";
import DocsSdks from "./pages/docs/DocsSdks";
import DocsInvoices from "./pages/docs/DocsInvoices";
import DocsProducts from "./pages/docs/DocsProducts";
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

import Products from "./pages/Products";
import Integrations from "./pages/Integrations";
import RiskProfile from "./pages/RiskProfile";
import ThreeDSecureSettings from "./pages/ThreeDSecureSettings";
import SmartRetry from "./pages/SmartRetry";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import FrontPricing from "./pages/front/Pricing";
import FrontDemo from "./pages/front/Demo";
import FrontAbout from "./pages/front/About";
import FrontPartners from "./pages/front/Partners";
import FrontCookiePolicy from "./pages/front/CookiePolicy";
import FrontTerms from "./pages/front/Terms";
import FrontPrivacyPolicy from "./pages/front/PrivacyPolicy";
import FrontSecurity from "./pages/front/Security";
import FrontHelp from "./pages/front/Help";
import FrontContact from "./pages/front/Contact";
import SolutionEcommerce from "./pages/front/solutions/Ecommerce";
import SolutionSaas from "./pages/front/solutions/Saas";
import SolutionMarketplaces from "./pages/front/solutions/Marketplaces";
import SolutionEnterprise from "./pages/front/solutions/Enterprise";
import ProductOnlinePayments from "./pages/front/products/OnlinePayments";
import ProductPaymentGateway from "./pages/front/products/PaymentGateway";
import ProductPaymentMethods from "./pages/front/products/PaymentMethods";
import ProductFraudPrevention from "./pages/front/products/FraudPrevention";
import { CookieNotice } from "@/components/front/CookieNotice";

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
    <Route path="/" element={<Landing />} />
    <Route path="/pricing" element={<FrontPricing />} />
    <Route path="/demo" element={<FrontDemo />} />
    <Route path="/about" element={<FrontAbout />} />
    <Route path="/partners" element={<FrontPartners />} />
    <Route path="/cookie-policy" element={<FrontCookiePolicy />} />
    <Route path="/terms" element={<FrontTerms />} />
    <Route path="/privacy-policy" element={<FrontPrivacyPolicy />} />
    <Route path="/security" element={<FrontSecurity />} />
    <Route path="/help" element={<FrontHelp />} />
    <Route path="/contact" element={<FrontContact />} />
    <Route path="/solutions/ecommerce" element={<SolutionEcommerce />} />
    <Route path="/solutions/saas" element={<SolutionSaas />} />
    <Route path="/solutions/marketplaces" element={<SolutionMarketplaces />} />
    <Route path="/solutions/enterprise" element={<SolutionEnterprise />} />
    <Route path="/products/online-payments" element={<ProductOnlinePayments />} />
    <Route path="/products/payment-gateway" element={<ProductPaymentGateway />} />
    <Route path="/products/payment-methods" element={<ProductPaymentMethods />} />
    <Route path="/products/fraud-prevention" element={<ProductFraudPrevention />} />
    <Route path="/login" element={<AuthRoute><Auth defaultMode="login" /></AuthRoute>} />
    <Route path="/signup" element={<AuthRoute><Auth defaultMode="signup" /></AuthRoute>} />
    <Route path="/auth" element={<Navigate to="/login" replace />} />
    <Route path="/landing" element={<Navigate to="/" replace />} />
    <Route path="/developers" element={<DocsLayout />}>
      <Route index element={<DocsOverview />} />
      <Route path="quick-start" element={<DocsQuickStart />} />
      <Route path="api/authentication" element={<DocsAuthentication />} />
      <Route path="api/payments" element={<DocsPayments />} />
      <Route path="api/customers" element={<DocsCustomers />} />
      <Route path="api/invoices" element={<DocsInvoices />} />
      <Route path="api/products" element={<DocsProducts />} />
      <Route path="webhooks" element={<DocsWebhooks />} />
      <Route path="api-keys" element={<DocsApiKeys />} />
      <Route path="sdks" element={<DocsSdks />} />
    </Route>
    {/* Legacy /docs → /developers redirects */}
    <Route path="/docs" element={<Navigate to="/developers" replace />} />
    <Route path="/docs/*" element={<Navigate to="/developers" replace />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
    <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
    <Route path="/wallets" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><Wallets /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/payouts" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><Payouts /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/payments/new" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><NewPayment /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/payment-links" element={<ProtectedRoute><PaymentLinks /></ProtectedRoute>} />
    <Route path="/checkout" element={<Checkout />} />
    <Route path="/pay/:invoiceId" element={<PayInvoice />} />
    <Route path="/subscriptions" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><Subscriptions /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/portal" element={<ProtectedRoute><CustomerPortal /></ProtectedRoute>} />
    <Route path="/chargebacks" element={<ProtectedRoute><Chargebacks /></ProtectedRoute>} />
    <Route path="/chargebacks/disputes" element={<ProtectedRoute><MerchantDisputes /></ProtectedRoute>} />
    <Route path="/chargebacks/evidence" element={<ProtectedRoute><MerchantEvidence /></ProtectedRoute>} />
    <Route path="/chargebacks/analytics" element={<ProtectedRoute><MerchantAnalytics /></ProtectedRoute>} />
    <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/reseller" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['reseller']}><ResellerPortal /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><Analytics /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/refunds" element={<ProtectedRoute><Refunds /></ProtectedRoute>} />
    <Route path="/settlements" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><Settlements /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/reconciliation" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin']}><Reconciliation /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><Reports /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/bank-accounts" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><BankAccounts /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/recipients" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><Recipients /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/treasury" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin']}><Treasury /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/audit-trail" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin']}><AuditTrail /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/webhooks" element={<Navigate to="/settings" replace />} />
    <Route path="/products" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><Products /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/kyc" element={<Navigate to="/settings" replace />} />
    <Route path="/risk" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin']}><RiskProfile /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/chargeflow" element={<Navigate to="/chargebacks" replace />} />
    <Route path="/3ds-settings" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin']}><ThreeDSecureSettings /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/smart-retry" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin']}><SmartRetry /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/integrations" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin']}><Integrations /></RoleProtectedRoute></ProtectedRoute>} />
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
          <CookieNotice />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
