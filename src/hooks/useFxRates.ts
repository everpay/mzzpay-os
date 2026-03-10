import { useQuery } from '@tanstack/react-query';

interface FxRates {
  [pair: string]: number;
}

// Fetch live-ish FX rates from a free API
async function fetchFxRates(base: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
    if (!res.ok) throw new Error('Failed to fetch FX rates');
    const data = await res.json();
    return data.rates as Record<string, number>;
  } catch {
    // Fallback rates
    const fallback: Record<string, Record<string, number>> = {
      USD: { CAD: 1.38, EUR: 0.92, GBP: 0.79, BRL: 5.15, MXN: 17.20, COP: 4150 },
      CAD: { USD: 0.72, EUR: 0.67, GBP: 0.57, BRL: 3.73, MXN: 12.46 },
      EUR: { USD: 1.09, CAD: 1.50, GBP: 0.86, BRL: 5.61, MXN: 18.73 },
      GBP: { USD: 1.27, CAD: 1.74, EUR: 1.16, BRL: 6.52, MXN: 21.79 },
    };
    return fallback[base] || {};
  }
}

export function useFxRates(baseCurrency: string) {
  return useQuery({
    queryKey: ['fx-rates', baseCurrency],
    queryFn: () => fetchFxRates(baseCurrency),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}

export function convertAmount(amount: number, rates: Record<string, number>, targetCurrency: string): number {
  const rate = rates[targetCurrency];
  if (!rate) return amount;
  return amount * rate;
}
