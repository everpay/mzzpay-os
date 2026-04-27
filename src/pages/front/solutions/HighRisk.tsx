import { MarketingPage } from "@/components/front/MarketingPage";
import {
  ShieldAlert,
  Gauge,
  Layers,
  GitBranch,
  ScrollText,
  Banknote,
  Globe2,
  Lock,
} from "lucide-react";

export default function HighRisk() {
  return (
    <MarketingPage
      eyebrow="High-Risk Solutions"
      title={
        <>
          Built for the verticals other processors{" "}
          <span style={{ color: "hsl(172 72% 48%)" }}>turn away</span>
        </>
      }
      subtitle="Gaming, nutra, dating, crypto on-ramps, sweepstakes, CBD, travel and adult — multi-acquirer routing, smart cascades, and chargeback armor designed for real-world MCC restrictions."
      featuresHeading="Engineered for hard-to-place merchants"
      stats={[
        { value: "12+", label: "High-risk acquirers" },
        { value: "92%", label: "Avg. approval rate" },
        { value: "0.6%", label: "Target chargeback ratio" },
        { value: "180d", label: "Rolling reserve window" },
      ]}
      features={[
        {
          icon: GitBranch,
          title: "Multi-acquirer cascading",
          description:
            "Auto-retry declined transactions across redundant MIDs by BIN, currency and issuer — keep approval rates high even on restricted MCCs.",
        },
        {
          icon: Gauge,
          title: "Velocity & risk controls",
          description:
            "Card, IP, email and device velocity caps, plus configurable per-MID amount limits and 10% rolling reserves out of the box.",
        },
        {
          icon: Layers,
          title: "Dedicated MID strategy",
          description:
            "Spread volume across descriptors and acquirers to stay under VAMP/VDMP thresholds and avoid single-MID concentration risk.",
        },
        {
          icon: ShieldAlert,
          title: "Chargeflow + Ethoca alerts",
          description:
            "Pre-chargeback alerts auto-refund disputed orders and submit compelling evidence packets for the rest.",
        },
        {
          icon: ScrollText,
          title: "KYB & compliance ready",
          description:
            "AML/KYC document collection, sanctions screening and PEP checks tailored to high-risk underwriting requirements.",
        },
        {
          icon: Banknote,
          title: "Crypto + fiat payouts",
          description:
            "Daily, weekly or on-demand payouts in USD/EUR/GBP/CAD, plus USDT/USDC settlement to merchant wallets.",
        },
        {
          icon: Globe2,
          title: "Global processing",
          description:
            "EU, UK, LATAM and APAC acquirers — with localized payment methods (PIX, Bizum, BLIK, iDEAL, MBWay, more).",
        },
        {
          icon: Lock,
          title: "3DS-on-demand",
          description:
            "Trigger SCA only when issuers require it, keeping conversion intact while staying compliant with PSD2/PSD3.",
        },
      ]}
      useCases={[
        {
          title: "iGaming & sportsbook",
          description: "Casinos, lotteries and sweepstakes operators worldwide.",
          bullets: [
            "Matrix Pay Solution acquirer",
            "Geo-fenced routing rules",
            "Real-time fraud scoring",
          ],
        },
        {
          title: "Nutra & supplements",
          description: "Trial offers, continuity programs, weight-loss and CBD.",
          bullets: [
            "Subscription-friendly MIDs",
            "Chargeback prevention alerts",
            "Negative-option compliance",
          ],
        },
        {
          title: "Dating & adult",
          description: "Matchmaking, cam sites, premium content and 18+ verticals.",
          bullets: [
            "Discreet billing descriptors",
            "Age-verification hooks",
            "High-velocity refund handling",
          ],
        },
        {
          title: "Crypto on-ramps",
          description: "Exchanges, OTC desks and Web3 wallet top-ups.",
          bullets: [
            "VASP-friendly underwriting",
            "Travel-rule metadata capture",
            "USDT/USDC settlement",
          ],
        },
      ]}
      finalCtaTitle="Get approved where others say no"
      finalCtaSubtitle="Talk to our high-risk underwriting team — most merchants are placed within 5 business days."
    />
  );
}
