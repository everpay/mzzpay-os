export interface IntegrationItem {
  name: string;
  description: string;
  category: string;
  icon: string;
  learnMore?: string;
}

export const CATEGORIES = [
  { key: "all", label: "All Categories" },
  { key: "gateways", label: "Payment Gateways" },
  { key: "supported", label: "Supported Gateways" },
  { key: "ecommerce", label: "E-commerce" },
  { key: "fraud", label: "Fraud & Risk" },
];

export const integrations: IntegrationItem[] = [
  // E-commerce
  { name: "Shopify", description: "Powerful e-commerce platform with seamless payment integration.", category: "ecommerce", icon: "/logos/shopify.svg" },
  { name: "WooCommerce", description: "Flexible payment solutions for your online store.", category: "ecommerce", icon: "/logos/woocommerce.svg" },
  { name: "BigCommerce", description: "Enterprise e-commerce with advanced checkout experiences.", category: "ecommerce", icon: "💳" },

  // Supported gateways via Active Merchant (subset of 130+)
  { name: "Adyen", description: "Global payment platform — US, EU, AU, BR, SG, HK, MX and more.", category: "supported", icon: "💳", learnMore: "https://www.adyen.com/" },
  { name: "Authorize.Net", description: "US, AU, CA payment processing with CIM support.", category: "supported", icon: "💳", learnMore: "http://www.authorize.net/" },
  { name: "Braintree", description: "PayPal-owned gateway — US, CA, AU, EU-wide and more.", category: "supported", icon: "💳", learnMore: "https://www.braintreepayments.com/" },
  { name: "Checkout.com", description: "Enterprise-grade global payments — 50+ countries.", category: "supported", icon: "💳", learnMore: "https://www.checkout.com/" },
  { name: "CyberSource", description: "Visa-owned global processing — US, BR, CA, CN, JP, DE and more.", category: "supported", icon: "💳", learnMore: "http://www.cybersource.com/" },
  { name: "PayPal", description: "PayPal Express Checkout & Payments Pro.", category: "supported", icon: "/logos/paypal.svg", learnMore: "https://www.paypal.com/" },
  { name: "Stripe", description: "Global online payments processor — 40+ countries.", category: "supported", icon: "/logos/stripe.svg", learnMore: "https://stripe.com/" },
  { name: "Square", description: "In-person & online payments — US, CA, AU, GB, JP.", category: "supported", icon: "/logos/square.svg", learnMore: "https://squareup.com/" },
  { name: "Worldpay", description: "Worldpay Global / Online / US — 100+ countries.", category: "supported", icon: "💳", learnMore: "https://www.worldpay.com/" },
  { name: "Moneris", description: "Canadian payment processor — CA.", category: "supported", icon: "💳", learnMore: "http://www.moneris.com/" },
  { name: "NMI", description: "US payment processing.", category: "supported", icon: "💳", learnMore: "http://nmi.com/" },
  { name: "Mercado Pago", description: "LATAM payments — AR, BR, MX, CL, CO, PE, UY.", category: "supported", icon: "/logos/mercado-pago.svg", learnMore: "https://www.mercadopago.com/" },
  { name: "PayU India", description: "Indian payments — UPI, NB, Cards, Wallets.", category: "supported", icon: "/logos/payu.svg", learnMore: "https://payu.in/" },
  { name: "Paytm", description: "Indian wallet & payment processing — IN.", category: "supported", icon: "/logos/paytm.svg", learnMore: "https://paytm.com/" },
];
