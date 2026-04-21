import { Link } from "react-router-dom";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Server, Globe, ClipboardCheck, FileCheck, CheckCircle } from "lucide-react";

const PRIMARY = "hsl(172 72% 48%)";

const pillars = [
  { title: "Enterprise-Grade Security", description: "PCI DSS Level 1, encryption everywhere, continuous fraud monitoring.", icon: Shield },
  { title: "Global Compliance", description: "Network rules, regulatory alignment, and audit-ready controls.", icon: Globe },
  { title: "Reliable Operations", description: "High availability, redundancy, and real-time platform monitoring.", icon: Server },
];

const securityFeatures = [
  { title: "PCI DSS Level 1", description: "MzzPay's vaulting and processing environments are aligned with the highest level of PCI Data Security Standards to safeguard cardholder data.", icon: Shield },
  { title: "Encryption & Data Protection", description: "Sensitive data is encrypted in transit (TLS 1.2+) and at rest (AES-256), with strict role-based access controls across the platform.", icon: Lock },
  { title: "Fraud Prevention & Monitoring", description: "Real-time risk scoring, velocity controls, and 3-D Secure 2 orchestration help detect and prevent fraudulent activity before settlement.", icon: Eye },
  { title: "Defense-in-Depth Architecture", description: "From edge WAF to network segmentation, secure APIs, and tokenized vaults — built with multiple layers of protection.", icon: FileCheck },
];

const operational = [
  { title: "High Availability & Redundancy", description: "Multi-region active-active infrastructure designed for 99.99% uptime and zero-downtime deploys." },
  { title: "Disaster Recovery", description: "Automated backups, point-in-time restore, and regularly-tested recovery runbooks." },
  { title: "Transparent Reporting", description: "Centralized audit logs and exportable reports for merchants, auditors, and regulators." },
];

const compliance = [
  { title: "Network Compliance", description: "Adheres to Visa, Mastercard, American Express, and Discover network requirements." },
  { title: "Regulatory Alignment", description: "Designed to integrate with licensed acquirers, banks, and local regulatory frameworks worldwide." },
  { title: "Ongoing Audits", description: "Regular third-party security assessments, penetration tests, and SOC reporting." },
];

export default function Security() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <FrontHeader transparentUntilScroll={false} />
      <main className="pt-[68px] flex-1">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm font-semibold mb-4 font-body uppercase tracking-wider" style={{ color: PRIMARY }}>Security at MzzPay</p>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 font-heading">Secure payments, trusted everywhere</h1>
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-3xl mx-auto font-body">
                MzzPay protects merchants, their customers, and partner institutions with enterprise-grade security,
                compliance, and operational reliability — all on a unified payments platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/demo">
                  <Button className="text-white rounded-full h-12 px-7 text-base font-bold" style={{ backgroundColor: PRIMARY }}>
                    Request a Demo
                  </Button>
                </Link>
                <Link to="/developers">
                  <Button variant="outline" className="rounded-full h-12 px-7 text-base font-bold border-white/30 bg-white/5 text-white hover:bg-white/10">
                    Read the Docs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-slate-900 font-heading">Why merchants trust MzzPay</h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto font-body">
              Trust and security are at the core of everything we do. Payments are mission-critical — our platform is designed to protect every party in the transaction.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pillars.map((p) => (
                <div key={p.title} className="p-8 border border-gray-100 rounded-2xl bg-white shadow-card text-center hover:shadow-elevated transition-shadow">
                  <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "hsl(172 72% 48% / 0.12)" }}>
                    <p.icon className="h-7 w-7" style={{ color: PRIMARY }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-900 font-heading">{p.title}</h3>
                  <p className="text-gray-600 font-body">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security features */}
        <section className="bg-slate-50 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-slate-900 font-heading">Security you can rely on</h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto font-body">
              Built from the ground up with security as a foundational principle.
            </p>
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {securityFeatures.map((f) => (
                <div key={f.title} className="p-6 bg-white rounded-2xl shadow-card flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "hsl(172 72% 48% / 0.12)" }}>
                      <f.icon className="h-6 w-6" style={{ color: PRIMARY }} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900 font-heading">{f.title}</h3>
                    <p className="text-gray-600 font-body">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Operational */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-slate-900 font-heading">Operational reliability</h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto font-body">
              Built for continuous uptime and seamless payment processing at scale.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {operational.map((f) => (
                <div key={f.title} className="p-6 border border-gray-100 rounded-2xl bg-white shadow-card">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5" style={{ color: PRIMARY }} />
                    <h3 className="text-lg font-bold text-slate-900 font-heading">{f.title}</h3>
                  </div>
                  <p className="text-gray-600 font-body">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section className="bg-slate-50 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-slate-900 font-heading">Compliance & regulatory alignment</h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto font-body">
              MzzPay operates within the requirements of regulated payment ecosystems and supports compliant, secure, and transparent payment operations.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {compliance.map((f) => (
                <div key={f.title} className="p-6 border border-gray-100 rounded-2xl bg-white shadow-card">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardCheck className="h-5 w-5" style={{ color: PRIMARY }} />
                    <h3 className="text-lg font-bold text-slate-900 font-heading">{f.title}</h3>
                  </div>
                  <p className="text-gray-600 font-body">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <FrontFooter />
    </div>
  );
}
