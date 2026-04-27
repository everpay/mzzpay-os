import { Currency, Provider } from './types';
import { processorLabel } from './processor-labels';
import { isEuOrEea, isOfac } from './regions';

interface ProviderConfig {
  name: string;
  displayName: string;
  supportedCurrencies: Currency[];
  regions: string[];
  methods: string[];
}

export const providerConfigs: Record<Provider, ProviderConfig> = {
  mondo: {
    name: 'mondo',
    displayName: processorLabel('mondo'),
    supportedCurrencies: ['EUR', 'GBP'],
    regions: ['EU', 'UK'],
    methods: ['SEPA', 'Faster Payments', 'SEPA Direct Debit', 'Card'],
  },
  stripe: {
    name: 'stripe',
    displayName: processorLabel('stripe'),
    supportedCurrencies: ['USD'],
    regions: ['US'],
    methods: ['Card', 'ACH'],
  },
  mzzpay: {
    name: 'mzzpay',
    displayName: processorLabel('mzzpay'),
    supportedCurrencies: ['USD', 'BRL', 'MXN', 'COP'],
    regions: ['US', 'GLOBAL'],
    methods: ['Card', 'ACH', 'PIX', 'Boleto'],
  },
  moneto: {
    name: 'moneto',
    displayName: processorLabel('moneto'),
    supportedCurrencies: ['CAD'],
    regions: ['CA'],
    methods: ['Wallet', 'Bank Transfer'],
  },
  moneto_mpg: {
    name: 'moneto_mpg',
    displayName: processorLabel('moneto_mpg'),
    supportedCurrencies: ['CAD', 'USD'],
    regions: ['CA', 'US'],
    methods: ['Card'],
  },
  matrix: {
    name: 'matrix',
    displayName: processorLabel('matrix'),
    supportedCurrencies: ['EUR', 'USD', 'GBP'],
    regions: ['EU', 'UK', 'GLOBAL'],
    methods: ['Card', 'APM', 'Subscription', 'Oneclick'],
  },
  shieldhub: {
    // Primary 2D card MID. Shares upstream with the legacy `mzzpay` key but
    // is the default acquirer for all card checkouts going forward. 2D only —
    // no 3DS step-up. Use `mondo` (Openbanking EU) for EU 3DS/SCA flows.
    name: 'shieldhub',
    displayName: processorLabel('shieldhub'),
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'MXN', 'BRL', 'COP'],
    regions: ['US', 'GLOBAL'],
    methods: ['Card', '2D'],
  },
  risonpay: {
    name: 'risonpay',
    displayName: processorLabel('risonpay'),
    supportedCurrencies: ['EUR', 'GBP', 'USD'],
    regions: ['EU', 'UK', 'GLOBAL'],
    methods: ['Card', 'APM', 'Bank Transfer', 'Bizum', 'BLIK', 'iDEAL', 'MBWay'],
  },
};

/**
 * Lightweight shape of a `routing_rules` row that the client cares about
 * when previewing the selected processor. Mirrors the merchant-scoped
 * subset of fields used by the routing engine in process-payment.
 */
export interface RoutingRuleLite {
  priority: number;
  active?: boolean | null;
  currency_match?: string[] | null;
  amount_min?: number | null;
  amount_max?: number | null;
  target_provider: string;
  fallback_provider?: string | null;
}

/**
 * Default routing for every checkout/payment form on the platform.
 *
 * Per product decision (2026-04):
 *  - **Shieldhub** is the primary 2D card processor for ALL merchants.
 *  - **Mondo (Openbanking EU)** is offered as an alternative for EU/UK
 *    open-banking and SEPA flows; it is enabled for every merchant.
 *  - **Matrix Partners** is gated behind `merchants.gambling_enabled`
 *    (super_admin only) for casino/lottery/sportsbook/sweepstakes.
 *
 * Per-merchant `routing_rules` overrides take precedence over the default
 * policy (highest priority wins) when a rule's currency/amount filters
 * match the candidate transaction. This MUST stay in sync with the
 * server-side selection logic in `supabase/functions/process-payment`.
 *
 * `paymentMethod` lets callers force open-banking even when the currency
 * would normally route to Shieldhub.
 */
export function resolveProvider(
  currency: Currency,
  region?: string,
  opts?: {
    paymentMethod?: string;
    gamblingEnabled?: boolean;
    amount?: number;
    rules?: RoutingRuleLite[];
    /** ISO-2 billing country — used for region-aware routing. */
    country?: string;
  },
): Provider {
  // 1. Explicit per-merchant override rules win first. We sort ascending by
  // priority (lower number = higher priority — matches the admin UI ordering)
  // and pick the first ACTIVE rule whose filters cover the candidate.
  const rules = (opts?.rules ?? [])
    .filter((r) => r.active !== false)
    .sort((a, b) => Number(a.priority) - Number(b.priority));
  for (const r of rules) {
    const currencies = (r.currency_match ?? []).map((c) => c.toUpperCase());
    if (currencies.length > 0 && !currencies.includes(currency)) continue;
    if (opts?.amount != null) {
      if (r.amount_min != null && opts.amount < Number(r.amount_min)) continue;
      if (r.amount_max != null && opts.amount > Number(r.amount_max)) continue;
    }
    return r.target_provider as Provider;
  }

  // 2. Open banking always takes the Mondo path.
  if (opts?.paymentMethod === 'open_banking') return 'mondo';

  // 3. Gambling-class merchants route to Matrix when admin-enabled.
  if (opts?.gamblingEnabled) return 'matrix';

  const country = (opts?.country || region || '').toUpperCase();

  // 4. Hard block: OFAC jurisdictions never route — caller must reject.
  // We still return a provider here (shieldhub) but the server-side guard
  // in process-payment is the actual enforcement point.
  if (isOfac(country)) return 'shieldhub';

  // 5. EU / EEA / EU-adjacent → RisonPay (primary EU acquirer).
  if (isEuOrEea(country) || ['EUR', 'GBP'].includes(currency)) {
    return 'risonpay';
  }

  // 6. Default — Shieldhub for US/global card volume; RisonPay is the
  // declared fallback for any non-OFAC region without a better fit.
  return 'shieldhub';
}

/**
 * Ordered fallback chain used by retry / cascade logic. Skips OFAC.
 */
export function fallbackChain(
  primary: Provider,
  country?: string,
): Provider[] {
  if (isOfac(country)) return [];
  const chain: Provider[] = [primary];
  // RisonPay is the universal fallback (covers EU + global non-OFAC).
  if (primary !== 'risonpay') chain.push('risonpay');
  if (primary !== 'shieldhub') chain.push('shieldhub');
  return chain;
}

export function getProviderColor(provider: Provider): string {
  switch (provider) {
    case 'mondo': return 'hsl(var(--chart-3))';
    case 'stripe': return 'hsl(var(--chart-1))';
    case 'mzzpay': return 'hsl(var(--chart-2))';
    case 'moneto': return 'hsl(var(--chart-5))';
    case 'moneto_mpg': return 'hsl(var(--chart-5))';
    case 'matrix': return 'hsl(var(--chart-4))';
    case 'shieldhub': return 'hsl(var(--chart-2))';
    default: return 'hsl(var(--chart-1))';
  }
}
