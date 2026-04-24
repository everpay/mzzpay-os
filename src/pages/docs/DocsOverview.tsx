import { Link } from "react-router-dom";
import { ArrowRight, Code2, Zap, Shield, Globe2, BookOpen, Webhook } from "lucide-react";

const PRIMARY = "hsl(172 72% 48%)";

const quickLinks = [
  {
    title: "Quick start",
    description: "Get from zero to your first successful payment in under 10 minutes.",
    to: "/developers/quick-start",
    icon: Zap,
  },
  {
    title: "API reference",
    description: "Explore every endpoint, parameter and response with live examples.",
    to: "/developers/api/payments",
    icon: Code2,
  },
  {
    title: "Authentication",
    description: "Learn how to sign requests and rotate keys safely.",
    to: "/developers/api/authentication",
    icon: Shield,
  },
  {
    title: "Webhooks",
    description: "React to events in real time with verified payload signatures.",
    to: "/developers/webhooks",
    icon: Webhook,
  },
  {
    title: "SDKs & libraries",
    description: "Official SDKs for Node, Python, PHP, Ruby, Go and more.",
    to: "/developers/sdks",
    icon: BookOpen,
  },
  {
    title: "EU/International (Gaming)",
    description: "Specialised processing for gaming, casinos & lottery — non-US.",
    to: "/developers/api/payments",
    icon: Globe2,
  },
];

export default function DocsOverview() {
  return (
    <div className="max-w-5xl space-y-16">
      {/* Recurly-style intro */}
      <section className="space-y-6">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
          style={{ backgroundColor: "hsl(172 72% 48% / 0.12)", color: "hsl(172 72% 38%)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} />
          Developers
        </div>
        <h1 className="text-[3rem] md:text-[3.75rem] font-heading font-semibold tracking-tight leading-[1.05]">
          Build the future of payments with MzzPay.
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
          A unified, resilient API for cards, wallets, open banking and gaming rails. Deploy in
          minutes, scale to millions, and route every transaction intelligently across our global
          provider network.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            to="/developers/quick-start"
            className="inline-flex items-center gap-2 px-6 py-3 text-white text-sm font-semibold rounded-full hover:opacity-90 transition-opacity shadow-md"
            style={{ backgroundColor: PRIMARY }}
          >
            Get started
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/developers/api/payments"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-full border-2 border-border hover:bg-muted transition-colors"
          >
            Explore the API
          </Link>
        </div>
      </section>

      {/* Quick-link cards (Recurly-style grid) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quickLinks.map((q) => (
          <Link
            key={q.title}
            to={q.to}
            className="group relative p-6 rounded-2xl border border-border bg-card hover:border-[hsl(172_72%_48%_/_0.5)] hover:shadow-soft transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "hsl(172 72% 48% / 0.12)", color: "hsl(172 72% 38%)" }}
            >
              <q.icon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-1.5 text-foreground">{q.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{q.description}</p>
            <ArrowRight className="absolute top-6 right-6 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </section>

      {/* Code preview */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border rounded-2xl overflow-hidden">
        <div className="p-8 space-y-4">
          <h2 className="text-2xl font-heading font-semibold tracking-tight">Your first charge</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Send your first transaction with a single curl call. Every request is idempotent,
            instrumented, and routed through our intelligent provider switch.
          </p>
          <Link
            to="/developers/quick-start"
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: "hsl(172 72% 38%)" }}
          >
            Read the quick-start guide
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="bg-muted/40 p-6 border-l border-border font-mono text-xs leading-relaxed text-foreground overflow-x-auto">
          <pre>{`$ curl https://api.mzzpay.io/v1/payments \\
  -H "Authorization: Bearer sk_test_..." \\
  -d amount=5000 \\
  -d currency=usd

{
  "id": "pay_1abc2def",
  "object": "payment",
  "amount": 5000,
  "currency": "usd",
  "status": "succeeded"
}`}</pre>
        </div>
      </section>

      {/* Base URL reminder */}
      <section className="border border-border rounded-2xl p-6 bg-card">
        <h4 className="text-sm font-semibold mb-2">Base URL</h4>
        <code className="inline-block bg-muted px-3 py-1.5 rounded text-sm font-mono">
          https://api.mzzpay.io/v1
        </code>
        <p className="text-sm text-muted-foreground mt-3">
          All API requests require a Bearer token in the{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
            Authorization
          </code>{" "}
          header.
        </p>
      </section>
    </div>
  );
}
