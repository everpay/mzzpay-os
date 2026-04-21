import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronRight, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import mzzpayIcon from "@/assets/mzzpay-icon.png";

const PRIMARY = "hsl(var(--brand-teal))";

interface FrontHeaderProps {
  transparentUntilScroll?: boolean;
  scrollThreshold?: number;
}

type SubLink = { label: string; to: string; description?: string };
type NavItem = { label: string; to?: string; children?: SubLink[] };

const NAV_ITEMS: NavItem[] = [
  {
    label: "Platform",
    children: [
      { label: "Payment Gateway", to: "/products/payment-gateway", description: "Accept payments anywhere" },
      { label: "Online Payments", to: "/products/online-payments", description: "Cards, wallets & APMs" },
      { label: "Payment Methods", to: "/products/payment-methods", description: "200+ global rails" },
      { label: "Fraud Prevention", to: "/products/fraud-prevention", description: "AI-powered protection" },
    ],
  },
  {
    label: "Solutions",
    children: [
      { label: "E-commerce", to: "/solutions/ecommerce", description: "For online retailers" },
      { label: "SaaS", to: "/solutions/saas", description: "Subscription billing" },
      { label: "Marketplaces", to: "/solutions/marketplaces", description: "Multi-party payouts" },
      { label: "Enterprise", to: "/solutions/enterprise", description: "Built to scale" },
    ],
  },
  { label: "Pricing", to: "/pricing" },
  { label: "Partners", to: "/partners" },
  { label: "Developers", to: "/developers" },
  { label: "About", to: "/about" },
];

export function FrontHeader({
  transparentUntilScroll = true,
  scrollThreshold = 80,
}: FrontHeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > scrollThreshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollThreshold]);

  useEffect(() => {
    if (isMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setExpanded(null);
  };

  const isSolid = !transparentUntilScroll || scrolled;

  const headerClass = isSolid
    ? "bg-background/85 backdrop-blur-xl shadow-soft border-b border-border/60"
    : "bg-transparent";

  const logoTextClass = isSolid ? "text-foreground" : "text-white";
  const linkClass = isSolid
    ? "text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
    : "text-base font-semibold text-white/90 hover:text-white transition-colors";
  const signInClass = linkClass;
  const mobileBtnClass = isSolid
    ? "text-foreground hover:bg-muted"
    : "text-white hover:bg-white/10";

  const desktopLinks = [
    { label: "Platform", to: "/products/payment-gateway" },
    { label: "Solutions", to: "/solutions/ecommerce" },
    { label: "Pricing", to: "/pricing" },
    { label: "Resources", to: "/developers" },
    { label: "Company", to: "/about" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${headerClass}`}
      >
        <div className="max-w-7xl mx-auto flex h-[68px] items-center justify-between px-6">
          <Link to="/" className="flex items-center" onClick={closeMenu}>
            <img
              src={mzzpayIcon}
              alt="MzzPay"
              className="h-20 w-20 rotate-[33deg] drop-shadow-lg"
              style={{ filter: "contrast(1.35) saturate(1.2) brightness(1.05)" }}
            />
            <span className={`font-logo text-2xl tracking-wide transition-colors -ml-[2px] ${logoTextClass}`}>
              MzzPay
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-9 font-body">
            {desktopLinks.filter((l) => l.label !== "Resources").map((l) => (
              <Link key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-5">
            <Link to="/login" className={signInClass}>
              Sign In
            </Link>
            <Link to="/demo">
              <Button
                className="text-white rounded-full px-6 h-11 text-base font-bold shadow-md"
                style={{ backgroundColor: PRIMARY }}
              >
                Request Demo
              </Button>
            </Link>
          </div>

          <button
            className={`md:hidden p-2 rounded-full transition-colors ${mobileBtnClass}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Recurly-style full-screen mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] md:hidden bg-background flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between h-[68px] px-6 border-b border-border/60">
              <Link to="/" className="flex items-center gap-5" onClick={closeMenu}>
                <img
                  src={mzzpayIcon}
                  alt="MzzPay"
                  className="h-20 w-20 rotate-[33deg] drop-shadow-lg"
                  style={{ filter: "contrast(1.35) saturate(1.2) brightness(1.05)" }}
                />
                <span className="font-logo text-2xl tracking-wide text-foreground">MzzPay</span>
              </Link>
              <button
                className="p-2 rounded-full text-foreground hover:bg-muted transition-colors"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <motion.nav
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
              }}
              className="flex-1 overflow-y-auto px-6 py-4"
            >
              <ul className="flex flex-col divide-y divide-border/60">
                {NAV_ITEMS.map((item) => {
                  const isExpanded = expanded === item.label;
                  const hasChildren = !!item.children?.length;

                  return (
                    <motion.li
                      key={item.label}
                      variants={{
                        hidden: { opacity: 0, x: -12 },
                        visible: { opacity: 1, x: 0 },
                      }}
                    >
                      {hasChildren ? (
                        <>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : item.label)}
                            aria-expanded={isExpanded}
                            className="w-full flex items-center justify-between py-5 text-2xl font-semibold text-foreground hover:text-primary transition-colors"
                          >
                            <span>{item.label}</span>
                            <ChevronDown
                              className={`h-6 w-6 text-muted-foreground transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="overflow-hidden"
                              >
                                <ul className="pb-4 pl-1 space-y-1">
                                  {item.children!.map((sub) => (
                                    <li key={sub.to}>
                                      <Link
                                        to={sub.to}
                                        onClick={closeMenu}
                                        className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-muted transition-colors"
                                      >
                                        <span>
                                          <span className="block text-base font-semibold text-foreground">
                                            {sub.label}
                                          </span>
                                          {sub.description && (
                                            <span className="block text-sm text-muted-foreground mt-0.5">
                                              {sub.description}
                                            </span>
                                          )}
                                        </span>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 ml-3" />
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <Link
                          to={item.to!}
                          onClick={closeMenu}
                          className="flex items-center justify-between py-5 text-2xl font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          <span>{item.label}</span>
                          <ChevronRight className="h-6 w-6 text-muted-foreground" />
                        </Link>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </motion.nav>

            <div className="px-6 pb-8 pt-4 border-t border-border/60 space-y-4">
              <Link
                to="/login"
                onClick={closeMenu}
                className="block text-center text-base font-semibold text-foreground py-3 rounded-full border-2 border-border hover:bg-muted transition-colors"
              >
                Sign In
              </Link>
              <Link to="/demo" onClick={closeMenu}>
                <Button
                  className="w-full text-white rounded-full h-12 text-base font-bold shadow-md"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Request a Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
