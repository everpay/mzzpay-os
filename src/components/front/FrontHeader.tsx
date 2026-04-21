import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import mzzpayIcon from "@/assets/mzzpay-logo.png";

const PRIMARY = "hsl(172 72% 48%)";

interface FrontHeaderProps {
  /**
   * When true, the header is transparent at the top of the page and fades to
   * a solid surface once the user scrolls past `scrollThreshold` pixels.
   */
  transparentUntilScroll?: boolean;
  /** Scroll distance (px) that triggers the solid state. Default: 80. */
  scrollThreshold?: number;
}

const NAV_LINKS: { label: string; to: string }[] = [
  { label: "Platform", to: "/products/payment-gateway" },
  { label: "Solutions", to: "/solutions/ecommerce" },
  { label: "Pricing", to: "/pricing" },
  { label: "Partners", to: "/partners" },
  { label: "Developers", to: "/docs" },
  { label: "About", to: "/about" },
];

export function FrontHeader({
  transparentUntilScroll = true,
  scrollThreshold = 80,
}: FrontHeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > scrollThreshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollThreshold]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (isMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMenuOpen]);

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

  // Top 4 desktop links to keep the bar tidy (full list shows in mobile menu)
  const desktopLinks = [
    { label: "Pricing", to: "/pricing" },
    { label: "About", to: "/about" },
    { label: "Partners", to: "/partners" },
    { label: "Developers", to: "/docs" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${headerClass}`}
      >
        <div className="max-w-7xl mx-auto flex h-[68px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setIsMenuOpen(false)}>
            <img src={mzzpayIcon} alt="MzzPay" className="h-8 w-8 rounded-lg" />
            <span className={`font-logo text-2xl tracking-wide transition-colors ${logoTextClass}`}>
              MzzPay
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-9 font-body">
            {desktopLinks.map((l) => (
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
            {/* Top bar inside the overlay */}
            <div className="flex items-center justify-between h-[68px] px-6 border-b border-border/60">
              <Link to="/" className="flex items-center gap-2.5" onClick={() => setIsMenuOpen(false)}>
                <img src={mzzpayIcon} alt="MzzPay" className="h-8 w-8 rounded-lg" />
                <span className="font-logo text-2xl tracking-wide text-foreground">MzzPay</span>
              </Link>
              <button
                className="p-2 rounded-full text-foreground hover:bg-muted transition-colors"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            {/* Nav body */}
            <motion.nav
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
              }}
              className="flex-1 overflow-y-auto px-6 py-6"
            >
              <ul className="flex flex-col divide-y divide-border/60">
                {NAV_LINKS.map((item) => (
                  <motion.li
                    key={item.to}
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      visible: { opacity: 1, x: 0 },
                    }}
                  >
                    <Link
                      to={item.to}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between py-5 text-2xl font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-6 w-6 text-muted-foreground" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.nav>

            {/* Footer actions */}
            <div className="px-6 pb-8 pt-4 border-t border-border/60 space-y-4">
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="block text-center text-base font-semibold text-foreground py-3 rounded-full border-2 border-border hover:bg-muted transition-colors"
              >
                Sign In
              </Link>
              <Link to="/demo" onClick={() => setIsMenuOpen(false)}>
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
