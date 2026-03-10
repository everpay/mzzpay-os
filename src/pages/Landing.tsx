import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import everpayIcon from '@/assets/everpay-icon.png';
import {
  ChevronDown,
  Menu,
  X,
  ShoppingBag,
  UtensilsCrossed,
  ShoppingCart,
  Smartphone,
  Laptop,
  Store,
  Building2,
  CreditCard,
  Plug,
  Globe,
  Shield,
  Lock,
  DollarSign,
  Star,
  Zap,
  ShieldCheck,
  Repeat,
  BarChart3,
  Facebook,
  Twitter,
  Linkedin,
  Github,
} from 'lucide-react';

// ============= SITE HEADER =============
function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMenuEnter = (menu: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveMegaMenu(menu);
  };

  const handleMenuLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 150);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
      }`}
    >
      <div className="container mx-auto flex h-[72px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={everpayIcon} alt="MZZPay Logo" className="h-8 w-8 rounded-lg" />
          <span className="text-[22px] font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            MZZPay
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {/* Solutions */}
          <div className="relative" onMouseEnter={() => handleMenuEnter('solutions')} onMouseLeave={handleMenuLeave}>
            <button className="flex items-center gap-1 px-4 py-2 text-[15px] font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors">
              Solutions
              <ChevronDown className={`h-3.5 w-3.5 opacity-50 transition-transform ${activeMegaMenu === 'solutions' ? 'rotate-180' : ''}`} />
            </button>
            {activeMegaMenu === 'solutions' && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-[520px]">
                <div className="h-2" />
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                  <div className="grid grid-cols-2 gap-1">
                    <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">By Business Type</p>
                    {[
                      { icon: ShoppingBag, label: 'Retail' },
                      { icon: UtensilsCrossed, label: 'Restaurant' },
                      { icon: ShoppingCart, label: 'E-commerce' },
                      { icon: Smartphone, label: 'Mobile Payments' },
                    ].map((item) => (
                      <button key={item.label} className="flex items-center gap-3 rounded-xl p-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors" onClick={() => setActiveMegaMenu(null)}>
                        <item.icon className="h-4 w-4 text-[#1aa478]" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                    <div className="col-span-2 border-t border-gray-100 my-2" />
                    <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">By Platform</p>
                    {[
                      { icon: Laptop, label: 'SaaS & Platforms' },
                      { icon: Store, label: 'Marketplaces' },
                      { icon: Building2, label: 'Enterprise' },
                    ].map((item) => (
                      <button key={item.label} className="flex items-center gap-3 rounded-xl p-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors" onClick={() => setActiveMegaMenu(null)}>
                        <item.icon className="h-4 w-4 text-[#1aa478]" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="relative" onMouseEnter={() => handleMenuEnter('products')} onMouseLeave={handleMenuLeave}>
            <button className="flex items-center gap-1 px-4 py-2 text-[15px] font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors">
              Products
              <ChevronDown className={`h-3.5 w-3.5 opacity-50 transition-transform ${activeMegaMenu === 'products' ? 'rotate-180' : ''}`} />
            </button>
            {activeMegaMenu === 'products' && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-[440px]">
                <div className="h-2" />
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { icon: CreditCard, label: 'Online Payments' },
                      { icon: Plug, label: 'Payment Gateway' },
                      { icon: Store, label: 'Point of Sale' },
                      { icon: Shield, label: 'Fraud Prevention' },
                      { icon: Lock, label: 'Security' },
                      { icon: Globe, label: 'Payment Methods' },
                      { icon: DollarSign, label: 'Funding' },
                    ].map((item) => (
                      <button key={item.label} className="flex items-center gap-3 rounded-xl p-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors" onClick={() => setActiveMegaMenu(null)}>
                        <item.icon className="h-4 w-4 text-[#1aa478]" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="px-4 py-2 text-[15px] font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors">Pricing</button>
          <button className="px-4 py-2 text-[15px] font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors">About</button>
          <button className="px-4 py-2 text-[15px] font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors">Blog</button>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link to="/docs" className="text-[15px] font-medium text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors">
            Docs
          </Link>
          <Link to="/auth" className="text-[15px] font-medium text-gray-600 hover:text-gray-900 px-4 py-2 transition-colors">
            Login
          </Link>
          <Button className="bg-[#1aa478] hover:bg-[#158f68] text-white rounded-full px-6 h-10 text-[15px] font-semibold shadow-none">
            Get a free demo
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
          {isMenuOpen ? <X className="h-6 w-6 text-gray-900" /> : <Menu className="h-6 w-6 text-gray-900" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white max-h-[calc(100vh-72px)] overflow-y-auto">
          <nav className="container mx-auto flex flex-col px-6 py-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Solutions</p>
              {['Retail', 'Restaurant', 'E-commerce', 'Mobile Payments', 'SaaS & Platforms', 'Marketplaces', 'Enterprise'].map((item) => (
                <button key={item} className="block py-2.5 text-[15px] text-gray-600 hover:text-gray-900 w-full text-left" onClick={() => setIsMenuOpen(false)}>
                  {item}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-4 pt-6 flex flex-col gap-3">
              <Link to="/auth" className="text-center text-[15px] font-medium text-gray-600 py-2.5" onClick={() => setIsMenuOpen(false)}>
                Login
              </Link>
              <Button className="w-full bg-[#1aa478] hover:bg-[#158f68] text-white rounded-full h-11 text-[15px] font-semibold">
                Get a free demo
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// ============= HERO SECTION =============
function HeroSection() {
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Poster fallback (always visible behind video) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{ backgroundImage: "url('/images/hero-payments.jpg')" }}
      />
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        onLoadedData={() => setVideoLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
        poster="/images/hero-payments.jpg"
      >
        <source src="/video/everpay-intro.mp4" type="video/mp4" />
      </video>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-[800px] mx-auto text-center">
          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 mb-8"
          >
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-[#1aa478]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-medium text-white/90">Trusted by 1,000+ merchants</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl md:text-[56px] lg:text-[64px] font-extrabold text-white leading-[1.08] tracking-tight mb-6"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Accept payments everywhere.{' '}
            <span className="text-[#1aa478]">Grow faster.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-white/70 max-w-[580px] mx-auto mb-10 leading-relaxed"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            MZZPay gives your business the same payment infrastructure as the biggest brands. One platform for cards, wallets, and local payment methods worldwide.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <Button size="lg" className="bg-[#1aa478] hover:bg-[#158f68] text-white rounded-full px-8 h-12 text-base font-semibold shadow-none min-w-[200px]">
              Get a free demo
            </Button>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 rounded-full px-8 h-12 text-base font-semibold shadow-none min-w-[200px]">
                Start accepting payments
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============= STATS SECTION =============
function StatsSection() {
  const stats = [
    { value: '99.99%', label: 'Uptime guarantee' },
    { value: '135+', label: 'Currencies supported' },
    { value: '1K+', label: 'Active merchants' },
    { value: '<200ms', label: 'Average response time' },
  ];

  return (
    <section className="py-16 bg-white border-y border-gray-100">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============= PAYMENT PARTNERS SECTION =============
function PaymentPartnersSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const paymentLogos = [
    { name: 'Visa', src: '/logos/visa.svg' },
    { name: 'Mastercard', src: '/logos/mastercard.svg' },
    { name: 'American Express', src: '/logos/amex.svg' },
    { name: 'PayPal', src: '/logos/paypal.svg' },
    { name: 'Apple Pay', src: '/logos/apple-pay.svg' },
    { name: 'Google Pay', src: '/logos/google-pay.svg' },
    { name: 'Klarna', src: '/logos/klarna.svg' },
    { name: 'Alipay', src: '/logos/alipay.svg' },
    { name: 'Bancontact', src: '/logos/bancontact.svg' },
    { name: 'iDEAL', src: '/logos/ideal.svg' },
  ];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const scroll = () => {
      scrollPosition += scrollSpeed;
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      scrollContainer.scrollLeft = scrollPosition;
    };

    const intervalId = setInterval(scroll, 20);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Trusted Payment Methods Worldwide
          </p>
        </div>
        <div ref={scrollRef} className="flex gap-12 overflow-x-hidden items-center" style={{ scrollBehavior: 'auto' }}>
          {[...paymentLogos, ...paymentLogos, ...paymentLogos].map((logo, index) => (
            <div key={`${logo.name}-${index}`} className="flex-shrink-0 flex items-center justify-center hover:scale-110 transition-transform duration-300">
              <img
                src={logo.src}
                alt={logo.name}
                className="h-10 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============= FEATURES SECTION =============
function FeaturesSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const features = [
    {
      number: '1',
      tab: 'Global Reach',
      title: 'Accept payments in 135+ currencies worldwide',
      description: 'With MZZPay, your business instantly supports cards, wallets, bank transfers, and local payment methods across every major market. No extra integrations needed.',
      icon: Globe,
      highlights: ['Visa, Mastercard, Amex, Discover', 'Apple Pay, Google Pay, PayPal', 'PIX, OXXO, Boleto, Alipay'],
    },
    {
      number: '2',
      tab: 'More Conversions',
      title: 'Increase checkout success rates by up to 20%',
      description: 'Our smart routing engine and localized payment experiences help you capture more revenue from every transaction. Less friction, more sales.',
      icon: Zap,
      highlights: ['Smart payment routing', 'Localized checkout experience', 'One-click payments'],
    },
    {
      number: '3',
      tab: 'Fraud Protection',
      title: 'AI-powered fraud prevention that protects your revenue',
      description: 'Real-time transaction monitoring, machine learning risk scoring, and 3D Secure authentication keep your business safe without blocking good customers.',
      icon: ShieldCheck,
      highlights: ['Real-time monitoring', 'ML-based risk scoring', '3D Secure 2.0'],
    },
    {
      number: '4',
      tab: 'Repeat Business',
      title: 'Turn one-time buyers into repeat customers',
      description: 'Tokenized cards, subscription billing, and smart retry logic ensure your recurring revenue flows smoothly and customers keep coming back.',
      icon: Repeat,
      highlights: ['Card tokenization', 'Subscription management', 'Smart retry logic'],
    },
  ];

  const active = features[activeIndex];

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-[40px] font-extrabold text-gray-900 leading-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            With MZZPay, you get more sales,{' '}
            <br className="hidden md:block" />
            more reach, more repeat customers
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {features.map((feature, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                index === activeIndex ? 'bg-[#1aa478] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === activeIndex ? 'bg-white/20 text-white' : 'bg-white text-gray-500'}`}>
                {feature.number}
              </span>
              {feature.tab}
            </button>
          ))}
        </div>

        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5 leading-snug" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {active.title}
                </h3>
                <p className="text-gray-500 text-base leading-relaxed mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {active.description}
                </p>
                <ul className="space-y-3">
                  {active.highlights.map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1aa478]/10 flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#1aa478]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-lg">
                  <img
                    src={[
                      '/images/feature-global.jpg',
                      '/images/feature-analytics.jpg',
                      '/images/feature-security.jpg',
                      '/images/feature-dashboard.jpg',
                    ][activeIndex]}
                    alt={active.title}
                    className="w-full h-64 object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ============= TESTIMONIALS SECTION =============
function TestimonialsSection() {
  const testimonials = [
    { quote: "MZZPay transformed our payment operations. We've seen a 40% increase in successful transactions since switching.", name: 'Sarah Chen', title: 'CTO, UrbanMarket' },
    { quote: 'The fraud protection alone has saved us over $200K. And the integration was incredibly smooth.', name: 'Marcus Rivera', title: 'Head of Payments, FlowCommerce' },
    { quote: 'We went from 3 payment providers to just MZZPay. Simpler, cheaper, and our conversion rate is up 18%.', name: 'Aisha Patel', title: 'VP Operations, ShopWave' },
    { quote: 'Their support team is incredible. Available 24/7 and deeply knowledgeable about global payment regulations.', name: "James O'Brien", title: 'CEO, QuickShip Logistics' },
    { quote: 'Expanding into Latin America was seamless with MZZPay. PIX, Boleto, OXXO - all just worked from day one.', name: 'Lucia Fernandez', title: 'Growth Lead, Tienda Digital' },
    { quote: 'The dashboard gives us real-time visibility into every transaction across 12 countries. Game changer.', name: 'David Kim', title: 'CFO, NexGen Retail' },
  ];

  return (
    <section className="py-20 md:py-28 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-[40px] font-extrabold text-gray-900 leading-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            See why businesses trust MZZPay
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            Over 500 businesses have switched to MZZPay for faster, more reliable payment processing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#1aa478] text-[#1aa478]" />
                ))}
              </div>
              <p className="text-gray-700 text-[15px] leading-relaxed mb-5" style={{ fontFamily: 'Inter, sans-serif' }}>
                "{t.quote}"
              </p>
              <div>
                <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>{t.name}</p>
                <p className="text-sm text-gray-400">{t.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============= PRODUCTS SECTION =============
function ProductsSection() {
  const products = [
    { icon: CreditCard, title: 'Online Payments', description: 'Accept credit cards, debit cards, and digital wallets with a single integration. Optimized checkout that converts.' },
    { icon: Globe, title: 'Global Payment Methods', description: 'Support 135+ currencies and local payment methods like PIX, Boleto, OXXO, Alipay, and more.' },
    { icon: Smartphone, title: 'Mobile & In-App Payments', description: 'Apple Pay, Google Pay, and native SDKs for iOS and Android. Seamless mobile checkout experiences.' },
    { icon: ShieldCheck, title: 'Fraud Prevention', description: 'AI-powered fraud detection with real-time scoring. Block bad actors without slowing down good customers.' },
    { icon: BarChart3, title: 'Analytics & Reporting', description: 'Real-time dashboards, transaction insights, and settlement reports. Full visibility into your payment operations.' },
    { icon: Repeat, title: 'Recurring Billing', description: 'Subscriptions, invoicing, and smart retry logic. Maximize recurring revenue and reduce churn.' },
  ];

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-[40px] font-extrabold text-gray-900 leading-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Everything you need to get paid
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
            One platform with all the tools to accept payments, prevent fraud, and grow your business globally.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {products.map((product, index) => (
            <div key={index} className="group block rounded-2xl border border-gray-100 bg-white p-7 hover:shadow-lg hover:border-[#1aa478]/20 transition-all duration-200">
              <div className="w-11 h-11 rounded-xl bg-[#1aa478]/10 flex items-center justify-center mb-5">
                <product.icon className="w-5 h-5 text-[#1aa478]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#1aa478] transition-colors" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {product.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                {product.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============= CTA SECTION =============
function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-[#0A2F2F]">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-[44px] font-extrabold text-white leading-tight mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Ready to grow your business?
        </h2>
        <p className="text-lg text-white/60 mb-10 max-w-lg mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          Get a free demo and see how Everpay can help you accept payments globally, prevent fraud, and increase revenue.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="bg-[#1aa478] hover:bg-[#158f68] text-white rounded-full px-8 h-12 text-base font-semibold shadow-none min-w-[200px]">
            Get a free demo
          </Button>
          <Button size="lg" variant="outline" className="border-2 border-white/20 bg-transparent text-white hover:bg-white/10 rounded-full px-8 h-12 text-base font-semibold shadow-none min-w-[200px]">
            Contact sales
          </Button>
        </div>
      </div>
    </section>
  );
}

// ============= SITE FOOTER =============
function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 relative">
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          <div className="hidden lg:block"></div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Solutions</h3>
            <ul className="space-y-3">
              {['Retail', 'Restaurant', 'E-commerce', 'Mobile Payments', 'SaaS & Platforms', 'Marketplaces', 'Enterprise'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-gray-600 hover:text-[#1aa478] transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Products</h3>
            <ul className="space-y-3">
              {['Online Payments', 'Payment Gateway', 'POS & Kiosks', 'Omni-Commerce', 'Payment Methods', 'Fraud Prevention', 'Funding'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-gray-600 hover:text-[#1aa478] transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              {['Blog', 'API Documentation', 'Request Demo', 'Help & Support', 'Plans & Pricing'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-gray-600 hover:text-[#1aa478] transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-3">
              {['About Us', 'Careers', 'Contact Us', 'Partners'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-gray-600 hover:text-[#1aa478] transition-colors cursor-pointer">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Stay Updated</h3>
            <p className="text-sm text-gray-600 mb-4">Subscribe to our newsletter for the latest updates.</p>
            <form className="space-y-2">
              <Input type="email" placeholder="Enter your email" className="rounded-full" />
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full">Subscribe</Button>
            </form>
            <div className="flex items-center gap-4 mt-4">
              <Facebook className="w-5 h-5 text-gray-400 hover:text-[#1aa478] cursor-pointer transition-colors" />
              <Twitter className="w-5 h-5 text-gray-400 hover:text-[#1aa478] cursor-pointer transition-colors" />
              <Linkedin className="w-5 h-5 text-gray-400 hover:text-[#1aa478] cursor-pointer transition-colors" />
              <Github className="w-5 h-5 text-gray-400 hover:text-[#1aa478] cursor-pointer transition-colors" />
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center mb-6">© {new Date().getFullYear()} Everpay Corporation. All rights reserved.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security & Trust', 'System Status'].map((item) => (
              <span key={item} className="text-sm text-gray-500 hover:text-[#1aa478] transition-colors cursor-pointer text-center">{item}</span>
            ))}
          </div>
          <div className="pt-6">
            <p className="text-xs text-gray-500 leading-relaxed">
              Everpay Aspect is a financial technology company, not a bank. Banking services are provided by licensed Banking As A Service providers, partner institutions and are FDIC-insured up to applicable limits. The Everpay Card is issued by Everpay card-issuing technology providers pursuant to licenses from Visa U.S.A. Inc. and Mastercard International.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              Everpay is PCI DSS Level 1 certified, the highest level of security certification in the payments industry.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============= LANDING PAGE =============
export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <HeroSection />
        <StatsSection />
        <PaymentPartnersSection />
        <FeaturesSection />
        <TestimonialsSection />
        <ProductsSection />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
}
