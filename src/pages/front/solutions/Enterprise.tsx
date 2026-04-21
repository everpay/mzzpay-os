import { MarketingPage } from "@/components/front/MarketingPage";
import { Building2, Shield, Headphones, GitBranch, Lock, Globe } from "lucide-react";

export default function Enterprise() {
  return (
    <MarketingPage
      eyebrow="Enterprise"
      title={<>Payments at <span style={{ color: "hsl(172 72% 48%)" }}>enterprise scale</span></>}
      subtitle="Custom contracts, dedicated infrastructure, and white-glove onboarding for organizations processing $10M+ annually."
      primaryCta={{ label: "Talk to sales", to: "/demo" }}
      secondaryCta={{ label: "View pricing", to: "/pricing" }}
      featuresHeading="Built for the world's largest merchants"
      stats={[
        { value: "99.99%", label: "Contractual SLA" },
        { value: "24/7", label: "Dedicated support" },
        { value: "SOC 2", label: "Type II" },
        { value: "PCI L1", label: "Certified" },
      ]}
      features={[
        { icon: Building2, title: "Custom contracts", description: "Negotiated MDR, settlement terms, and reserve structures tailored to your business." },
        { icon: Shield, title: "Dedicated infrastructure", description: "Isolated processing capacity with guaranteed throughput and uptime." },
        { icon: Headphones, title: "Named CSM", description: "Dedicated customer success manager and 24/7 priority engineering support." },
        { icon: GitBranch, title: "Multi-acquirer routing", description: "Route by BIN, country, or amount across multiple acquirers to maximize approvals." },
        { icon: Lock, title: "SSO & RBAC", description: "SAML SSO, fine-grained role permissions, and full audit trails." },
        { icon: Globe, title: "Global treasury", description: "Hold balances in 25+ currencies and convert at interbank rates." },
      ]}
      useCases={[
        { title: "Global retail", description: "Unify payments across 50+ countries.", bullets: ["Local acquiring", "Multi-currency settlement", "Centralized reporting"] },
        { title: "Travel & hospitality", description: "Handle high-volume, high-ticket transactions with 3DS smart routing.", bullets: ["Authorization holds", "Multi-currency capture", "Refund automation"] },
        { title: "Fintech & neobanks", description: "Embed payments into your own product.", bullets: ["BIN sponsorship", "White-label issuing", "Ledgered wallets"] },
      ]}
      finalCtaTitle="Let's design your enterprise stack"
      finalCtaSubtitle="Our solutions team will build a custom proposal in 48 hours."
    />
  );
}
