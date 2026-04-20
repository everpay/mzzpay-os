import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, CreditCard, Shield, BarChart3, Zap, Globe } from "lucide-react";

const PRIMARY = "hsl(172 72% 48%)";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as any },
  }),
};

const paymentPricing = [
  {
    title: "Cards & wallets",
    description: "Accept Visa, Mastercard, Amex, Apple Pay, Google Pay and more.",
    rate: "2.9% + 30¢",
    detail: "per successful transaction",
    extras: [
      { label: "+0.5%", note: "for manually entered cards" },
      { label: "+1.5%", note: "for international cards" },
      { label: "+1%", note: "if currency conversion is required" },
    ],
  },
  {
    title: "Bank transfers (SEPA / ACH)",
    description: "Low-cost bank debits and credit transfers across EU & US.",
    rate: "0.8%",
    detail: "$5.00 cap per transaction",
    extras: [
      { label: "$4.00", note: "ACH credit transfers" },
      { label: "$1.00", note: "for failed ACH debits" },
    ],
  },
  {
    title: "Alternative methods",
    description: "Buy-now-pay-later, regional wallets, crypto and more.",
    rate: "From 5.99% + 30¢",
    detail: "varies by method",
    extras: [
      { label: "Klarna", note: "5.99% + 30¢" },
      { label: "PayPal", note: "3.49% + 49¢" },
    ],
  },
];

const includedFeatures = [
  { icon: Globe, title: "Global coverage", bullets: ["195+ countries", "135+ currencies", "Local acquiring in 40+ countries"] },
  { icon: Shield, title: "Fraud prevention", bullets: ["ML fraud detection", "3D Secure", "AVS & CVC verification"] },
  { icon: Zap, title: "Checkout optimization", bullets: ["Hosted checkout", "Embeddable forms", "One-click checkout"] },
  { icon: BarChart3, title: "Revenue tools", bullets: ["Real-time analytics", "Auto reconciliation", "Custom exports"] },
];

const faqs = [
  { q: "Are there setup fees or monthly minimums?", a: "No. Standard pricing has no setup fees or monthly fees. You only pay per-transaction fees." },
  { q: "How does IC+ pricing work?", a: "Interchange-plus passes through the exact interchange rate plus a fixed markup. Cost-effective for high-volume merchants." },
  { q: "Can I switch between Standard and Custom?", a: "Yes. Start on Standard and move to Custom as you grow. Contact sales for volume pricing." },
  { q: "What payment methods are included?", a: "All major cards, digital wallets, bank transfers, and BNPL options." },
  { q: "Is there a fee for refunds?", a: "No fee to issue a refund, but the original transaction fee is not returned." },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader />
      <main className="pt-[68px]">
        {/* Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative">
          <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
               style={{ background: `linear-gradient(to top, ${PRIMARY}1A, transparent)` }} />
          <div className="container mx-auto px-6 relative z-10">
            <motion.h1 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
              className="text-4xl md:text-5xl lg:text-[56px] font-extrabold text-white leading-[1.08] tracking-tight mb-5 max-w-2xl font-heading">
              Pricing built for businesses of all sizes
            </motion.h1>
            <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              className="text-lg text-white/60 max-w-xl mb-14 leading-relaxed font-body">
              Pay-as-you-go or custom packaging — no setup fees, no monthly fees, no hidden costs.
            </motion.p>

            <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}
                className="bg-white rounded-2xl p-8 md:p-10 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 font-heading">Standard</h2>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed font-body">
                  Access a complete payments platform with simple, pay-as-you-go pricing.
                </p>
                <div className="mb-8">
                  <span className="text-[40px] font-extrabold text-gray-900 tracking-tight font-heading" style={{ lineHeight: 1.1 }}>
                    2.9% + 30¢
                  </span>
                  <p className="text-sm text-gray-500 mt-1 font-body">per successful transaction for domestic cards</p>
                </div>
                <div className="mt-auto">
                  <Link to="/signup">
                    <Button className="w-full text-white rounded-full h-12 text-base font-semibold" style={{ backgroundColor: PRIMARY }}>
                      Get started <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={3} variants={fadeUp}
                className="bg-slate-800 rounded-2xl p-8 md:p-10 flex flex-col">
                <h2 className="text-2xl font-bold text-white mb-2 font-heading">Custom</h2>
                <p className="text-sm text-white/60 mb-8 leading-relaxed font-body">
                  Design a custom package for high volume or unique business models.
                </p>
                <ul className="space-y-3 mb-8 font-body">
                  {["IC+ pricing", "Volume discounts", "Multi-product discounts", "Dedicated account manager"].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PRIMARY}33` }}>
                        <Check className="h-3 w-3" style={{ color: PRIMARY }} />
                      </div>
                      <span className="text-sm text-white/80">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Link to="/demo">
                    <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 rounded-full h-12 text-base font-semibold bg-transparent">
                      Contact sales <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Per-product breakdown */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-6 max-w-5xl">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} custom={0} variants={fadeUp}
              className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 font-heading">
              Standard pricing
            </motion.h2>
            <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} custom={1} variants={fadeUp}
              className="text-gray-500 mb-12 max-w-lg font-body">
              Transparent per-transaction fees. No hidden charges.
            </motion.p>
            <div className="grid gap-5">
              {paymentPricing.map((item, idx) => (
                <motion.div key={item.title} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} custom={idx + 2} variants={fadeUp}
                  className="border border-gray-200 rounded-2xl p-6 md:p-8 transition-colors duration-300 hover:border-primary/40">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCard className="h-5 w-5" style={{ color: PRIMARY }} />
                        <h3 className="text-lg font-bold text-gray-900 font-heading">{item.title}</h3>
                      </div>
                      <p className="text-sm text-gray-500 ml-8 font-body">{item.description}</p>
                    </div>
                    <div className="md:text-right ml-8 md:ml-0">
                      <span className="text-2xl font-extrabold text-gray-900 tracking-tight font-heading">{item.rate}</span>
                      <p className="text-xs text-gray-500 mt-0.5 font-body">{item.detail}</p>
                    </div>
                  </div>
                  <div className="mt-5 ml-8 flex flex-wrap gap-3">
                    {item.extras.map((extra) => (
                      <span key={extra.label} className="inline-flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-full border border-gray-100 font-body">
                        <span className="font-semibold text-gray-900">{extra.label}</span>
                        {extra.note}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Included */}
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="container mx-auto px-6 max-w-5xl">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} custom={0} variants={fadeUp}
              className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 font-heading">
              Included with every account
            </motion.h2>
            <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} custom={1} variants={fadeUp}
              className="text-gray-500 mb-14 max-w-lg font-body">
              No additional fees for these core capabilities.
            </motion.p>
            <div className="grid sm:grid-cols-2 gap-8">
              {includedFeatures.map((f, idx) => (
                <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} custom={idx + 2} variants={fadeUp}
                  className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${PRIMARY}1A` }}>
                      <f.icon className="h-5 w-5" style={{ color: PRIMARY }} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 font-heading">{f.title}</h3>
                  </div>
                  <ul className="space-y-2.5 font-body">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 flex-shrink-0" style={{ color: PRIMARY }} />
                        <span className="text-sm text-gray-600">{b}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} custom={0} variants={fadeUp}
              className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12 font-heading">
              Frequently asked questions
            </motion.h2>
            <div className="space-y-0 divide-y divide-gray-200">
              {faqs.map((faq, idx) => (
                <motion.details key={idx} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} custom={idx + 1} variants={fadeUp}
                  className="group py-6">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <h3 className="text-base font-semibold text-gray-900 pr-4 font-heading">{faq.q}</h3>
                    <span className="text-gray-400 group-open:rotate-45 transition-transform duration-200 text-xl font-light flex-shrink-0">+</span>
                  </summary>
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed pr-8 font-body">{faq.a}</p>
                </motion.details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <FrontFooter />
    </div>
  );
}
