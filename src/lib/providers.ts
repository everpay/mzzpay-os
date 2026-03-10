import { Currency, Provider } from './types';

interface ProviderConfig {
  name: string;
  displayName: string;
  supportedCurrencies: Currency[];
  regions: string[];
  methods: string[];
}

export const providerConfigs: Record<Provider, ProviderConfig> = {
  facilitapay: {
    name: 'facilitapay',
    displayName: 'FacilitaPay',
    supportedCurrencies: ['BRL', 'MXN', 'COP'],
    regions: ['BR', 'MX', 'CO'],
    methods: ['PIX', 'Boleto', 'SPEI', 'PSE'],
  },
  mondo: {
    name: 'mondo',
    displayName: 'MzzPay EUR',
    supportedCurrencies: ['EUR', 'GBP'],
    regions: ['EU', 'UK'],
    methods: ['SEPA', 'Faster Payments', 'SEPA Direct Debit', 'Card'],
  },
  stripe: {
    name: 'stripe',
    displayName: 'Stripe',
    supportedCurrencies: ['USD'],
    regions: ['US'],
    methods: ['Card', 'ACH'],
  },
  mzzpay: {
    name: 'mzzpay',
    displayName: 'MzzPay USD',
    supportedCurrencies: ['USD', 'BRL', 'MXN', 'COP'],
    regions: ['US', 'GLOBAL'],
    methods: ['Card', 'ACH', 'PIX', 'Boleto'],
  },
  moneto: {
    name: 'moneto',
    displayName: 'Moneto',
    supportedCurrencies: ['CAD'],
    regions: ['CA'],
    methods: ['Wallet', 'Bank Transfer'],
  },
};

export function resolveProvider(currency: Currency, region?: string): Provider {
  if (['EUR', 'GBP'].includes(currency)) return 'mondo';
  return 'mzzpay';
}

export function getProviderColor(provider: Provider): string {
  switch (provider) {
    case 'facilitapay': return 'hsl(var(--chart-4))';
    case 'mondo': return 'hsl(var(--chart-3))';
    case 'stripe': return 'hsl(var(--chart-1))';
    case 'mzzpay': return 'hsl(var(--chart-2))';
    case 'moneto': return 'hsl(var(--chart-5))';
    default: return 'hsl(var(--chart-1))';
  }
}
