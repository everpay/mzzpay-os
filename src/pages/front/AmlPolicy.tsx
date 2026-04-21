import { Link } from "react-router-dom";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";

const PRIMARY = "hsl(172 72% 48%)";

const sections = [
  {
    title: "1. Purpose & Scope",
    body: "This Anti-Money Laundering (AML) Policy sets out MzzPay's commitment to detecting, preventing, and reporting money laundering, terrorist financing, sanctions evasion, and other financial crimes. It applies to all employees, contractors, merchants, partners, and counterparties using the MzzPay platform.",
  },
  {
    title: "2. Regulatory Framework",
    body: "MzzPay complies with applicable AML and counter-terrorism financing (CTF) laws including the U.S. Bank Secrecy Act (BSA), the USA PATRIOT Act, the EU AMLD framework, the UK Money Laundering Regulations, and FATF recommendations. Our program is risk-based and proportionate to the products and geographies we serve.",
  },
  {
    title: "3. Customer Due Diligence (CDD & KYC/KYB)",
    body: "Every merchant onboarded to MzzPay undergoes Know-Your-Customer (KYC) and Know-Your-Business (KYB) verification, including identity, beneficial ownership (UBO), business registration, and source-of-funds checks. Enhanced Due Diligence (EDD) is applied to higher-risk customers, PEPs, and high-risk jurisdictions.",
  },
  {
    title: "4. Sanctions & Watchlist Screening",
    body: "All merchants, beneficial owners, recipients, and counterparties are screened in real-time and on an ongoing basis against OFAC, UN, EU, HMT, and other applicable sanctions and watchlists. Matches result in immediate transaction blocking and escalation to our Compliance team.",
  },
  {
    title: "5. Transaction Monitoring",
    body: "MzzPay operates automated, rules-based, and behavioral transaction monitoring across all payment flows. Suspicious patterns — including structuring, velocity anomalies, high-risk corridors, and chargeback abuse — trigger alerts that are reviewed by trained compliance analysts.",
  },
  {
    title: "6. Suspicious Activity Reporting",
    body: "When activity is determined to be suspicious, MzzPay files Suspicious Activity Reports (SARs) or equivalent reports with the appropriate Financial Intelligence Unit (e.g., FinCEN, NCA, FIU-NL) within statutory timeframes. Tipping-off the subject of a report is strictly prohibited.",
  },
  {
    title: "7. Prohibited Businesses & Activities",
    body: "MzzPay does not service businesses involved in unlawful activities, unlicensed financial services, illegal gambling, sanctioned counterparties, shell banks, or other categories listed in our Acceptable Use Policy. Attempts to use the platform for such purposes will result in immediate termination and reporting.",
  },
  {
    title: "8. Record Keeping",
    body: "Customer identification records, transaction data, and AML investigation files are retained for a minimum of five (5) years (or longer where required) and made available to regulators and law enforcement upon valid legal request.",
  },
  {
    title: "9. Training & Governance",
    body: "All MzzPay personnel receive AML/CTF training appropriate to their role at hire and annually thereafter. The program is overseen by a designated Money Laundering Reporting Officer (MLRO) and is independently audited at least annually.",
  },
  {
    title: "10. Cooperation with Authorities",
    body: "MzzPay cooperates fully with regulators, law enforcement, and partner financial institutions, including responding to subpoenas, 314(a)/(b) requests, production orders, and other lawful requests for information.",
  },
  {
    title: "11. Contact",
    body: "Questions about this AML Policy or to report suspected financial crime activity may be directed confidentially to our Compliance team at compliance@mzzpay.com.",
  },
];

export default function AmlPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader transparentTextTone="dark" />
      <main className="pt-[68px] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-sm font-semibold mb-4 font-body" style={{ color: PRIMARY }}>Legal Information</p>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-heading">AML Policy</h1>
            <p className="text-gray-500 text-sm font-body">Last updated: April 2026</p>
            <div className="flex flex-wrap gap-4 mt-6 font-body">
              <Link to="/privacy-policy" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Privacy Policy</Link>
              <Link to="/cookie-policy" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Cookie Policy</Link>
              <Link to="/security" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Security</Link>
              <Link to="/terms" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Terms</Link>
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
