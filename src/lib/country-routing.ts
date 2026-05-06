export interface CountryPaymentConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  provider: string;
  paymentMethods: string[];
}

export const COUNTRY_PAYMENT_CONFIGS: CountryPaymentConfig[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', currencySymbol: '₹', provider: 'paygate10', paymentMethods: ['UPI', 'NB', 'UPIQRCode', 'Bank Transfer', 'Wallet'] },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL', currencySymbol: 'R$', provider: 'paygate10', paymentMethods: ['PIX', 'Boleto', 'Bank Transfer'] },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', currencySymbol: '$', provider: 'paygate10', paymentMethods: ['Bank Transfer', 'Cash'] },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', currencySymbol: '₦', provider: 'lipad', paymentMethods: ['Bank Transfer', 'Mobile Money'] },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN', currencySymbol: '$', provider: 'paygate10', paymentMethods: ['SPEI', 'Cash', 'Bank Transfer'] },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', currencySymbol: 'R', provider: 'lipad', paymentMethods: ['Bank Transfer', 'Mobile Money'] },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', currencySymbol: 'KSh', provider: 'lipad', paymentMethods: ['M-Pesa', 'Bank Transfer'] },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', currencySymbol: '₨', provider: 'paygate10', paymentMethods: ['JazzCash', 'EasyPaisa', 'Bank Transfer'] },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP', currencySymbol: '$', provider: 'paygate10', paymentMethods: ['PSE', 'Bank Transfer'] },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', currencySymbol: '£', provider: 'mondo', paymentMethods: ['Card', 'Faster Payments', 'Open Banking'] },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', currencySymbol: '€', provider: 'mondo', paymentMethods: ['Card', 'SEPA', 'Open Banking'] },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', currencySymbol: '€', provider: 'mondo', paymentMethods: ['Card', 'SEPA', 'Open Banking'] },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', currencySymbol: '€', provider: 'mondo', paymentMethods: ['Card', 'SEPA'] },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', currencySymbol: '€', provider: 'mondo', paymentMethods: ['Card', 'SEPA'] },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', currencySymbol: '€', provider: 'mondo', paymentMethods: ['Card', 'SEPA', 'iDEAL'] },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', currencySymbol: '$', provider: 'shieldhub', paymentMethods: ['Card', 'ACH'] },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', currencySymbol: 'C$', provider: 'moneto', paymentMethods: ['Wallet', 'Bank Transfer'] },
];

export function getConfigForCountry(code: string): CountryPaymentConfig | undefined {
  return COUNTRY_PAYMENT_CONFIGS.find(c => c.code === code);
}

export function getAllSupportedCurrencies(): { code: string; name: string; symbol: string }[] {
  const seen = new Set<string>();
  const currencies: { code: string; name: string; symbol: string }[] = [];
  for (const config of COUNTRY_PAYMENT_CONFIGS) {
    if (!seen.has(config.currency)) {
      seen.add(config.currency);
      currencies.push({ code: config.currency, name: config.currency, symbol: config.currencySymbol });
    }
  }
  return currencies.sort((a, b) => a.code.localeCompare(b.code));
}
