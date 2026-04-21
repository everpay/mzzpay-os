import { MarketingPage } from "@/components/front/MarketingPage";
import { CreditCard, Wallet, Smartphone, Globe, Bitcoin, Building2 } from "lucide-react";

export default function PaymentMethods() {
  return (
    <MarketingPage
      eyebrow="Payment Methods"
      title={<>Every method your customers <span style={{ color: "hsl(172 72% 48%)" }}>actually use</span></>}
      subtitle="Cards, wallets, bank transfers, BNPL, and crypto — across 135+ currencies and 150+ countries, from one API."
      featuresHeading="60+ payment methods, one integration"
      stats={[
        { value: "60+", label: "Methods" },
        { value: "150+", label: "Countries" },
        { value: "135+", label: "Currencies" },
        { value: "1", label: "API" },
      ]}
      features={[
        { icon: CreditCard, title: "Card schemes", description: "Visa, Mastercard, Amex, Discover, JCB, UnionPay, Diners, and more." },
        { icon: Smartphone, title: "Digital wallets", description: "Apple Pay, Google Pay, Samsung Pay, PayPal, Cash App, Venmo." },
        { icon: Globe, title: "Local methods", description: "iDEAL, Bancontact, Sofort, Pix, OXXO, Klarna, Afterpay, Alipay, WeChat Pay." },
        { icon: Building2, title: "Bank transfers", description: "ACH, SEPA, Faster Payments, Open Banking, BACS, EFT." },
        { icon: Wallet, title: "Buy now, pay later", description: "Klarna, Afterpay, Affirm, Zip — instant decisions, full coverage." },
        { icon: Bitcoin, title: "Crypto", description: "BTC, ETH, USDC, USDT settlement with automatic fiat conversion." },
      ]}
      useCases={[
        { title: "Europe", description: "Capture every European shopper.", bullets: ["SEPA Direct Debit", "iDEAL & Bancontact", "Klarna & Sofort"] },
        { title: "LATAM", description: "Localize for the fastest-growing region.", bullets: ["Pix instant payments", "OXXO cash voucher", "Boleto"] },
        { title: "Asia-Pacific", description: "Reach 1B+ consumers in their preferred way.", bullets: ["Alipay & WeChat Pay", "GrabPay", "PayNow"] },
      ]}
      finalCtaTitle="Add the methods your customers want"
    />
  );
}
