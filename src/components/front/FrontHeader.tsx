import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import mzzpayIcon from "@/assets/mzzpay-logo.png";

const PRIMARY = "hsl(172 72% 48%)";

export function FrontHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-xl shadow-sm" : "bg-white/75 backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto flex h-[68px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={mzzpayIcon} alt="MzzPay" className="h-8 w-8 rounded-lg" />
          <span className="font-logo text-2xl tracking-wide text-slate-900">
            MzzPay
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-9 font-body">
          <Link to="/pricing" className="text-base font-semibold text-slate-600 hover:text-slate-900 transition-colors">Pricing</Link>
          <Link to="/about" className="text-base font-semibold text-slate-600 hover:text-slate-900 transition-colors">About</Link>
          <Link to="/partners" className="text-base font-semibold text-slate-600 hover:text-slate-900 transition-colors">Partners</Link>
          <Link to="/docs" className="text-base font-semibold text-slate-600 hover:text-slate-900 transition-colors">Developers</Link>
        </nav>

        <div className="hidden md:flex items-center gap-5">
          <Link to="/login" className="text-base font-semibold text-slate-600 hover:text-slate-900 transition-colors">
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
          className="md:hidden p-2 rounded-full hover:bg-slate-100"
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
