import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Book, MessageSquare, Mail, Phone, LifeBuoy, FileText, Zap, ShieldCheck, CreditCard } from "lucide-react";

const PRIMARY = "hsl(172 72% 48%)";

const topics = [
  { icon: Zap, title: "Getting started", description: "Account setup, onboarding, first payment.", to: "/developers/quick-start" },
  { icon: CreditCard, title: "Accepting payments", description: "Cards, wallets, local methods, and 3DS.", to: "/developers/api/payments" },
  { icon: ShieldCheck, title: "Security & compliance", description: "PCI scope, KYB, and verification.", to: "/security" },
  { icon: FileText, title: "Invoicing", description: "Send, track, and reconcile invoices.", to: "/developers/api/invoices" },
  { icon: Book, title: "API reference", description: "Endpoints, SDKs, and code examples.", to: "/developers" },
  { icon: LifeBuoy, title: "Disputes & chargebacks", description: "Defend, win, and prevent disputes.", to: "/developers" },
];

const faqs = [
  { q: "How long does onboarding take?", a: "Most merchants are live in under 24 hours. Enterprise plans complete KYB in 3-5 business days." },
  { q: "What are your processing fees?", a: "Fees start at 2.4% + $0.10 per transaction. Volume discounts apply at $100K/month. See pricing for full details." },
  { q: "Do you support recurring billing?", a: "Yes — full subscription, proration, dunning, and metered billing are included on every plan." },
  { q: "Can I migrate from another processor?", a: "Yes. Our team handles vault portability and can migrate Stripe, Adyen, or Braintree with zero downtime." },
  { q: "How fast are payouts?", a: "T+2 by default in most markets. T+0 same-day payouts are available for qualified merchants." },
  { q: "Is there a sandbox environment?", a: "Yes. Every account ships with a fully-featured sandbox using test cards and simulated webhooks." },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader />
      <main className="pt-[68px]">
        {/* Hero */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
          <div className="container mx-auto px-6 text-center max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 font-heading"
            >
              How can we <span style={{ color: PRIMARY }}>help</span>?
            </motion.h1>
            <p className="text-lg text-white/70 mb-8 font-body">
              Search our docs, browse common topics, or talk to a human — 24/7.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="search"
                placeholder="Search articles, guides, and APIs..."
                className="h-14 rounded-full pl-14 pr-5 bg-white text-slate-900 border-0 text-base font-body"
              />
            </div>
          </div>
        </section>

        {/* Topics */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6 max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12 text-center font-heading">
              Browse by topic
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((t, i) => (
                <motion.div
                  key={t.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                >
                  <Link
                    to={t.to}
                    className="block bg-white rounded-2xl p-7 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${PRIMARY}1A` }}
                    >
                      <t.icon className="h-5 w-5" style={{ color: PRIMARY }} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-2 font-heading">{t.title}</h3>
                    <p className="text-sm text-gray-600 font-body">{t.description}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12 text-center font-heading">
              Frequently asked
            </h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <motion.div
                  key={f.q}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-200"
                >
                  <h3 className="text-base font-bold text-gray-900 mb-2 font-heading">{f.q}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-body">{f.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact channels */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6 max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12 text-center font-heading">
              Still need help?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: MessageSquare, title: "Live chat", description: "Average response time under 2 minutes.", cta: "Start chat", to: "/demo" },
                { icon: Mail, title: "Email support", description: "support@mzzpay.com — replies within 4 hours.", cta: "Send email", to: "mailto:support@mzzpay.com" },
                { icon: Phone, title: "Phone (Enterprise)", description: "Dedicated line for enterprise customers.", cta: "Talk to sales", to: "/demo" },
              ].map((c) => (
                <div key={c.title} className="bg-white rounded-2xl p-7 border border-gray-200 text-center">
                  <div
                    className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${PRIMARY}1A` }}
                  >
                    <c.icon className="h-5 w-5" style={{ color: PRIMARY }} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2 font-heading">{c.title}</h3>
                  <p className="text-sm text-gray-600 mb-5 font-body">{c.description}</p>
                  {c.to.startsWith("mailto:") ? (
                    <a href={c.to}>
                      <Button variant="outline" className="rounded-full h-10 px-6 font-bold">
                        {c.cta}
                      </Button>
                    </a>
                  ) : (
                    <Link to={c.to}>
                      <Button variant="outline" className="rounded-full h-10 px-6 font-bold">
                        {c.cta}
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <FrontFooter />
    </div>
  );
}
