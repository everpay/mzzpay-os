/**
 * Centralized payment method logo & metadata registry.
 */

export const METHOD_LOGOS: Record<string, string> = {
  // Card brands
  visa: '/logos/visa.svg',
  mastercard: '/logos/mastercard.svg',
  amex: '/logos/american-express.svg',
  'american express': '/logos/american-express.svg',
  'american-express': '/logos/american-express.svg',
  discover: '/logos/discover.svg',
  jcb: '/logos/jcb.svg',
  unionpay: '/logos/unionpay.svg',

  // Wallets
  apple_pay: '/logos/apple-pay.svg',
  'apple pay': '/logos/apple-pay.svg',
  google_pay: '/logos/google-pay.svg',
  'google pay': '/logos/google-pay.svg',
  paypal: '/logos/paypal.svg',
  klarna: '/logos/klarna.svg',
  affirm: '/logos/affirm.svg',
  venmo: '/logos/venmo.svg',
  cashapp: '/logos/cashapp.svg',
  'cash app': '/logos/cashapp.svg',
  alipay: '/logos/alipay.svg',
  wechat: '/logos/wechat-pay.svg',
  'wechat pay': '/logos/wechat-pay.svg',

  // EU / LATAM
  ideal: '/logos/ideal.svg',
  bancontact: '/logos/bancontact.svg',
  oxxo: '/logos/oxxo.png',
  'mercado pago': '/logos/mercado-pago.svg',
  mercadopago: '/logos/mercado-pago.svg',
  payu: '/logos/payu.svg',

  // Pakistan wallets
  jazzcash: '/logos/methods/jazzcash.svg',
  easypaisa: '/logos/methods/easypaisa.svg',

  // India
  paytm: '/logos/paytm.svg',

  // E-commerce
  shopify: '/logos/shopify.svg',
  woocommerce: '/logos/woocommerce.svg',

  // Crypto
  crypto: '/logos/crypto.svg',

  // Processor logos (fallback to brand logos where we have them)
  stripe: '/logos/stripe.svg',
  square: '/logos/square.svg',
};

export function getMethodLogo(method: string): string | undefined {
  if (!method) return undefined;
  const key = method.toLowerCase().replace(/[\s-]+/g, '_');
  if (METHOD_LOGOS[key]) return METHOD_LOGOS[key];
  const altKey = method.toLowerCase().replace(/[\s_]+/g, '-');
  if (METHOD_LOGOS[altKey]) return METHOD_LOGOS[altKey];
  const simpleKey = method.toLowerCase().replace(/[\s_-]+/g, '');
  for (const [k, v] of Object.entries(METHOD_LOGOS)) {
    if (k.replace(/[\s_-]+/g, '') === simpleKey) return v;
  }
  return undefined;
}

export function getProviderLogo(provider: string): string | undefined {
  if (!provider) return undefined;
  return METHOD_LOGOS[provider.toLowerCase()] || undefined;
}
