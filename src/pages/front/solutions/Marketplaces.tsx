import { MarketingPage } from "@/components/front/MarketingPage";
import { Network, Wallet, Split, FileCheck, ShieldCheck, Users } from "lucide-react";

export default function Marketplaces() {
  return (
    <MarketingPage
      eyebrow="Marketplaces"
      title={<>Power your <span style={{ color: "hsl(172 72% 48%)" }}>multi-sided platform</span></>}
      subtitle="Onboard sellers, split funds, and pay out globally — with KYC, compliance, and ledgering handled for you."
      featuresHeading="Marketplace infrastructure, end to end"
      stats={[
        { value: "150+", label: "Payout countries" },
        { value: "T+0", label: "Same-day payouts" },
        { value: "<24h", label: "Seller onboarding" },
        { value: "PCI L1", label: "Certified" },
      ]}
      features={[
        { icon: Network, title: "Connected accounts", description: "Onboard sellers, vendors, or providers with hosted KYC and identity flows." },
        { icon: Split, title: "Split payments", description: "Programmatically split funds across multiple parties on every transaction." },
        { icon: Wallet, title: "Global payouts", description: "Pay sellers in their local currency to bank accounts, cards, or wallets." },
        { icon: FileCheck, title: "1099/tax forms", description: "Automated tax document generation and reporting for every connected account." },
        { icon: ShieldCheck, title: "Risk & compliance", description: "AML screening, sanctions checks, and dispute management built in." },
        { icon: Users, title: "Seller dashboards", description: "Embed white-labeled dashboards so sellers can self-serve payouts and reports." },
      ]}
      useCases={[
        { title: "Service marketplaces", description: "Pay providers when jobs are completed.", bullets: ["Escrow holds", "Conditional release", "Dispute resolution"] },
        { title: "Goods marketplaces", description: "Split between platform, seller, and shipping partners.", bullets: ["Multi-party splits", "Refund handling", "Negative balance protection"] },
        { title: "Creator platforms", description: "Pay creators across borders, fast.", bullets: ["Instant payouts", "Tax forms", "Wallet balances"] },
      ]}
      finalCtaTitle="Build your marketplace, faster"
    />
  );
}
