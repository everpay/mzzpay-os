import { MarketingPage } from "@/components/front/MarketingPage";
import { Repeat, Users, Code2, BarChart3, CreditCard, Layers } from "lucide-react";

export default function Saas() {
  return (
    <MarketingPage
      eyebrow="SaaS & Platforms"
      title={<>Recurring revenue, <span style={{ color: "hsl(172 72% 48%)" }}>made effortless</span></>}
      subtitle="Subscriptions, usage-based billing, dunning, and proration — every primitive your finance team needs, with developer-grade APIs."
      featuresHeading="The billing engine for modern software"
      featuresSubheading="Stop building billing in-house. Ship features, not invoice logic."
      stats={[
        { value: "97%", label: "Recovery rate" },
        { value: "30%", label: "Less churn" },
        { value: "5min", label: "First subscription" },
        { value: "100%", label: "API coverage" },
      ]}
      features={[
        { icon: Repeat, title: "Recurring billing", description: "Monthly, annual, multi-tier, and metered plans with automatic proration." },
        { icon: Users, title: "Customer portal", description: "Self-serve plan changes, payment updates, and invoice history out of the box." },
        { icon: BarChart3, title: "Revenue analytics", description: "MRR, ARR, churn, LTV, and cohort retention dashboards updated in real time." },
        { icon: CreditCard, title: "Smart retries", description: "Recover failed payments with machine-learned retry windows and dunning flows." },
        { icon: Code2, title: "Developer-first", description: "REST + webhooks + SDKs in 6 languages. Fixtures and replay built in." },
        { icon: Layers, title: "Usage-based billing", description: "Meter API calls, seats, or any custom event and bill accurately every cycle." },
      ]}
      useCases={[
        { title: "B2B SaaS", description: "Sell seat-based, tiered, or hybrid plans without writing billing code.", bullets: ["Self-serve & sales-led", "Custom contracts", "Quote-to-cash"] },
        { title: "Developer platforms", description: "Meter usage, set quotas, and bill on consumption.", bullets: ["Real-time metering", "Quota alerts", "Stripe-grade APIs"] },
        { title: "Vertical SaaS", description: "Embed payments and billing directly into your product.", bullets: ["White-label portal", "Connected accounts", "Revenue share"] },
      ]}
      testimonial={{
        quote: "We replaced three vendors with MzzPay. Our finance close went from 14 days to 3.",
        author: "James Whitaker",
        role: "CFO, Northwind Cloud",
      }}
      finalCtaTitle="Bill smarter, not harder"
    />
  );
}
