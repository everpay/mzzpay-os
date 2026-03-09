import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Copy,
  Check,
  Menu,
  X,
  BookOpen,
  CreditCard,
  Wallet,
  ArrowDownToLine,
  RefreshCw,
  Shield,
  BarChart3,
  Webhook,
  Mail,
  Search,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import everpayIcon from '@/assets/everpay-icon.png';

// ============= CODE BLOCK COMPONENT =============
function CodeBlock({ code, language = 'bash', title }: { code: string; language?: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-[#2a2a3e] bg-[#0f0f1a] overflow-hidden my-4">
      {title && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2a3e] bg-[#161628]">
          <span className="text-xs font-mono text-gray-400">{title}</span>
          <button onClick={handleCopy} className="text-gray-500 hover:text-gray-300 transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      <div className="relative">
        {!title && (
          <button onClick={handleCopy} className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
        <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
          <code className="text-gray-300 font-mono">{code}</code>
        </pre>
      </div>
    </div>
  );
}

// ============= PARAMETER TABLE =============
function ParamTable({ params }: { params: { name: string; type: string; required?: boolean; description: string }[] }) {
  return (
    <div className="my-4 rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2.5 font-semibold text-gray-700" style={{ fontFamily: 'Manrope, sans-serif' }}>Parameter</th>
            <th className="text-left px-4 py-2.5 font-semibold text-gray-700" style={{ fontFamily: 'Manrope, sans-serif' }}>Type</th>
            <th className="text-left px-4 py-2.5 font-semibold text-gray-700" style={{ fontFamily: 'Manrope, sans-serif' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3">
                <code className="text-[13px] font-mono text-[#1aa478] bg-[#1aa478]/5 px-1.5 py-0.5 rounded">{p.name}</code>
                {p.required && <Badge className="ml-2 text-[10px] bg-red-50 text-red-600 border-red-200">required</Badge>}
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.type}</td>
              <td className="px-4 py-3 text-gray-600">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============= ENDPOINT BADGE =============
function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PUT' | 'DELETE' }) {
  const colors = {
    GET: 'bg-blue-50 text-blue-700 border-blue-200',
    POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PUT: 'bg-amber-50 text-amber-700 border-amber-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200',
  };
  return <Badge className={`${colors[method]} font-mono text-[11px] font-bold`}>{method}</Badge>;
}

// ============= SIDEBAR SECTION =============
const sections = [
  { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { id: 'authentication', label: 'Authentication', icon: Shield },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'wallets', label: 'Wallets & Accounts', icon: Wallet },
  { id: 'payouts', label: 'Payouts', icon: ArrowDownToLine },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { id: 'disputes', label: 'Disputes & Chargebacks', icon: Shield },
  { id: 'enrichment', label: 'Transaction Enrichment', icon: Search },
  { id: 'emails', label: 'Transactional Emails', icon: Mail },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'errors', label: 'Error Handling', icon: Zap },
  { id: 'rate-limits', label: 'Rate Limits', icon: BarChart3 },
];

const BASE_URL = 'https://ccqiuoilfvuetajyjyiv.supabase.co/functions/v1';

// ============= DOCS PAGE =============
export default function Docs() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );

    const sectionEls = document.querySelectorAll('[data-docs-section]');
    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={everpayIcon} alt="Everpay" className="h-7 w-7 rounded-lg" />
              <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>everpay</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-gray-300" />
              <span className="text-sm font-semibold text-gray-900">API Documentation</span>
              <Badge className="ml-2 bg-[#1aa478]/10 text-[#1aa478] border-[#1aa478]/20 text-[10px]">v1.0</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-3.5 w-3.5" /> Home
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-[#1aa478] hover:bg-[#158f68] text-white rounded-full px-4">
                Get API Keys
              </Button>
            </Link>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto flex">
        {/* Sidebar */}
        <aside className={`
          ${mobileMenuOpen ? 'fixed inset-0 z-40 bg-white pt-16 px-6' : 'hidden'}
          md:block md:sticky md:top-16 md:h-[calc(100vh-64px)] md:w-[260px] md:flex-shrink-0 md:overflow-y-auto md:border-r md:border-gray-100 md:px-4 md:py-6
        `}>
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    activeSection === section.id
                      ? 'bg-[#1aa478]/8 text-[#1aa478]'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main ref={contentRef} className="flex-1 min-w-0 px-6 md:px-12 lg:px-20 py-10 max-w-4xl">

          {/* GETTING STARTED */}
          <section id="getting-started" data-docs-section className="mb-20">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Badge className="mb-4 bg-[#1aa478]/10 text-[#1aa478] border-[#1aa478]/20">Introduction</Badge>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Everpay API Reference
              </h1>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-2xl">
                The Everpay API is organized around REST. Our API accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes, authentication, and verbs.
              </p>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Base URL</h3>
                <CodeBlock code={BASE_URL} language="text" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Quick Start</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">Make your first API call in under a minute:</p>
              <CodeBlock
                title="cURL — Create a payment"
                code={`curl -X POST '${BASE_URL}/process-payment' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "amount": 2500,
    "currency": "CAD",
    "paymentMethod": "card",
    "customerEmail": "customer@example.com",
    "description": "Order #1234",
    "cardDetails": {
      "number": "4242424242424242",
      "expMonth": "12",
      "expYear": "2026",
      "cvc": "123"
    }
  }'`}
              />

              <div className="grid gap-4 mt-8 sm:grid-cols-2">
                {[
                  { label: 'Payments', desc: 'Accept cards, wallets, bank transfers', id: 'payments' },
                  { label: 'Payouts', desc: 'Withdraw to bank accounts worldwide', id: 'payouts' },
                  { label: 'Subscriptions', desc: 'Recurring billing & dunning', id: 'subscriptions' },
                  { label: 'Webhooks', desc: 'Real-time event notifications', id: 'webhooks' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="text-left p-4 rounded-xl border border-gray-200 hover:border-[#1aa478]/30 hover:shadow-sm transition-all group"
                  >
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-[#1aa478] transition-colors">{item.label}</span>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </section>

          {/* AUTHENTICATION */}
          <section id="authentication" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Authentication</h2>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              The Everpay API uses <strong>Bearer token</strong> authentication. Include your access token in the <code className="text-[#1aa478] bg-[#1aa478]/5 px-1 py-0.5 rounded text-xs">Authorization</code> header of every request.
            </p>
            <CodeBlock
              title="Authorization Header"
              code={`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...`}
            />
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Keep your tokens secure.</strong> Do not share your access token in publicly accessible areas such as GitHub, client-side code, or public URLs.
              </p>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Obtaining a Token</h3>
            <p className="text-gray-600 mb-4 text-sm">Sign up at <Link to="/auth" className="text-[#1aa478] hover:underline">everpay.app/auth</Link> to create your merchant account. Your JWT access token is generated on sign-in and scoped to your merchant.</p>
            <CodeBlock
              title="JavaScript — Sign in & get token"
              code={`import { createClient } from '@supabase/supabase-js';

const supabase = createClient(EVERPAY_URL, EVERPAY_ANON_KEY);

const { data: { session } } = await supabase.auth.signInWithPassword({
  email: 'merchant@example.com',
  password: 'your-password',
});

const token = session.access_token;
// Use this token in Authorization: Bearer <token>`}
            />
          </section>

          {/* PAYMENTS */}
          <section id="payments" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Payments</h2>
            <p className="text-gray-500 mb-8 text-sm">Accept payments via cards, wallets, PIX, Boleto, Open Banking, and more.</p>

            {/* Create Payment */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="POST" />
                <code className="text-sm font-mono text-gray-700">/process-payment</code>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Create a Payment</h3>
              <p className="text-gray-600 text-sm mb-4">
                Processes a payment through the optimal provider based on currency. EUR/GBP routes through Mondo, other currencies through ShieldHub. Card data is automatically vaulted to VGS for PCI compliance.
              </p>

              <ParamTable params={[
                { name: 'amount', type: 'number', required: true, description: 'Payment amount in the smallest currency unit (e.g., cents)' },
                { name: 'currency', type: 'string', required: true, description: 'Three-letter ISO currency code (CAD, USD, EUR, GBP, BRL, MXN, COP)' },
                { name: 'paymentMethod', type: 'string', required: true, description: 'One of: card, pix, boleto, apple_pay, open_banking' },
                { name: 'customerEmail', type: 'string', required: false, description: 'Customer email for receipt and tracking' },
                { name: 'description', type: 'string', required: false, description: 'A free-form description of the payment' },
                { name: 'idempotencyKey', type: 'string', required: false, description: 'Unique key to prevent duplicate charges' },
                { name: 'cardDetails', type: 'object', required: false, description: 'Required if paymentMethod is "card". Contains number, expMonth, expYear, cvc' },
              ]} />

              <CodeBlock
                title="Request"
                code={`curl -X POST '${BASE_URL}/process-payment' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "amount": 5000,
    "currency": "EUR",
    "paymentMethod": "card",
    "customerEmail": "john@example.com",
    "description": "Premium subscription",
    "idempotencyKey": "ord_abc123",
    "cardDetails": {
      "number": "4242424242424242",
      "expMonth": "12",
      "expYear": "2026",
      "cvc": "314"
    }
  }'`}
              />

              <CodeBlock
                title="Response — 200 OK"
                code={`{
  "success": true,
  "transaction": {
    "id": "txn_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "merchant_id": "mer_...",
    "amount": 5000,
    "currency": "EUR",
    "provider": "mondo",
    "status": "completed",
    "customer_email": "john@example.com",
    "description": "Premium subscription",
    "provider_ref": "mondo_pay_xyz789",
    "fx_rate": null,
    "settlement_amount": 5000,
    "settlement_currency": "EUR",
    "created_at": "2025-03-09T12:00:00.000Z"
  }
}`}
              />

              <h4 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Payment Routing</h4>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Currency</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Provider</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Methods</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100"><td className="px-4 py-2.5 font-mono text-xs">EUR, GBP</td><td className="px-4 py-2.5">Mondo</td><td className="px-4 py-2.5">Card, Apple Pay, Open Banking</td></tr>
                    <tr className="border-b border-gray-100"><td className="px-4 py-2.5 font-mono text-xs">CAD, USD</td><td className="px-4 py-2.5">ShieldHub</td><td className="px-4 py-2.5">Card, Apple Pay</td></tr>
                    <tr><td className="px-4 py-2.5 font-mono text-xs">BRL, MXN, COP</td><td className="px-4 py-2.5">ShieldHub</td><td className="px-4 py-2.5">Card, PIX, Boleto</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className="text-sm font-semibold text-gray-900 mt-6 mb-2">FX Settlement</h4>
              <p className="text-gray-600 text-sm">Payments in BRL, MXN, and COP are automatically converted to USD for settlement. The <code className="text-[#1aa478] bg-[#1aa478]/5 px-1 py-0.5 rounded text-xs">fx_rate</code> and <code className="text-[#1aa478] bg-[#1aa478]/5 px-1 py-0.5 rounded text-xs">settlement_amount</code> fields reflect the conversion.</p>
            </div>
          </section>

          {/* WALLETS & ACCOUNTS */}
          <section id="wallets" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Wallets & Accounts</h2>
            <p className="text-gray-500 mb-8 text-sm">Manage multi-currency wallets and create Moneto-powered payment sessions.</p>

            {/* Get Wallets */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="POST" />
                <code className="text-sm font-mono text-gray-700">/moneto-wallet?action=get-wallets</code>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>List Wallets</h3>
              <p className="text-gray-600 text-sm mb-4">Returns all currency accounts (wallets) for your merchant, including balance, available balance, and pending balance.</p>
              <CodeBlock
                title="Response — 200 OK"
                code={`{
  "success": true,
  "wallets": [
    {
      "id": "acc_...",
      "currency": "CAD",
      "balance": 15000.00,
      "available_balance": 12500.00,
      "pending_balance": 2500.00,
      "created_at": "2025-01-15T08:00:00Z"
    },
    {
      "id": "acc_...",
      "currency": "USD",
      "balance": 8200.50,
      "available_balance": 8200.50,
      "pending_balance": 0,
      "created_at": "2025-01-15T08:00:00Z"
    }
  ]
}`}
              />
            </div>

            {/* Create Payment Session */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="POST" />
                <code className="text-sm font-mono text-gray-700">/moneto-wallet?action=create-payment</code>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Create Payment Session (Moneto)</h3>
              <p className="text-gray-600 text-sm mb-4">Creates a hosted payment page via Moneto. Redirect your customer to the returned URL.</p>
              <ParamTable params={[
                { name: 'amount', type: 'number', required: true, description: 'Payment amount' },
                { name: 'currency_code', type: 'string', required: true, description: 'ISO currency code (CAD, USD, EUR, GBP)' },
                { name: 'country_code', type: 'string', required: true, description: 'ISO country code (CA, US, EU, GB)' },
                { name: 'success_url', type: 'string', required: true, description: 'Redirect URL after successful payment' },
                { name: 'cancel_url', type: 'string', required: true, description: 'Redirect URL if customer cancels' },
                { name: 'first_name', type: 'string', required: true, description: 'Customer first name' },
                { name: 'last_name', type: 'string', required: true, description: 'Customer last name' },
                { name: 'email', type: 'string', required: false, description: 'Customer email' },
              ]} />
              <CodeBlock
                title="Response — 200 OK"
                code={`{
  "success": true,
  "payment_request_id": "pr_abc123def456",
  "payment_url": "https://pay-demo.genwin.net/pay-merchant?payment_request_id=pr_abc123def456"
}`}
              />
            </div>

            {/* Validate Payment */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="POST" />
                <code className="text-sm font-mono text-gray-700">/moneto-wallet?action=validate-payment</code>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Validate Payment</h3>
              <p className="text-gray-600 text-sm mb-4">Check the status of a Moneto payment session after the customer is redirected back.</p>
              <ParamTable params={[
                { name: 'payment_request_id', type: 'string', required: true, description: 'The ID returned from create-payment' },
              ]} />
            </div>
          </section>

          {/* PAYOUTS */}
          <section id="payouts" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Payouts</h2>
            <p className="text-gray-500 mb-8 text-sm">Withdraw funds to bank accounts. Payouts settle in 1–2 business days.</p>

            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="POST" />
              <code className="text-sm font-mono text-gray-700">/moneto-wallet?action=create-payout</code>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Create a Payout</h3>
            <p className="text-gray-600 text-sm mb-4">Initiates a bank transfer from your Everpay wallet. The amount is deducted from available balance and moved to pending.</p>
            <ParamTable params={[
              { name: 'amount', type: 'number', required: true, description: 'Payout amount' },
              { name: 'currency_code', type: 'string', required: true, description: 'Currency to pay out (must match a wallet)' },
              { name: 'country_code', type: 'string', required: true, description: 'Destination country (CA, US)' },
              { name: 'bank_account.institution_number', type: 'string', required: true, description: '3-digit Canadian institution number' },
              { name: 'bank_account.transit_number', type: 'string', required: true, description: '5-digit transit/branch number' },
              { name: 'bank_account.account_number', type: 'string', required: true, description: 'Full account number' },
              { name: 'bank_account.account_holder_name', type: 'string', required: true, description: 'Name on the bank account' },
            ]} />
            <CodeBlock
              title="Request"
              code={`curl -X POST '${BASE_URL}/moneto-wallet?action=create-payout' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "amount": 1000.00,
    "currency_code": "CAD",
    "country_code": "CA",
    "bank_account": {
      "institution_number": "003",
      "transit_number": "12345",
      "account_number": "1234567890",
      "account_holder_name": "Jane Doe"
    }
  }'`}
            />
            <CodeBlock
              title="Response — 200 OK"
              code={`{
  "success": true,
  "payout_id": "payout_1709985600_a1b2c3d4e",
  "status": "processing",
  "message": "Payout initiated successfully"
}`}
            />
          </section>

          {/* SUBSCRIPTIONS */}
          <section id="subscriptions" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Subscriptions</h2>
            <p className="text-gray-500 mb-8 text-sm">Manage recurring billing with plans, proration, dunning, and lifecycle webhooks.</p>

            {/* Prorate */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="POST" />
                <code className="text-sm font-mono text-gray-700">/prorate-subscription</code>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Prorate Subscription</h3>
              <p className="text-gray-600 text-sm mb-4">Change a customer's plan mid-cycle. Everpay calculates the prorated amount automatically.</p>
              <ParamTable params={[
                { name: 'subscription_id', type: 'string', required: true, description: 'The subscription to update' },
                { name: 'new_plan_id', type: 'string', required: true, description: 'The target plan to switch to' },
              ]} />
              <CodeBlock
                title="Response — 200 OK"
                code={`{
  "success": true,
  "proration": {
    "old_plan": "Basic",
    "new_plan": "Pro",
    "days_remaining": 15,
    "unused_credit": 7.50,
    "new_charge": 15.00,
    "prorated_amount": 7.50,
    "is_upgrade": true,
    "currency": "USD"
  }
}`}
              />
            </div>

            {/* Retry Payment */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="POST" />
                <code className="text-sm font-mono text-gray-700">/retry-payment</code>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Retry Failed Payment (Dunning)</h3>
              <p className="text-gray-600 text-sm mb-4">
                Retry payments for past-due subscriptions. Uses a smart dunning schedule: retry after 1, 3, and 7 days. After 3 failed attempts, the subscription is automatically canceled.
              </p>
              <ParamTable params={[
                { name: 'subscription_id', type: 'string', required: false, description: 'Specific subscription to retry. If omitted, retries all past-due subscriptions.' },
                { name: 'force', type: 'boolean', required: false, description: 'Set to true to skip the dunning schedule and retry immediately.' },
              ]} />
            </div>

            {/* Subscription Alerts */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <MethodBadge method="POST" />
                <code className="text-sm font-mono text-gray-700">/subscription-alerts</code>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Subscription Alerts</h3>
              <p className="text-gray-600 text-sm mb-4">Send lifecycle email alerts to customers.</p>
              <ParamTable params={[
                { name: 'type', type: 'string', required: true, description: 'One of: renewal_reminder, payment_failed, cancellation_confirmed, trial_ending' },
                { name: 'subscription_id', type: 'string', required: true, description: 'The subscription ID' },
                { name: 'customer_email', type: 'string', required: true, description: 'Recipient email address' },
              ]} />
            </div>
          </section>

          {/* DISPUTES */}
          <section id="disputes" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Disputes & Chargebacks</h2>
            <p className="text-gray-500 mb-8 text-sm">Powered by Chargeflow. Auto-sync disputes, enrich with order data, and track outcomes.</p>

            <div className="space-y-10">
              {/* List Disputes */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <MethodBadge method="POST" />
                  <code className="text-sm font-mono text-gray-700">/chargeflow?action=list-disputes</code>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>List Disputes</h3>
                <p className="text-gray-600 text-sm">Returns all disputes for your merchant, sorted by newest first.</p>
              </div>

              {/* Sync Disputes */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <MethodBadge method="POST" />
                  <code className="text-sm font-mono text-gray-700">/chargeflow?action=sync-disputes</code>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Sync Disputes from Chargeflow</h3>
                <p className="text-gray-600 text-sm">Pulls latest disputes from the Chargeflow API and upserts them into your local database.</p>
              </div>

              {/* Enrich Dispute */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <MethodBadge method="POST" />
                  <code className="text-sm font-mono text-gray-700">/chargeflow?action=enrich-dispute</code>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Enrich Dispute with Order Data</h3>
                <p className="text-gray-600 text-sm mb-3">Submit order evidence to Chargeflow for automated dispute response.</p>
                <ParamTable params={[
                  { name: 'dispute_id', type: 'string', required: true, description: 'Your local dispute ID' },
                  { name: 'chargeflow_dispute_id', type: 'string', required: true, description: 'The Chargeflow dispute ID' },
                  { name: 'order_data', type: 'object', required: true, description: 'Order evidence (shipping info, product details, etc.)' },
                ]} />
              </div>
            </div>
          </section>

          {/* ENRICHMENT */}
          <section id="enrichment" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Transaction Enrichment</h2>
            <p className="text-gray-500 mb-8 text-sm">Powered by Tapix. Enrich card transactions with BIN data, merchant info, and risk scores.</p>

            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="POST" />
              <code className="text-sm font-mono text-gray-700">/tapix-enrich</code>
            </div>
            <ParamTable params={[
              { name: 'cardNumber', type: 'string', required: true, description: 'Full card number or BIN (first 6-8 digits)' },
              { name: 'amount', type: 'number', required: false, description: 'Transaction amount for risk scoring' },
              { name: 'transactionId', type: 'string', required: false, description: 'Transaction ID for detailed lookup' },
            ]} />
            <CodeBlock
              title="Response — 200 OK"
              code={`{
  "success": true,
  "enrichment": {
    "card_brand": "visa",
    "card_type": "credit",
    "issuing_bank": "Royal Bank of Canada",
    "country": "CA",
    "risk_score": 12
  },
  "transaction": null
}`}
            />
          </section>

          {/* EMAILS */}
          <section id="emails" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Transactional Emails</h2>
            <p className="text-gray-500 mb-8 text-sm">Send branded email receipts and notifications via Resend.</p>

            <div className="flex items-center gap-3 mb-4">
              <MethodBadge method="POST" />
              <code className="text-sm font-mono text-gray-700">/send-transactional-email</code>
            </div>
            <ParamTable params={[
              { name: 'type', type: 'string', required: true, description: 'One of: payment_receipt, payout_confirmation, subscription_invoice, payment_failed, refund_confirmation' },
              { name: 'to', type: 'string', required: true, description: 'Recipient email address' },
              { name: 'data', type: 'object', required: true, description: 'Template data (amount, currency, transaction_id, etc.)' },
            ]} />
            <CodeBlock
              title="Request — Send payment receipt"
              code={`curl -X POST '${BASE_URL}/send-transactional-email' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "type": "payment_receipt",
    "to": "customer@example.com",
    "data": {
      "amount": 49.99,
      "currency": "USD",
      "transaction_id": "txn_abc123",
      "description": "Annual plan"
    }
  }'`}
            />

            <h4 className="text-sm font-semibold text-gray-900 mt-6 mb-3">Email Types</h4>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Type</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Description</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Required Data</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100"><td className="px-4 py-2.5 font-mono text-xs text-[#1aa478]">payment_receipt</td><td className="px-4 py-2.5">Payment confirmation</td><td className="px-4 py-2.5 text-xs">amount, currency</td></tr>
                  <tr className="border-b border-gray-100"><td className="px-4 py-2.5 font-mono text-xs text-[#1aa478]">payout_confirmation</td><td className="px-4 py-2.5">Payout initiated</td><td className="px-4 py-2.5 text-xs">amount, currency, account_last4</td></tr>
                  <tr className="border-b border-gray-100"><td className="px-4 py-2.5 font-mono text-xs text-[#1aa478]">subscription_invoice</td><td className="px-4 py-2.5">Subscription invoice</td><td className="px-4 py-2.5 text-xs">amount, currency, plan_name</td></tr>
                  <tr className="border-b border-gray-100"><td className="px-4 py-2.5 font-mono text-xs text-[#1aa478]">payment_failed</td><td className="px-4 py-2.5">Failed payment alert</td><td className="px-4 py-2.5 text-xs">amount, currency</td></tr>
                  <tr><td className="px-4 py-2.5 font-mono text-xs text-[#1aa478]">refund_confirmation</td><td className="px-4 py-2.5">Refund processed</td><td className="px-4 py-2.5 text-xs">amount, currency, transaction_id</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* WEBHOOKS */}
          <section id="webhooks" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Webhooks</h2>
            <p className="text-gray-500 mb-8 text-sm">
              Receive real-time event notifications. Configure your webhook URL in the <Link to="/settings" className="text-[#1aa478] hover:underline">Settings</Link> page.
            </p>

            <h3 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Webhook Endpoints</h3>
            <div className="rounded-xl border border-gray-200 overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Endpoint</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Source</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Events</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2.5 font-mono text-xs">/moneto-webhook</td>
                    <td className="px-4 py-2.5">Moneto</td>
                    <td className="px-4 py-2.5 text-xs">payment.succeeded, payment.failed, payout.completed, payout.failed</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2.5 font-mono text-xs">/chargeflow-webhook</td>
                    <td className="px-4 py-2.5">Chargeflow</td>
                    <td className="px-4 py-2.5 text-xs">dispute.created, dispute.ingested, evidence.pdf.created</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2.5 font-mono text-xs">/subscription-webhook</td>
                    <td className="px-4 py-2.5">Internal</td>
                    <td className="px-4 py-2.5 text-xs">subscription.created, renewed, canceled, payment_failed</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-xs">/payment-link-webhook</td>
                    <td className="px-4 py-2.5">Payment Links</td>
                    <td className="px-4 py-2.5 text-xs">payment_link.completed, failed, expired, refunded</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Merchant Webhook Forwarding</h3>
            <p className="text-gray-600 text-sm mb-4">
              When you set a <code className="text-[#1aa478] bg-[#1aa478]/5 px-1 py-0.5 rounded text-xs">webhook_url</code> on your merchant, Everpay forwards relevant events to your server:
            </p>
            <CodeBlock
              title="Example webhook payload to your server"
              code={`{
  "event": "moneto.payment.succeeded",
  "transaction_id": "txn_abc123",
  "payment_request_id": "pr_xyz789",
  "amount": 5000,
  "currency": "CAD",
  "timestamp": "2025-03-09T12:00:00.000Z"
}`}
            />
          </section>

          {/* ERRORS */}
          <section id="errors" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Error Handling</h2>
            <p className="text-gray-500 mb-8 text-sm">Everpay uses conventional HTTP response codes.</p>

            <div className="rounded-xl border border-gray-200 overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Code</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100"><td className="px-4 py-2.5 font-mono font-bold text-emerald-600">200</td><td className="px-4 py-2.5">Success</td></tr>
                  <tr className="border-b border-gray-100"><td className="px-4 py-2.5 font-mono font-bold text-amber-600">400</td><td className="px-4 py-2.5">Bad Request — missing or invalid parameters</td></tr>
                  <tr className="border-b border-gray-100"><td className="px-4 py-2.5 font-mono font-bold text-red-600">401</td><td className="px-4 py-2.5">Unauthorized — invalid or expired token</td></tr>
                  <tr><td className="px-4 py-2.5 font-mono font-bold text-red-600">500</td><td className="px-4 py-2.5">Server Error — something went wrong on our end</td></tr>
                </tbody>
              </table>
            </div>

            <CodeBlock
              title="Error response format"
              code={`{
  "error": "Missing authorization header"
}`}
            />

            <h3 className="text-lg font-bold text-gray-900 mt-8 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Idempotency</h3>
            <p className="text-gray-600 text-sm">
              Pass an <code className="text-[#1aa478] bg-[#1aa478]/5 px-1 py-0.5 rounded text-xs">idempotencyKey</code> with payment requests to safely retry without creating duplicate charges. Keys expire after 24 hours.
            </p>
          </section>

          {/* RATE LIMITS */}
          <section id="rate-limits" data-docs-section className="mb-20">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Rate Limits</h2>
            <p className="text-gray-500 mb-6 text-sm">To protect the platform, API requests are rate limited per merchant.</p>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Endpoint Type</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Limit</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100"><td className="px-4 py-2.5">Payment Processing</td><td className="px-4 py-2.5">100 requests/minute</td></tr>
                  <tr className="border-b border-gray-100"><td className="px-4 py-2.5">Read Operations</td><td className="px-4 py-2.5">300 requests/minute</td></tr>
                  <tr><td className="px-4 py-2.5">Webhook Endpoints</td><td className="px-4 py-2.5">No rate limit (inbound)</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer CTA */}
          <div className="border-t border-gray-200 pt-12 text-center">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>Ready to integrate?</h2>
            <p className="text-gray-500 mb-6 text-sm">Create your merchant account and start accepting payments in minutes.</p>
            <Link to="/auth">
              <Button size="lg" className="bg-[#1aa478] hover:bg-[#158f68] text-white rounded-full px-8">
                Get Started Free
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
