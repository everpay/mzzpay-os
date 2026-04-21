import { Link } from "react-router-dom";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";

const PRIMARY = "hsl(172 72% 48%)";

const sections = [
  {
    title: "1. Acceptance of Agreement",
    body: "By accessing or using the MzzPay website, dashboard, APIs, or any of our payment services (the \"Services\"), you agree to be bound by these Terms & Conditions. If you do not agree, do not use the Services. You must be of legal age to form a binding contract in your jurisdiction.",
  },
  {
    title: "2. The MzzPay Platform",
    body: "MzzPay provides a payment orchestration platform that lets merchants accept, route, settle, and reconcile payments across multiple processors and rails. We are a financial technology company, not a bank — banking and card-network services are provided by licensed partner institutions.",
  },
  {
    title: "3. Merchant Accounts & Onboarding",
    body: "To use the Services as a merchant, you must complete our onboarding flow and provide accurate business, identity, and beneficial-ownership information (KYC/KYB). We may suspend or terminate accounts that fail verification, breach our Acceptable Use Policy, or expose us to fraud, chargeback, or regulatory risk.",
  },
  {
    title: "4. Acceptable Use",
    body: "You agree not to use the Services for prohibited businesses or activities (including but not limited to: unlawful goods, sanctioned counterparties, multi-level marketing scams, adult content outside permitted categories, or unlicensed financial services). You will not attempt to reverse-engineer, overload, or circumvent the security of the platform.",
  },
  {
    title: "5. Fees & Settlement",
    body: "Processing fees, platform markup, FX conversion, and reserve terms are disclosed in your Pricing schedule and dashboard. Settlement timing depends on rail, region, and risk profile. Rolling reserves and chargeback liability remain your responsibility per the published policy.",
  },
  {
    title: "6. Refunds, Disputes & Chargebacks",
    body: "Merchants are responsible for honoring legitimate refund requests and managing chargebacks within network deadlines. MzzPay's Dispute Defense tools assist with evidence submission, but final decisions rest with the issuing bank and card network.",
  },
  {
    title: "7. Intellectual Property",
    body: "MzzPay, its logos, software, documentation, and APIs are owned by MzzPay Technologies Inc. We grant you a limited, revocable, non-transferable license to use the Services in accordance with these Terms. You retain ownership of your data and content.",
  },
  {
    title: "8. Confidentiality & Data",
    body: "We process personal and transaction data per our Privacy Policy. Cardholder data is handled in compliance with PCI DSS Level 1 and tokenized via our vaulting partners. You must safeguard your API keys and credentials.",
  },
  {
    title: "9. Disclaimers & Limitation of Liability",
    body: "The Services are provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, MzzPay's aggregate liability for any claim arising out of these Terms is limited to the fees paid by you to MzzPay in the three months preceding the claim.",
  },
  {
    title: "10. Termination",
    body: "Either party may terminate the agreement with notice. We may suspend or terminate immediately for breach, fraud, regulatory order, or excessive risk. Outstanding obligations (fees, reserves, chargeback liability) survive termination.",
  },
  {
    title: "11. Governing Law & Disputes",
    body: "These Terms are governed by the laws of the State of Delaware, USA. Disputes are resolved by binding arbitration on an individual basis; class actions are waived to the extent permitted by law.",
  },
  {
    title: "12. Changes to These Terms",
    body: "We may update these Terms from time to time. Material changes will be communicated in-app and the \"last updated\" date above will be revised. Continued use of the Services after changes take effect constitutes acceptance.",
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader transparentUntilScroll={false} />
      <main className="pt-[68px] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-sm font-semibold mb-4 font-body" style={{ color: PRIMARY }}>Legal Information</p>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-heading">Terms & Conditions</h1>
            <p className="text-gray-500 text-sm font-body">Last updated: April 2026</p>
            <div className="flex flex-wrap gap-4 mt-6 font-body">
              <Link to="/privacy-policy" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Privacy Policy</Link>
              <Link to="/cookie-policy" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Cookie Policy</Link>
              <Link to="/security" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Security</Link>
            </div>
          </div>

          <div className="max-w-3xl mx-auto space-y-10 font-body">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 font-heading">{s.title}</h2>
                <p className="text-base text-gray-600 leading-relaxed">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <FrontFooter />
    </div>
  );
}
