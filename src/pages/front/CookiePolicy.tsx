import { Link } from "react-router-dom";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";

const PRIMARY = "hsl(172 72% 48%)";

const sections = [
  {
    title: "1. What are cookies?",
    body: "Cookies are small text files placed on your device when you visit a website. They help websites remember information about your visit, like your preferred language and other settings, and can make your next visit easier and the site more useful to you.",
  },
  {
    title: "2. How MzzPay uses cookies",
    body: "We use cookies to operate the MzzPay website and dashboard, secure your session, remember your preferences, measure how visitors interact with our content, and improve our products. Some cookies are strictly necessary; others are optional.",
  },
  {
    title: "3. Categories of cookies we use",
    body: "Strictly necessary (authentication, fraud prevention, balance load), Functionality (language, layout), Analytics (anonymous usage statistics), and Marketing (only when you explicitly opt in via the cookie banner).",
  },
  {
    title: "4. Managing your preferences",
    body: "You can accept or reject non-essential cookies via the banner shown on your first visit. You can also clear or block cookies through your browser settings. Disabling strictly necessary cookies may break parts of the dashboard or checkout.",
  },
  {
    title: "5. Third-party cookies",
    body: "We may use a small number of trusted third parties (for analytics, fraud prevention, and customer support chat). They are bound by data-processing agreements and only handle data on our behalf.",
  },
  {
    title: "6. Updates to this policy",
    body: "We may update this Cookie Policy as we add new features or as the regulatory landscape changes. We'll always show the last-updated date at the top, and material changes will be communicated in-app.",
  },
];

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-white">
      <FrontHeader />
      <main className="pt-[68px] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-sm font-semibold mb-4 font-body" style={{ color: PRIMARY }}>Legal Information</p>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-heading">Cookie Policy</h1>
            <p className="text-gray-500 text-sm font-body">Last updated: April 2026</p>
            <div className="flex gap-4 mt-6 font-body">
              <Link to="/about" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>About</Link>
              <Link to="/partners" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Partners</Link>
              <Link to="/pricing" className="text-sm hover:underline font-medium" style={{ color: PRIMARY }}>Pricing</Link>
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
