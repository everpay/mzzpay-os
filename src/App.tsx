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
import DocsRefunds from "./pages/docs/DocsRefunds";
import DocsPayouts from "./pages/docs/DocsPayouts";
import DocsSubscriptionsApi from "./pages/docs/DocsSubscriptions";
import DocsDisputes from "./pages/docs/DocsDisputes";
import DocsOpenBanking from "./pages/docs/DocsOpenBanking";
import DocsWallets from "./pages/docs/DocsWallets";
import DocsFx from "./pages/docs/DocsFx";
import DocsCrypto from "./pages/docs/DocsCrypto";
import DocsPaymentLinks from "./pages/docs/DocsPaymentLinks";
import Docs3DSecure from "./pages/docs/Docs3DSecure";
import DocsWebhookEvents from "./pages/docs/DocsWebhookEvents";
import DocsVerification from "./pages/docs/DocsVerification";
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
import EmailDnsBundle from "./pages/EmailDnsBundle";
import LlmsTxt from "./pages/LlmsTxt";
import BrandGlyph from "./pages/BrandGlyph";

import Products from "./pages/Products";
import Integrations from "./pages/Integrations";
import RiskProfile from "./pages/RiskProfile";
import ThreeDSecureSettings from "./pages/ThreeDSecureSettings";
import SmartRetry from "./pages/SmartRetry";
import ProcessorRouting from "./pages/ProcessorRouting";
import MultiAcquirer from "./pages/MultiAcquirer";
import AdminProcessors from "./pages/admin/AdminProcessors";
import AdminEmailLog from "./pages/admin/AdminEmailLog";
import ProcessorAnalyticsPage from "./pages/ProcessorAnalyticsPage";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import FrontPricing from "./pages/front/Pricing";
import FrontDemo from "./pages/front/Demo";
import FrontAbout from "./pages/front/About";
import FrontPartners from "./pages/front/Partners";
import FrontCookiePolicy from "./pages/front/CookiePolicy";
import FrontTerms from "./pages/front/Terms";
import FrontAmlPolicy from "./pages/front/AmlPolicy";
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

// When the app is served from checkout.mzzpay.io, the root URL should
// land directly on the hosted checkout page instead of the marketing site.
// Preserve the query string so payment-link parameters survive the redirect.
const isCheckoutSubdomain =
  typeof window !== "undefined" &&
  window.location.hostname.startsWith("checkout.");

const CheckoutRootRedirect = () => {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return <Navigate to={`/checkout${search}`} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={isCheckoutSubdomain ? <CheckoutRootRedirect /> : <Landing />}
    />
    <Route path="/pricing" element={<FrontPricing />} />
    <Route path="/demo" element={<FrontDemo />} />
    <Route path="/about" element={<FrontAbout />} />
    <Route path="/partners" element={<FrontPartners />} />
    <Route path="/cookie-policy" element={<FrontCookiePolicy />} />
    <Route path="/terms" element={<FrontTerms />} />
    <Route path="/aml-policy" element={<FrontAmlPolicy />} />
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
      <Route path="api/refunds" element={<DocsRefunds />} />
      <Route path="api/payouts" element={<DocsPayouts />} />
      <Route path="api/subscriptions" element={<DocsSubscriptionsApi />} />
      <Route path="api/disputes" element={<DocsDisputes />} />
      <Route path="api/open-banking" element={<DocsOpenBanking />} />
      <Route path="api/wallets" element={<DocsWallets />} />
      <Route path="api/fx" element={<DocsFx />} />
      <Route path="api/crypto" element={<DocsCrypto />} />
      <Route path="api/payment-links" element={<DocsPaymentLinks />} />
      <Route path="api/3d-secure" element={<Docs3DSecure />} />
      <Route path="webhooks" element={<DocsWebhooks />} />
      <Route path="webhooks/events" element={<DocsWebhookEvents />} />
      <Route path="api-keys" element={<DocsApiKeys />} />
      <Route path="sdks" element={<DocsSdks />} />
      <Route path="verification" element={<DocsVerification />} />
    </Route>
    {/* LLM-friendly developer docs (paste into ChatGPT / Claude / Cursor) */}
    <Route path="/llms.txt" element={<LlmsTxt />} />
    <Route path="/brand/glyph" element={<BrandGlyph />} />
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
    <Route path="/settings/email-dns" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin']}><EmailDnsBundle /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/webhooks" element={<Navigate to="/settings" replace />} />
    <Route path="/products" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin','reseller','developer','compliance_officer','agent','employee']}><Products /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/kyc" element={<Navigate to="/settings" replace />} />
    <Route path="/risk" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin']}><RiskProfile /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/chargeflow" element={<Navigate to="/chargebacks" replace />} />
    <Route path="/3ds-settings" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin']}><ThreeDSecureSettings /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/smart-retry" element={<ProtectedRoute><SmartRetry /></ProtectedRoute>} />
    <Route path="/processor-routing" element={<ProtectedRoute><ProcessorRouting /></ProtectedRoute>} />
    <Route path="/processor-transparency" element={<Navigate to="/processor-routing" replace />} />
    <Route path="/processor-analytics" element={<ProtectedRoute><ProcessorAnalyticsPage /></ProtectedRoute>} />
    <Route path="/multi-acquirer" element={<ProtectedRoute><MultiAcquirer /></ProtectedRoute>} />
    <Route path="/admin/processors" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin']}><AdminProcessors /></RoleProtectedRoute></ProtectedRoute>} />
    <Route path="/admin/email-log" element={<ProtectedRoute><RoleProtectedRoute strict allowedRoles={['super_admin','admin']}><AdminEmailLog /></RoleProtectedRoute></ProtectedRoute>} />
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
