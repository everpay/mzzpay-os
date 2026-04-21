import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Linkedin, Github, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRIMARY = "hsl(172 72% 48%)";

export function FrontFooter() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: { email, source: "landing_footer" },
      });
      if (error || !data?.ok) {
        toast.error(data?.error || "Could not subscribe. Try again.");
        return;
      }
      setDone(true);
      setEmail("");
      toast.success("Subscribed! Welcome to MzzPay updates.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="border-t border-gray-200 bg-gray-50 relative">
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          <div className="hidden lg:block" />

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 font-heading">Solutions</h3>
            <ul className="space-y-3 font-body">
              {[
                { label: "E-commerce", to: "/solutions/ecommerce" },
                { label: "SaaS & Platforms", to: "/solutions/saas" },
                { label: "Marketplaces", to: "/solutions/marketplaces" },
                { label: "Enterprise", to: "/solutions/enterprise" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-gray-600 hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 font-heading">Products</h3>
            <ul className="space-y-3 font-body">
              {[
                { label: "Online Payments", to: "/products/online-payments" },
                { label: "Payment Gateway", to: "/products/payment-gateway" },
                { label: "Payment Methods", to: "/products/payment-methods" },
                { label: "Fraud Prevention", to: "/products/fraud-prevention" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-gray-600 hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 font-heading">Resources</h3>
            <ul className="space-y-3 font-body">
              <li><Link to="/developers" className="text-sm text-gray-600 hover:text-foreground transition-colors">API Documentation</Link></li>
              <li><Link to="/demo" className="text-sm text-gray-600 hover:text-foreground transition-colors">Request Demo</Link></li>
              <li><Link to="/pricing" className="text-sm text-gray-600 hover:text-foreground transition-colors">Plans & Pricing</Link></li>
              <li><Link to="/help" className="text-sm text-gray-600 hover:text-foreground transition-colors">Help & Support</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 font-heading">Company</h3>
            <ul className="space-y-3 font-body">
              <li><Link to="/about" className="text-sm text-gray-600 hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link to="/partners" className="text-sm text-gray-600 hover:text-foreground transition-colors">Partners</Link></li>
              <li><Link to="/contact" className="text-sm text-gray-600 hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 font-heading">Stay Updated</h3>
            <p className="text-sm text-gray-600 mb-4 font-body">
              Subscribe to our newsletter for the latest updates.
            </p>
            {done ? (
              <div className="flex items-center gap-2 text-sm text-foreground font-body bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <CheckCircle2 className="h-4 w-4" style={{ color: PRIMARY }} />
                You're subscribed.
              </div>
            ) : (
              <form className="space-y-2" onSubmit={handleSubscribe}>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="rounded-full bg-white"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                </Button>
              </form>
            )}
            <div className="flex items-center gap-4 mt-4">
              <Facebook className="w-5 h-5 text-gray-400 hover:text-foreground cursor-pointer transition-colors" />
              <Twitter className="w-5 h-5 text-gray-400 hover:text-foreground cursor-pointer transition-colors" />
              <Linkedin className="w-5 h-5 text-gray-400 hover:text-foreground cursor-pointer transition-colors" />
              <Github className="w-5 h-5 text-gray-400 hover:text-foreground cursor-pointer transition-colors" />
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center mb-6 font-body">
            © {new Date().getFullYear()} MzzPay Technologies Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10 font-body">
            <Link to="/terms" className="text-sm text-gray-500 hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy-policy" className="text-sm text-gray-500 hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/security" className="text-sm text-gray-500 hover:text-foreground transition-colors">Security</Link>
            <Link to="/cookie-policy" className="text-sm text-gray-500 hover:text-foreground transition-colors">Cookie Policy</Link>
            <a href="https://status.mzzpay.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-foreground transition-colors">Status</a>
            <Link to="/developers" className="text-sm text-gray-500 hover:text-foreground transition-colors">Docs</Link>
          </div>
          <div className="pt-6">
            <p className="text-xs text-gray-500 leading-relaxed font-body">
              MzzPay is a financial technology company, not a bank. Banking services are provided by licensed Banking As
              A Service providers and partner institutions, FDIC-insured up to applicable limits.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mt-2 font-body">
              MzzPay is PCI DSS Level 1 certified, the highest level of security certification in the payments industry.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
