import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import mzzpayIcon from "@/assets/mzzpay-logo.png";

const PRIMARY = "hsl(172 72% 48%)";

interface FrontHeaderProps {
  /**
   * When true, the header is transparent at the top of the page and fades to
   * a solid white surface once the user scrolls past `scrollThreshold` pixels.
   * When false, the header is always solid (legacy behavior).
   * Defaults to true so the new transparent-over-hero style applies site-wide.
   */
  transparentUntilScroll?: boolean;
  /** Scroll distance (px) that triggers the solid state. Default: 80. */
  scrollThreshold?: number;
}

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

  const isSolid = !transparentUntilScroll || scrolled;

  const headerClass = isSolid
    ? "bg-white/90 backdrop-blur-xl shadow-sm"
    : "bg-transparent";

  const logoTextClass = isSolid ? "text-slate-900" : "text-white";
  const linkClass = isSolid
    ? "text-base font-semibold text-slate-600 hover:text-slate-900 transition-colors"
    : "text-base font-semibold text-white/90 hover:text-white transition-colors";
  const signInClass = linkClass;
  const mobileBtnClass = isSolid
    ? "text-slate-900 hover:bg-slate-100"
    : "text-white hover:bg-white/10";

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${headerClass}`}
    >
      <div className="max-w-7xl mx-auto flex h-[68px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={mzzpayIcon} alt="MzzPay" className="h-8 w-8 rounded-lg" />
          <span className={`font-logo text-2xl tracking-wide transition-colors ${logoTextClass}`}>
            MzzPay
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-9 font-body">
          <Link to="/pricing" className={linkClass}>Pricing</Link>
          <Link to="/about" className={linkClass}>About</Link>
          <Link to="/partners" className={linkClass}>Partners</Link>
          <Link to="/docs" className={linkClass}>Developers</Link>
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
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-6 py-4 space-y-3">
          <Link to="/pricing" className="block text-base font-semibold text-slate-700 py-2" onClick={() => setIsMenuOpen(false)}>Pricing</Link>
          <Link to="/about" className="block text-base font-semibold text-slate-700 py-2" onClick={() => setIsMenuOpen(false)}>About</Link>
          <Link to="/partners" className="block text-base font-semibold text-slate-700 py-2" onClick={() => setIsMenuOpen(false)}>Partners</Link>
          <Link to="/docs" className="block text-base font-semibold text-slate-700 py-2" onClick={() => setIsMenuOpen(false)}>Developers</Link>
          <Link to="/login" className="block text-base font-semibold text-slate-700 py-2" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
          <Link to="/demo" onClick={() => setIsMenuOpen(false)}>
            <Button className="w-full text-white rounded-full h-12 text-base font-bold" style={{ backgroundColor: PRIMARY }}>
              Request Demo
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}
