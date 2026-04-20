import { Link } from "react-router-dom";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";

const PRIMARY = "hsl(172 72% 48%)";

const sections = [
  {
    title: "MzzPay's Commitment to Privacy",
    body: "MzzPay Technologies Inc. (\"MzzPay\", \"we\", \"us\") is committed to maintaining the accuracy, confidentiality, and security of personal information. This Privacy Policy describes the personal information we collect, how we use and share it, and the rights you have over your data.",
  },
  {
    title: "1. Information We Collect",
    body: "We collect information you provide directly (name, business details, contact info, banking and tax data needed for KYC/KYB), information generated through your use of the Services (transactions, dashboard activity, API calls, device and IP data), and information from third parties (identity verification vendors, fraud-prevention partners, payment networks).",
  },
  {
    title: "2. How We Use Personal Information",
    body: "We use personal information to operate the platform, verify identities and comply with anti-money-laundering laws, process transactions, prevent fraud, provide customer support, communicate service updates, and improve our products. We do not sell your personal information.",
  },
  {
    title: "3. Cardholder & End-Customer Data",
    body: "When acting as a service provider to merchants, MzzPay processes their end-customers' payment data on the merchant's behalf. Cardholder data is tokenized and stored within our PCI DSS Level 1 vaulting environment; we do not retain raw PANs in our application database.",
  },
  {
    title: "4. Sharing of Information",
    body: "We share data with: payment networks and processors required to settle transactions; banking and KYC partners; service providers under data-processing agreements; regulators, law enforcement, and courts when legally required; and counterparties in the event of a corporate restructuring, subject to equivalent protections.",
  },
  {
    title: "5. International Transfers",
    body: "Personal data may be processed in jurisdictions outside your home country, including the United States, the United Kingdom, the European Union, and other regions where our partners and infrastructure operate. We rely on Standard Contractual Clauses or equivalent mechanisms where required.",
  },
  {
    title: "6. Data Security",
    body: "We employ encryption in transit and at rest, network segmentation, role-based access controls, continuous monitoring, and regular third-party audits. Despite our safeguards, no system is perfectly secure; please notify us immediately of any suspected compromise.",
  },
  {
    title: "7. Device & Behavioral Signals",
    body: "To prevent fraud, we collect device identifiers, browser characteristics, IP and geolocation data, and behavioral signals such as typing cadence and click patterns. This data is used solely for security, risk, and compliance purposes — never for advertising profiling.",
  },
  {
    title: "8. Your Privacy Rights",
    body: "Depending on your jurisdiction, you may request access, correction, portability, erasure, or restriction of your personal information, and withdraw consent for marketing communications at any time. Contact privacy@mzzpay.com to exercise these rights; we will respond within statutory timeframes.",
  },
  {
    title: "9. Retention",
    body: "We retain personal information for as long as needed to provide the Services and to comply with legal, accounting, tax, and audit obligations (typically 5–10 years for financial records). After that period we delete or anonymize the data.",
  },
  {
    title: "10. Children's Privacy",
    body: "The Services are not directed to individuals under 16. We do not knowingly collect personal information from children. If you believe we have, please contact us so we can delete it.",
  },
  {
    title: "11. Updates to This Policy",
    body: "We will update this Privacy Policy from time to time. Material changes will be communicated in-app and the \"last updated\" date above will be revised.",
  },
  {
    title: "12. Contact Us",
    body: "Questions, requests, or complaints about this Privacy Policy can be directed to privacy@mzzpay.com.",
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader />
      <main className="pt-[68px] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-sm font-semibold mb-4 font-body" style={{ color: PRIMARY }}>Legal Information</p>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-heading">Privacy Policy</h1>
            <p className="text-gray-500 text-sm font-body">Last updated: April 2026</p>
            <div className="flex flex-wrap gap-4 mt-6 font-body">
              <Link to="/terms" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Terms & Conditions</Link>
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
