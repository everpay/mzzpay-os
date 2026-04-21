import { MarketingPage } from "@/components/front/MarketingPage";
import { CreditCard, Globe, Smartphone, Zap, ShieldCheck, RefreshCw } from "lucide-react";

export default function OnlinePayments() {
  return (
    <MarketingPage
      eyebrow="Online Payments"
      title={<>Accept payments <span style={{ color: "hsl(172 72% 48%)" }}>anywhere on Earth</span></>}
      subtitle="One integration. Every card scheme, wallet, and local payment method. Optimized for the highest approval rates in the industry."
      featuresHeading="A complete online payments suite"
      stats={[
        { value: "99.4%", label: "Avg. authorization rate" },
        { value: "200ms", label: "Median latency" },
        { value: "60+", label: "Payment methods" },
        { value: "135+", label: "Currencies" },
      ]}
      features={[
        { icon: CreditCard, title: "Cards & wallets", description: "Visa, Mastercard, Amex, Discover, JCB, UnionPay — plus Apple/Google Pay and PayPal." },
        { icon: Globe, title: "Local methods", description: "iDEAL, Bancontact, Klarna, Alipay, WeChat Pay, Pix, OXXO, and 50+ more." },
        { icon: Smartphone, title: "Mobile-optimized", description: "Hosted and embedded forms tested across thousands of devices and browsers." },
        { icon: Zap, title: "Instant settlement", description: "T+0 settlement options for qualified merchants in supported markets." },
        { icon: ShieldCheck, title: "Tokenization", description: "PCI Level 1 vault keeps cards secure and reduces your compliance scope." },
        { icon: RefreshCw, title: "Recurring & one-off", description: "Single-use payments, subscriptions, and saved-card flows from one API." },
      ]}
      useCases={[
        { title: "Hosted checkout", description: "Drop-in page hosted by us, branded by you.", bullets: ["No PCI scope", "Auto-localized", "Mobile-ready"] },
        { title: "Embedded forms", description: "Beautiful card fields you control, secured by our vault.", bullets: ["JS SDK", "React components", "iOS & Android"] },
        { title: "Server-to-server", description: "Direct API integration for full control.", bullets: ["REST + webhooks", "Idempotency", "Sandbox parity"] },
      ]}
      finalCtaTitle="Start accepting payments today"
    />
  );
}
