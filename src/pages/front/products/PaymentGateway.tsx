import { MarketingPage } from "@/components/front/MarketingPage";
import { Server, GitBranch, Activity, ShieldCheck, Webhook, Code2 } from "lucide-react";

export default function PaymentGateway() {
  return (
    <MarketingPage
      eyebrow="Payment Gateway"
      title={<>The <span style={{ color: "hsl(172 72% 48%)" }}>gateway</span> built for modern teams</>}
      subtitle="Route, retry, and reconcile across multiple acquirers with a single API. Maximum uptime, maximum approvals."
      featuresHeading="A smarter way to route money"
      stats={[
        { value: "+12%", label: "Approval lift" },
        { value: "5", label: "Acquirers supported" },
        { value: "<1s", label: "Failover time" },
        { value: "100%", label: "Webhook delivery" },
      ]}
      features={[
        { icon: GitBranch, title: "Smart routing", description: "Route by BIN, country, currency, amount, or custom rules to the optimal acquirer." },
        { icon: Server, title: "Multi-acquirer failover", description: "Automatic retry on a backup acquirer when the primary returns a soft decline." },
        { icon: Activity, title: "Real-time monitoring", description: "Live dashboards for approvals, latency, and acquirer health, broken down by method." },
        { icon: Webhook, title: "Reliable webhooks", description: "Signed, retried, and replayable. Never miss an event." },
        { icon: ShieldCheck, title: "Adaptive 3DS", description: "Trigger 3D Secure only when risk demands it — keep frictionless flows fast." },
        { icon: Code2, title: "Unified API", description: "One integration for every acquirer, processor, and method. No vendor lock-in." },
      ]}
      useCases={[
        { title: "High-volume merchants", description: "Maximize approvals across acquirers.", bullets: ["Cascading retries", "BIN-based routing", "Cost optimization"] },
        { title: "Multi-region", description: "Acquire locally in every market.", bullets: ["Local acquirers", "Currency settlement", "Lower interchange"] },
        { title: "Migrating off Stripe?", description: "Drop-in compatible adapter and migration team.", bullets: ["Card vault portability", "Subscription import", "Zero downtime"] },
      ]}
      finalCtaTitle="Take control of your payment routing"
    />
  );
}
