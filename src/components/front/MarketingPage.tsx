import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LucideIcon, ArrowRight, Check, Quote } from "lucide-react";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";
import { Button } from "@/components/ui/button";

const PRIMARY = "hsl(172 72% 48%)";

export interface MarketingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface MarketingUseCase {
  title: string;
  description: string;
  bullets: string[];
}

export interface MarketingTestimonial {
  quote: string;
  author: string;
  role: string;
}

export interface MarketingStat {
  value: string;
  label: string;
}

export interface MarketingPageProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  primaryCta?: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  features: MarketingFeature[];
  featuresHeading?: string;
  featuresSubheading?: string;
  useCases?: MarketingUseCase[];
  useCasesHeading?: string;
  stats?: MarketingStat[];
  testimonial?: MarketingTestimonial;
  finalCtaTitle?: string;
  finalCtaSubtitle?: string;
}

export function MarketingPage({
  eyebrow,
  title,
  subtitle,
  primaryCta = { label: "Get started", to: "/signup" },
  secondaryCta = { label: "Talk to sales", to: "/demo" },
  features,
  featuresHeading = "Everything you need",
  featuresSubheading,
  useCases,
  useCasesHeading = "Built for your use case",
  stats,
  testimonial,
  finalCtaTitle = "Ready to get started?",
  finalCtaSubtitle = "Launch in minutes or talk to our team about a custom plan.",
}: MarketingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader />
      <main className="pt-[68px]">
        {/* Hero */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
          <div className="container mx-auto px-6 text-center max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6 font-body"
              style={{ backgroundColor: `${PRIMARY}1A`, color: PRIMARY }}
            >
              {eyebrow}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6 font-heading"
            >
              {title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto font-body mb-10"
            >
              {subtitle}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Link to={primaryCta.to}>
                <Button className="rounded-full h-12 px-8 text-white font-bold" style={{ backgroundColor: PRIMARY }}>
                  {primaryCta.label} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to={secondaryCta.to}>
                <Button
                  variant="outline"
                  className="rounded-full h-12 px-8 border-white/20 bg-transparent text-white hover:bg-white/10 font-bold"
                >
                  {secondaryCta.label}
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <section className="py-16 bg-white border-b border-gray-100">
            <div className="container mx-auto px-6 max-w-5xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-4xl md:text-5xl font-extrabold font-heading" style={{ color: PRIMARY }}>
                      {s.value}
                    </div>
                    <div className="text-sm text-gray-600 mt-2 font-body">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 font-heading"
              >
                {featuresHeading}
              </motion.h2>
              {featuresSubheading && (
                <p className="text-gray-600 max-w-2xl mx-auto font-body">{featuresSubheading}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-7 border border-gray-200"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${PRIMARY}1A` }}
                  >
                    <f.icon className="h-5 w-5" style={{ color: PRIMARY }} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2 font-heading">{f.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-body">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        {useCases && useCases.length > 0 && (
          <section className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-6 max-w-6xl">
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12 text-center font-heading"
              >
                {useCasesHeading}
              </motion.h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {useCases.map((u, i) => (
                  <motion.div
                    key={u.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="rounded-2xl p-7 border border-gray-200 bg-gradient-to-br from-white to-gray-50"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-2 font-heading">{u.title}</h3>
                    <p className="text-sm text-gray-600 mb-5 font-body">{u.description}</p>
                    <ul className="space-y-2">
                      {u.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-gray-700 font-body">
                          <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: PRIMARY }} />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Testimonial */}
        {testimonial && (
          <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-6 max-w-3xl text-center">
              <Quote className="h-10 w-10 mx-auto mb-6" style={{ color: PRIMARY }} />
              <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug font-heading mb-8">
                "{testimonial.quote}"
              </p>
              <div className="font-body">
                <div className="font-bold text-gray-900">{testimonial.author}</div>
                <div className="text-sm text-gray-600">{testimonial.role}</div>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-20 bg-slate-950">
          <div className="container mx-auto px-6 text-center max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5 font-heading">{finalCtaTitle}</h2>
            <p className="text-white/70 mb-8 font-body">{finalCtaSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={primaryCta.to}>
                <Button className="rounded-full h-12 px-8 text-white font-bold" style={{ backgroundColor: PRIMARY }}>
                  {primaryCta.label}
                </Button>
              </Link>
              <Link to={secondaryCta.to}>
                <Button
                  variant="outline"
                  className="rounded-full h-12 px-8 border-white/20 bg-transparent text-white hover:bg-white/10 font-bold"
                >
                  {secondaryCta.label}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <FrontFooter />
    </div>
  );
}
