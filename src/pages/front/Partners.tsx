import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Globe, Building, Users, Code2, Handshake, Zap } from "lucide-react";

const PRIMARY = "hsl(172 72% 48%)";

const partnerTypes = [
  {
    title: "Technology Partners",
    description: "Integrate your platform with the MzzPay payment stack and unlock global processing for your users.",
    icon: Code2,
    benefits: ["Modern REST + Webhook APIs", "Sandbox & test cards", "Co-engineering support", "Joint go-to-market"],
  },
  {
    title: "Solution & Reseller Partners",
    description: "Refer merchants, build implementations, and earn long-term revenue share on processing volume.",
    icon: Handshake,
    benefits: ["Reseller portal", "50% revenue share", "Sales enablement kit", "Priority merchant onboarding"],
  },
  {
    title: "Strategic Alliances",
    description: "Co-create products, distribution, and verticalised solutions with the MzzPay leadership team.",
    icon: Users,
    benefits: ["Custom commercials", "Dedicated partner manager", "Co-marketing budget", "Roadmap influence"],
  },
];

const stats = [
  ["120+", "Active partners"],
  ["50K+", "Connected merchants"],
  ["$2B+", "Processed annually"],
  ["40+", "Markets covered"],
];

export default function Partners() {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader />
      <main className="pt-[68px]">
        {/* Hero */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
          <div className="container mx-auto px-6 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-block text-xs font-bold uppercase tracking-widest mb-4" style={{ color: PRIMARY }}>
                Partner Programme
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6 font-heading">
                Partner with MzzPay
              </h1>
              <p className="text-lg md:text-xl text-white/70 max-w-2xl font-body mb-10">
                Build, sell, and scale alongside the MzzPay payments platform. Join a growing ecosystem of technology
                providers, agencies, and resellers powering global commerce.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/demo">
                  <Button className="rounded-full h-12 px-8 text-white font-semibold" style={{ backgroundColor: PRIMARY }}>
                    Become a partner <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/docs">
                  <Button variant="outline" className="rounded-full h-12 px-8 border-white/20 bg-transparent text-white hover:bg-white/10 font-semibold">
                    Read the docs
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-white border-b border-gray-100">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map(([n, l]) => (
                <div key={l}>
                  <div className="text-3xl md:text-4xl font-extrabold font-heading" style={{ color: PRIMARY }}>{n}</div>
                  <div className="text-sm text-gray-600 mt-1 font-body">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Partner types */}
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 font-heading">Three ways to partner</h2>
              <p className="text-gray-600 max-w-2xl mx-auto font-body">Pick the model that fits your business — or combine them as you grow.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {partnerTypes.map((t, i) => (
                <motion.div key={t.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="bg-white rounded-2xl p-7 border border-gray-200 flex flex-col">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${PRIMARY}1A` }}>
                    <t.icon className="h-5 w-5" style={{ color: PRIMARY }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 font-heading">{t.title}</h3>
                  <p className="text-sm text-gray-600 mb-5 leading-relaxed font-body">{t.description}</p>
                  <ul className="space-y-2 mb-6 font-body flex-1">
                    {t.benefits.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: PRIMARY }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link to="/demo">
                    <Button variant="outline" className="w-full rounded-full font-semibold">Learn more</Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Why partner */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-6 max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12 text-center font-heading">Why partner with us</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Globe, title: "Global reach", description: "Acquiring & local payment methods in 40+ markets." },
                { icon: Zap, title: "Modern stack", description: "Webhook-first APIs, SDKs in 6 languages, hosted checkouts." },
                { icon: Building, title: "Enterprise-grade", description: "PCI DSS Level 1, 99.99% uptime, 24/7 support." },
              ].map((b) => (
                <div key={b.title} className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: `${PRIMARY}1A` }}>
                    <b.icon className="h-6 w-6" style={{ color: PRIMARY }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 font-heading">{b.title}</h3>
                  <p className="text-sm text-gray-600 font-body">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-slate-950">
          <div className="container mx-auto px-6 text-center max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5 font-heading">Let's build together</h2>
            <p className="text-white/70 mb-8 font-body">Tell us about your business — we'll get back within one working day.</p>
            <Link to="/demo">
              <Button className="rounded-full h-12 px-8 text-white font-semibold" style={{ backgroundColor: PRIMARY }}>Apply now</Button>
            </Link>
          </div>
        </section>
      </main>
      <FrontFooter />
    </div>
  );
}
