import { MarketingPage } from "@/components/front/MarketingPage";
import { ShoppingCart, CreditCard, Globe, Zap, ShieldCheck, BarChart3 } from "lucide-react";

export default function Ecommerce() {
  return (
    <MarketingPage
      eyebrow="E-commerce"
      title={<>Sell more online with <span style={{ color: "hsl(172 72% 48%)" }}>frictionless checkout</span></>}
      subtitle="Boost conversion with a fast, localized checkout that supports every major payment method, currency, and device."
      featuresHeading="Built to convert shoppers"
      featuresSubheading="Everything an online store needs to accept, manage, and grow revenue across borders."
      stats={[
        { value: "+18%", label: "Avg. checkout lift" },
        { value: "135+", label: "Currencies" },
        { value: "60+", label: "Payment methods" },
        { value: "<1s", label: "Hosted checkout load" },
      ]}
      features={[
        { icon: ShoppingCart, title: "One-click checkout", description: "Saved card and wallet flows that turn first-time buyers into repeat customers." },
        { icon: Globe, title: "Localized everywhere", description: "Auto-translated UI, local currencies, and region-aware payment methods." },
        { icon: CreditCard, title: "All major wallets", description: "Apple Pay, Google Pay, PayPal, Klarna, iDEAL, Bancontact, and more out of the box." },
        { icon: Zap, title: "Plug-and-play plugins", description: "Native modules for Shopify, WooCommerce, Magento, and BigCommerce." },
        { icon: ShieldCheck, title: "Adaptive 3DS", description: "Smart 3D Secure that triggers only when needed to keep approvals high." },
        { icon: BarChart3, title: "Conversion analytics", description: "Funnel analysis from cart to confirmation, broken down by method and country." },
      ]}
      useCases={[
        { title: "DTC brands", description: "Launch globally without rebuilding your stack.", bullets: ["Multi-currency pricing", "Localized payment methods", "Subscription support"] },
        { title: "Fashion & retail", description: "Reduce cart abandonment with the fastest checkout in the industry.", bullets: ["Saved cards", "Apple/Google Pay", "Buy now, pay later"] },
        { title: "Digital goods", description: "Instant delivery flows with revenue recognition built in.", bullets: ["License key delivery", "Tax automation", "Refund workflows"] },
      ]}
      testimonial={{
        quote: "Switching to MzzPay lifted our checkout conversion by 22% in the first month — without changing anything else.",
        author: "Maria Costa",
        role: "Head of Growth, Lumen Apparel",
      }}
      finalCtaTitle="Start selling more today"
      finalCtaSubtitle="Get a sandbox in minutes and launch in production within a week."
    />
  );
}
