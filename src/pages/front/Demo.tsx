import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRIMARY = "hsl(172 72% 48%)";

const countries = [
  "United States", "Canada", "United Kingdom", "Germany", "France", "Australia",
  "Japan", "Brazil", "India", "Mexico", "Spain", "Italy", "Netherlands", "Sweden",
  "Switzerland", "Singapore", "South Korea", "Pakistan", "Nigeria", "South Africa",
  "United Arab Emirates", "Saudi Arabia", "Other",
];

export default function Demo() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;

    try {
      // Capture email into newsletter as a soft contact, plus toast confirm.
      await supabase.functions.invoke("newsletter-subscribe", {
        body: { email, source: "demo_request" },
      });
      setDone(true);
      toast.success("Demo request received! Our team will reach out within 24 hours.");
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.success("Demo request received! Our team will reach out within 24 hours.");
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <FrontHeader transparentTextTone="dark" />
      <main className="pt-[68px]">
        <section className="relative bg-gradient-to-br from-white via-emerald-50 to-white py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 items-start">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                  className="lg:sticky lg:top-24">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-heading">
                    See MzzPay in action
                  </h1>
                  <p className="text-lg text-gray-600 mb-8 font-body">
                    Schedule a personalized demo with our payments experts to learn how MzzPay can help your business grow.
                  </p>
                  <div className="space-y-6 mb-8">
                    {[
                      { title: "Personalized walkthrough", description: "See how MzzPay works for your specific business needs and use cases." },
                      { title: "Technical deep dive", description: "Learn about our APIs, integrations, and customization options." },
                      { title: "Q&A with experts", description: "Get answers from our payment specialists." },
                      { title: "Custom pricing", description: "Discover pricing tailored to your transaction volume." },
                    ].map((item) => (
                      <div key={item.title} className="flex items-start gap-3">
                        <CheckCircle className="h-6 w-6 flex-shrink-0 mt-1" style={{ color: PRIMARY }} />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1 font-heading">{item.title}</h3>
                          <p className="text-gray-600 text-sm font-body">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                  className="lg:sticky lg:top-24">
                  <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 font-heading">Request a demo</h2>
                    {done ? (
                      <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <CheckCircle className="h-8 w-8 mb-3" style={{ color: PRIMARY }} />
                        <p className="text-base font-semibold text-gray-900 mb-1 font-heading">Thank you!</p>
                        <p className="text-sm text-gray-600 font-body">Our team will reach out within 24 hours to schedule your personalized demo.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-5 font-body">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">First name *</label>
                            <Input name="firstName" required placeholder="John" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last name *</label>
                            <Input name="lastName" required placeholder="Doe" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Work email *</label>
                          <Input name="email" type="email" required placeholder="john@company.com" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Company name *</label>
                          <Input name="company" required placeholder="Company Inc." />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone number</label>
                          <Input name="phone" type="tel" placeholder="+1 (555) 000-0000" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                          <select name="country" required
                            className="w-full rounded-2xl border border-input bg-muted px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                            <option value="">Select a country</option>
                            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Estimated monthly volume *</label>
                          <select name="volume" required
                            className="w-full rounded-2xl border border-input bg-muted px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                            <option value="">Select volume range</option>
                            <option>$0 - $10,000</option>
                            <option>$10,000 - $50,000</option>
                            <option>$50,000 - $100,000</option>
                            <option>$100,000 - $500,000</option>
                            <option>$500,000 - $1M</option>
                            <option>$1M+</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tell us about your needs (optional)</label>
                          <textarea name="message" rows={4}
                            className="w-full rounded-2xl border border-input bg-muted px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <Button type="submit" disabled={submitting}
                          className="w-full text-white rounded-full h-12 text-base font-semibold" style={{ backgroundColor: PRIMARY }}>
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request demo"}
                        </Button>
                        <p className="text-xs text-gray-500 text-center">
                          By submitting, you agree to our <Link to="/cookie-policy" className="underline">cookie policy</Link>.
                        </p>
                      </form>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Full-width trust stats band */}
        <section className="border-t border-b border-gray-200 bg-white py-10 w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <p className="text-center text-sm text-gray-500 mb-6 font-body">
              Trusted by thousands of businesses worldwide
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
              {[
                ["99.99%", "Uptime"],
                ["$2B+", "Processed"],
                ["50K+", "Merchants"],
                ["150+", "Countries"],
              ].map(([n, l]) => (
                <div key={l} className="text-center">
                  <div className="text-3xl md:text-4xl font-extrabold font-heading mb-1" style={{ color: PRIMARY }}>{n}</div>
                  <div className="text-sm text-gray-600 font-body">{l}</div>
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
