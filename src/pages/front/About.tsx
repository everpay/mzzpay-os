import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";
import { Button } from "@/components/ui/button";
import { Zap, Headphones, Lock, BarChart3, Clock, Award, Heart, Target, TrendingUp, Globe, Users } from "lucide-react";

const PRIMARY = "hsl(172 72% 48%)";

const perks = [
  { icon: Zap, title: "Intuitive Onboarding", description: "Start accepting payments in less than 10 minutes — no developer required for basic integrations." },
  { icon: Headphones, title: "24/7 Dedicated Support", description: "Real humans, real answers, real fast. Day or night, holidays included." },
  { icon: Lock, title: "Non-Custodial Approach", description: "We do not hold your funds. Your money flows directly to your settlement account." },
  { icon: BarChart3, title: "Built-In Analytics", description: "Real-time dashboards for volume, approval rates, chargebacks, and revenue trends." },
  { icon: Clock, title: "99.99% Uptime SLA", description: "Multi-region cloud infrastructure with redundant failover and 24/7 monitoring." },
  { icon: Award, title: "Rewards & Incentives", description: "Volume-based pricing tiers, referral bonuses, and early access to new products." },
];

const values = [
  { icon: Heart, title: "Customer Obsession", description: "Every decision is measured against the value delivered to merchants." },
  { icon: Target, title: "Relentless Quality", description: "We sweat the details so you don't have to." },
  { icon: TrendingUp, title: "Build for Growth", description: "Tools that scale from your first transaction to your billionth." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
          <div className="container mx-auto px-6 text-center max-w-4xl">
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6 font-heading">
              Building the payments platform <span style={{ color: PRIMARY }}>merchants deserve</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto font-body">
              MzzPay was founded to give every business — from local cafés to global SaaS — access to enterprise-grade
              payment infrastructure without the enterprise price tag.
            </motion.p>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-white border-b border-gray-100">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
              {[["$2B+", "Processed"], ["50K+", "Merchants"], ["150+", "Countries"], ["99.99%", "Uptime"]].map(([n, l]) => (
                <div key={l}>
                  <div className="text-4xl md:text-5xl font-extrabold font-heading" style={{ color: PRIMARY }}>{n}</div>
                  <div className="text-sm text-gray-600 mt-2 font-body">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why MzzPay */}
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
                className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 font-heading">
                Why merchants choose MzzPay
              </motion.h2>
              <p className="text-gray-600 max-w-2xl mx-auto font-body">A modern payment stack with the support, reliability, and transparency you'd expect from a partner — not a processor.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {perks.map((p, i) => (
                <motion.div key={p.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-7 border border-gray-200">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${PRIMARY}1A` }}>
                    <p.icon className="h-5 w-5" style={{ color: PRIMARY }} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2 font-heading">{p.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-body">{p.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-6 max-w-5xl">
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12 text-center font-heading">
              Our values
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8">
              {values.map((v, i) => (
                <motion.div key={v.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: `${PRIMARY}1A` }}>
                    <v.icon className="h-6 w-6" style={{ color: PRIMARY }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 font-heading">{v.title}</h3>
                  <p className="text-sm text-gray-600 font-body">{v.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-slate-950">
          <div className="container mx-auto px-6 text-center max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5 font-heading">Ready to grow with MzzPay?</h2>
            <p className="text-white/70 mb-8 font-body">Get started in minutes or talk to our team about a custom plan.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup">
                <Button className="rounded-full h-12 px-8 text-white font-semibold" style={{ backgroundColor: PRIMARY }}>Get started</Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" className="rounded-full h-12 px-8 border-white/20 bg-transparent text-white hover:bg-white/10 font-semibold">Request a demo</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <FrontFooter />
    </div>
  );
}
