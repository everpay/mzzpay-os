import { MarketingPage } from "@/components/front/MarketingPage";
import { ShieldCheck, Brain, Lock, AlertTriangle, Eye, Fingerprint } from "lucide-react";

export default function FraudPrevention() {
  return (
    <MarketingPage
      eyebrow="Fraud Prevention"
      title={<>Stop fraud before it <span style={{ color: "hsl(172 72% 48%)" }}>costs you</span></>}
      subtitle="Machine-learned risk scoring, adaptive 3D Secure, and chargeback defense — without sacrificing approval rates."
      featuresHeading="Fraud protection that learns"
      stats={[
        { value: "-65%", label: "Fraud rate reduction" },
        { value: "99.4%", label: "Approval rate kept" },
        { value: "<50ms", label: "Risk decision" },
        { value: "24/7", label: "ML model updates" },
      ]}
      features={[
        { icon: Brain, title: "ML risk engine", description: "Real-time scoring trained on billions of transactions across our network." },
        { icon: ShieldCheck, title: "Adaptive 3DS", description: "Only step up risky transactions — keep good customers in the fast lane." },
        { icon: Eye, title: "Velocity rules", description: "Card, IP, email, and device velocity controls with custom thresholds." },
        { icon: Fingerprint, title: "Device fingerprinting", description: "Identify returning fraudsters across sessions and merchants." },
        { icon: AlertTriangle, title: "Chargeback alerts", description: "Get notified pre-chargeback so you can refund and avoid disputes." },
        { icon: Lock, title: "Dispute defense", description: "Automated evidence submission with industry-leading win rates." },
      ]}
      useCases={[
        { title: "High-risk verticals", description: "Travel, ticketing, digital goods — we've seen it all.", bullets: ["Pattern matching", "Manual review queue", "Allow/block lists"] },
        { title: "Subscription fraud", description: "Block stolen-card signups before the first charge.", bullets: ["Free trial abuse detection", "Email reputation", "BIN intelligence"] },
        { title: "Marketplace abuse", description: "Catch collusion and stolen goods schemes.", bullets: ["Buyer/seller linking", "Geo anomalies", "Refund abuse signals"] },
      ]}
      finalCtaTitle="Protect every transaction"
    />
  );
}
