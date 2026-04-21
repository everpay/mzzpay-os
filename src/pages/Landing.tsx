import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import everpayIcon from "@/assets/everpay-icon.png";
import dashboardImg from "@/assets/mzz-dashboard.jpg";
import diningImg from "@/assets/vertical-dining.jpg";
import retailImg from "@/assets/vertical-retail.jpg";
import saasImg from "@/assets/vertical-saas.jpg";
import {
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  Zap,
  Terminal,
  LayoutGrid,
  Globe,
  CheckCircle2,
  CreditCard,
  Repeat,
  ShieldCheck,
  Server,
  Facebook,
  Twitter,
  Linkedin,
  Github,
} from "lucide-react";
import { FrontFooter } from "@/components/front/FrontFooter";
import { FrontHeader } from "@/components/front/FrontHeader";

// MzzPay public brand palette (matches /index.css brand tokens)
const PRIMARY = "hsl(172 72% 48%)";        // electric teal
const PRIMARY_HOVER = "hsl(172 72% 42%)";
const INK = "hsl(220 47% 7%)";              // deep navy hero

// Header is provided by the shared <FrontHeader /> component (see /components/front/FrontHeader.tsx).

// ============= HERO =============
function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden gradient-brand-hero text-white">
      <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border"
            style={{ backgroundColor: "hsl(172 72% 48% / 0.12)", color: PRIMARY, borderColor: "hsl(172 72% 48% / 0.3)" }}
          >
            Built for Scale
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05] mb-8 text-white"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            The Global <span style={{ color: PRIMARY }}>Ledger</span> for Modern Commerce.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/65 max-w-xl mb-10 leading-relaxed"
          >
            Orchestrate complex money movement, unify international payments, and scale your financial infrastructure
            with surgical precision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/signup">
              <Button
                size="lg"
                className="rounded-full px-8 h-14 text-base font-bold gap-2 group shadow-xl"
                style={{ backgroundColor: PRIMARY, color: INK }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = PRIMARY_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = PRIMARY)}
              >
                Start Building
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent text-white border-white/25 hover:bg-white/10 hover:text-white rounded-full px-8 h-14 text-base font-bold"
              >
                View Documentation
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative bg-white/[0.04] backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-white/10 rotate-2 hover:rotate-0 transition-transform duration-500">
            <img
              src={dashboardImg}
              alt="MzzPay real-time financial dashboard"
              className="rounded-xl w-full"
              width={1024}
              height={768}
            />
            <div
              className="absolute -bottom-6 -left-6 p-4 rounded-2xl shadow-xl"
              style={{ backgroundColor: PRIMARY }}
            >
              <CreditCard className="h-8 w-8" style={{ color: INK }} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============= PARTNERS =============
function PartnersSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const paymentMethods = [
    { name: "Visa", image: "/logos/visa.svg" },
    { name: "Mastercard", image: "/logos/mastercard.svg" },
    { name: "American Express", image: "/logos/american-express.svg" },
    { name: "Discover", image: "/logos/discover.svg" },
    { name: "PayPal", image: "/logos/paypal.svg" },
    { name: "Apple Pay", image: "/logos/apple-pay.svg" },
    { name: "Google Pay", image: "/logos/google-pay.svg" },
    { name: "JCB", image: "/logos/jcb.svg" },
    { name: "UnionPay", image: "/logos/unionpay.svg" },
    { name: "Stripe", image: "/logos/stripe.jpg" },
    { name: "Square", image: "/logos/square.jpg" },
    { name: "Alipay", image: "/logos/alipay.jpg" },
    { name: "WeChat Pay", image: "/logos/wechat-pay.jpg" },
    { name: "PIX", image: "/logos/pix.jpg" },
    { name: "Mercado Pago", image: "/logos/mercado-pago.jpg" },
    { name: "PagSeguro", image: "/logos/pagseguro.jpg" },
    { name: "PayU", image: "/logos/payu.jpg" },
    { name: "Boleto", image: "/logos/boleto.jpg" },
    { name: "OXXO", image: "/logos/oxxo.jpg" },
    { name: "Klarna", image: "/logos/klarna.jpg" },
    { name: "Affirm", image: "/logos/affirm.jpg" },
    { name: "Afterpay", image: "/logos/afterpay.jpg" },
    { name: "Venmo", image: "/logos/venmo.jpg" },
    { name: "Cash App", image: "/logos/cashapp.jpg" },
    { name: "Zelle", image: "/logos/zelle.jpg" },
    { name: "Samsung Pay", image: "/logos/samsung-pay.jpg" },
    { name: "Crypto", image: "/logos/crypto.svg" },
  ];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;
    const scroll = () => {
      scrollPosition += scrollSpeed;
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      scrollContainer.scrollLeft = scrollPosition;
    };
    const intervalId = setInterval(scroll, 20);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <section className="py-16 bg-white border-y border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-8">
          Trusted Payment Methods Worldwide
        </p>
        <div
          ref={scrollRef}
          className="flex gap-12 overflow-x-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
          style={{ scrollBehavior: "auto" }}
        >
          {[...paymentMethods, ...paymentMethods].map((method, index) => (
            <div
              key={`${method.name}-${index}`}
              className="flex-shrink-0 flex items-center justify-center hover:scale-110 transition-transform duration-300"
            >
              <div className="relative w-28 h-14">
                <img
                  src={method.image}
                  alt={method.name}
                  className="absolute inset-0 w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============= INFRASTRUCTURE =============
function InfrastructureSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>
            Reliable, extensible infrastructure
          </h2>
          <p className="text-lg text-slate-500 mb-8 leading-relaxed">
            MzzPay's architecture is designed to handle every edge case of modern commerce. From unified identity
            management to real-time reconciliation across 135+ currencies.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50">
              <div className="p-2.5 rounded-lg bg-[hsl(172_72%_48%_/_0.12)]">
                <Server className="h-5 w-5" style={{ color: PRIMARY }} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Centralized Orchestration</h4>
                <p className="text-sm text-slate-500">Connect ERPs, CRMs, and custom data pipelines through one API.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50">
              <div className="p-2.5 rounded-lg bg-[hsl(172_72%_48%_/_0.12)]">
                <Repeat className="h-5 w-5" style={{ color: PRIMARY }} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Fluid Liquidity</h4>
                <p className="text-sm text-slate-500">Automate cross-border payouts with near-instant settlement.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative p-8 bg-slate-50 rounded-2xl shadow-inner border border-slate-100">
          <div className="grid grid-cols-3 gap-3 items-center">
            <div className="space-y-3">
              {["ERP System", "Subscription", "Data Lake"].map((t) => (
                <div key={t} className="p-3 bg-white shadow-sm rounded-lg text-xs font-mono border border-slate-200 text-slate-700">
                  {t}
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-2xl"
                style={{ backgroundColor: PRIMARY }}
              >
                <Server className="h-9 w-9" />
              </div>
            </div>
            <div className="space-y-3">
              {["Orchestration", "Risk Engine", "Settlement"].map((t) => (
                <div
                  key={t}
                  className="p-3 rounded-lg text-xs font-mono border"
                  style={{ backgroundColor: "hsl(172 72% 48% / 0.1)", borderColor: "hsl(172 72% 48% / 0.25)", color: PRIMARY }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============= STATS =============
function StatsSection() {
  const stats = [
    { value: "500M+", label: "API requests/day" },
    { value: "10K+", label: "API requests/second" },
    { value: "150K+", label: "transactions/minute" },
  ];
  return (
    <section className="py-20 text-white relative overflow-hidden" style={{ backgroundColor: PRIMARY }}>
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
          <path d="M0,100 C150,200 350,0 500,100 C650,200 850,0 1000,100 L1000,200 L0,200 Z" fill="white" />
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-center text-2xl font-bold mb-12 opacity-80" style={{ fontFamily: "Manrope, sans-serif" }}>
          Built for massive volume
        </h2>
        <div className="grid md:grid-cols-3 gap-12 text-center">
          {stats.map((s) => (
            <div key={s.label} className="space-y-2">
              <div className="text-5xl md:text-6xl font-black tracking-tighter">{s.value}</div>
              <div className="text-white/70 text-sm uppercase tracking-widest font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============= VERTICALS =============
function VerticalsSection() {
  const verticals = [
    { img: diningImg, title: "Fine Dining", desc: "Complex split-bills and gratuity management automated." },
    { img: retailImg, title: "High-End Retail", desc: "Omnichannel experiences that bridge digital and physical." },
    { img: saasImg, title: "SaaS Platforms", desc: "Global subscription billing with built-in churn reduction." },
  ];
  return (
    <section className="py-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-extrabold tracking-tight text-center text-slate-900 mb-16" style={{ fontFamily: "Manrope, sans-serif" }}>
          Customized for your vertical
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {verticals.map((v) => (
            <div
              key={v.title}
              className="group relative h-96 rounded-2xl overflow-hidden shadow-lg transition-transform hover:-translate-y-2 duration-300"
            >
              <img
                src={v.img}
                alt={v.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
              <div className="absolute bottom-0 p-7">
                <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
                  {v.title}
                </h3>
                <p className="text-white/80 text-sm">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============= INTEGRATION PATHS =============
function IntegrationPathsSection() {
  const paths = [
    { icon: Zap, title: "No-code", desc: "Launch in hours using our pre-built checkout pages and dashboard management tools.", cta: "Explore No-code" },
    { icon: LayoutGrid, title: "Pre-integrated", desc: "Connect MzzPay directly to your existing tech stack: Shopify, NetSuite, or SAP.", cta: "View Ecosystem" },
    { icon: Terminal, title: "API-First", desc: "Full programmatic control. Build custom financial flows with our robust SDKs.", cta: "Read Docs" },
  ];
  return (
    <section id="developers" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
            Choose your integration path
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            Whether you're a lean startup or a global enterprise, we have the right entry point for your team.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {paths.map((p) => (
            <div
              key={p.title}
              className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-blue-100 transition-all border border-slate-100 hover:border-blue-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[hsl(172_72%_48%_/_0.1)] flex items-center justify-center mb-6">
                <p.icon className="h-6 w-6" style={{ color: PRIMARY }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
                {p.title}
              </h3>
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">{p.desc}</p>
              <a href="#" className="inline-flex items-center gap-2 font-bold text-sm group-hover:translate-x-1 transition-transform" style={{ color: PRIMARY }}>
                {p.cta} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============= BENTO GRID =============
function BentoSection() {
  return (
    <section id="solutions" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-4">
        {/* Globe payments — wide */}
        <div className="md:col-span-2 bg-slate-50 p-10 rounded-2xl flex flex-col justify-between min-h-[340px] group overflow-hidden">
          <div>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
              Accept and optimize payments globally
            </h3>
            <p className="text-slate-500 max-w-md">
              Increase conversion with 100+ local payment methods and smart routing.
            </p>
          </div>
          <div className="flex justify-end mt-6">
            <Globe className="h-32 w-32 text-white/15 group-hover:scale-110 group-hover:text-[hsl(172_72%_70%)] transition-all duration-500" />
          </div>
        </div>

        {/* Billing — small primary */}
        <div className="text-white p-10 rounded-2xl flex flex-col justify-between min-h-[340px]" style={{ backgroundColor: PRIMARY }}>
          <CreditCard className="h-12 w-12" />
          <div>
            <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
              Enable any billing model
            </h3>
            <p className="text-white/70">From monthly subs to usage-based fees.</p>
          </div>
        </div>

        {/* Agentic Commerce — small */}
        <div className="bg-slate-100 p-10 rounded-2xl flex flex-col justify-between min-h-[280px]">
          <div>
            <h3 className="text-2xl font-bold mb-2 text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
              Monetize Agentic Commerce
            </h3>
            <p className="text-slate-500">Embedded payments for AI agents and autonomous platforms.</p>
          </div>
          <div className="flex gap-2 mt-6">
            <div className="w-10 h-10 rounded-full" style={{ backgroundColor: "hsl(172 72% 48% / 0.25)" }} />
            <div className="w-10 h-10 rounded-full" style={{ backgroundColor: "hsl(172 72% 48% / 0.5)" }} />
            <div className="w-10 h-10 rounded-full" style={{ backgroundColor: "hsl(172 72% 48% / 0.75)" }} />
          </div>
        </div>

        {/* Borderless — wide dark */}
        <div className="md:col-span-2 bg-slate-900 text-white p-10 rounded-2xl relative overflow-hidden min-h-[280px]">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <h3 className="text-3xl font-bold mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>
              Access borderless money movement
            </h3>
            <p className="text-white/60 max-w-sm mb-6">
              Move funds instantly across markets without the traditional 3-day wait.
            </p>
            <Button variant="outline" size="default" className="w-fit border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Learn more
            </Button>
          </div>
          <Globe className="absolute -right-10 -bottom-10 h-72 w-72 text-white/10" />
        </div>
      </div>
    </section>
  );
}

// ============= PARTNERS SEGMENT (ISO/ISV) =============
function SegmentsSection() {
  return (
    <section id="partners" className="py-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-extrabold tracking-tight text-center text-slate-900 mb-16" style={{ fontFamily: "Manrope, sans-serif" }}>
          Delivering Payments Support You Need
        </h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3 text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIMARY }} />
              Independent Sales Organizations
            </h3>
            <p className="text-slate-500 leading-relaxed">
              Scale your merchant portfolio with industry-leading residuals and high-conversion payment tech that
              merchants actually want.
            </p>
          </div>
          <div className="bg-white p-10 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3 text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(172 72% 48% / 0.5)" }} />
              Software Vendors (ISVs)
            </h3>
            <p className="text-slate-500 leading-relaxed">
              Embed payments directly into your platform and turn a cost center into a major revenue driver with
              white-labeled solutions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============= DEVELOPER CODE =============
function DeveloperSection() {
  return (
    <section className="py-24 text-white" style={{ backgroundColor: "hsl(220 47% 7%)" }}>
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-[hsl(172_72%_70%)] font-bold tracking-widest text-xs uppercase mb-4 block">Developer First</span>
          <h2 className="text-4xl font-extrabold mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>
            Built for those who build the future.
          </h2>
          <p className="text-white/70 text-lg mb-8 leading-relaxed">
            Clear documentation, SDKs for every language, and a robust sandbox environment to test your most complex
            flows.
          </p>
          <ul className="space-y-3">
            {["GraphQL & REST APIs", "Real-time Webhook Events", "Certified PCI-DSS Level 1"].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[hsl(172_72%_70%)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-slate-950 rounded-2xl p-6 shadow-2xl border border-white/10 font-mono text-sm leading-relaxed overflow-hidden">
          <div className="flex gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <pre className="text-[hsl(172_72%_70%)] overflow-x-auto">
            <code>{`const payment = await mzzpay.payments.create({
  amount: 25000,
  currency: 'usd',
  payment_method_types: ['card', 'ach'],
  metadata: { order_id: 'AZ-99' }
});

// Handle the response
if (payment.status === 'succeeded') {
  console.log('Precision achieved.');
}`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

// ============= FAQ =============
function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [
    {
      q: "How does MzzPay handle cross-border reconciliation?",
      a: "Our proprietary ledger system syncs in real-time across 135+ currencies, automatically calculating FX spread and fees at the moment of capture.",
    },
    {
      q: "What is the typical integration timeline?",
      a: "Using our standard SDKs, most teams go from sandbox to production in under 48 hours. Enterprise migrations typically take 2-4 weeks.",
    },
    {
      q: "Does MzzPay support multi-vendor split payments?",
      a: "Yes. You can split a single charge across many connected accounts with per-leg fees, holds, and rolling reserves.",
    },
  ];
  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-extrabold tracking-tight text-center text-slate-900 mb-12" style={{ fontFamily: "Manrope, sans-serif" }}>
          Frequently Asked
        </h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
              >
                <span className="font-bold text-slate-900">{f.q}</span>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-slate-500 text-sm leading-relaxed">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============= FINAL CTA =============
function FinalCTASection() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ backgroundColor: PRIMARY }}>
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
        <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-10 tracking-tighter" style={{ fontFamily: "Manrope, sans-serif" }}>
          Ready to orchestrate your growth?
        </h2>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <Link to="/signup">
            <Button
              size="lg"
              className="bg-white hover:bg-[hsl(172_72%_48%_/_0.1)] rounded-full px-10 h-14 text-lg font-bold shadow-xl"
              style={{ color: PRIMARY }}
            >
              Create Free Account
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="bg-transparent text-white border-2 border-white/30 hover:bg-white/10 rounded-full px-10 h-14 text-lg font-bold"
          >
            Contact Our Experts
          </Button>
        </div>
      </div>
    </section>
  );
}

// ============= SITE FOOTER (kept from previous design) =============
function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 relative">
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          <div className="hidden lg:block"></div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Solutions</h3>
            <ul className="space-y-3">
              {["Retail", "Restaurant", "E-commerce", "Mobile Payments", "SaaS & Platforms", "Marketplaces", "Enterprise"].map((item) => (
                <li key={item}>
                  <span className="text-sm text-gray-600 hover:text-[hsl(172 72% 48%)] transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Products</h3>
            <ul className="space-y-3">
              {["Online Payments", "Payment Gateway", "POS & Kiosks", "Omni-Commerce", "Payment Methods", "Fraud Prevention", "Funding"].map((item) => (
                <li key={item}>
                  <span className="text-sm text-gray-600 hover:text-[hsl(172 72% 48%)] transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              {["Blog", "API Documentation", "Request Demo", "Help & Support", "Plans & Pricing"].map((item) => (
                <li key={item}>
                  <span className="text-sm text-gray-600 hover:text-[hsl(172 72% 48%)] transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-3">
              {["About Us", "Careers", "Contact Us", "Partners"].map((item) => (
                <li key={item}>
                  <span className="text-sm text-gray-600 hover:text-[hsl(172 72% 48%)] transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Stay Updated</h3>
            <p className="text-sm text-gray-600 mb-4">Subscribe to our newsletter for the latest updates.</p>
            <form className="space-y-2">
              <Input type="email" placeholder="Enter your email" className="rounded-full" />
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full">Subscribe</Button>
            </form>
            <div className="flex items-center gap-4 mt-4">
              <Facebook className="w-5 h-5 text-gray-400 hover:text-[hsl(172 72% 48%)] cursor-pointer transition-colors" />
              <Twitter className="w-5 h-5 text-gray-400 hover:text-[hsl(172 72% 48%)] cursor-pointer transition-colors" />
              <Linkedin className="w-5 h-5 text-gray-400 hover:text-[hsl(172 72% 48%)] cursor-pointer transition-colors" />
              <Github className="w-5 h-5 text-gray-400 hover:text-[hsl(172 72% 48%)] cursor-pointer transition-colors" />
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center mb-6">
            © {new Date().getFullYear()} MzzPay Technologies Inc. All rights reserved.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
            {["Privacy Policy", "Terms of Service", "Cookie Policy", "Security & Trust", "System Status"].map((item) => (
              <span key={item} className="text-sm text-gray-500 hover:text-[hsl(172 72% 48%)] transition-colors cursor-pointer text-center">
                {item}
              </span>
            ))}
          </div>
          <div className="pt-6">
            <p className="text-xs text-gray-500 leading-relaxed">
              MzzPay is a financial technology company, not a bank. Banking services are provided by licensed Banking As
              A Service providers, partner institutions and are FDIC-insured up to applicable limits.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              MzzPay is PCI DSS Level 1 certified, the highest level of security certification in the payments industry.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============= LANDING =============
export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader />
      <main>
        <HeroSection />
        <PartnersSection />
        <InfrastructureSection />
        <StatsSection />
        <VerticalsSection />
        <IntegrationPathsSection />
        <BentoSection />
        <SegmentsSection />
        <DeveloperSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <FrontFooter />
    </div>
  );
}
