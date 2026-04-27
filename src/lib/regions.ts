/**
 * Geographic groupings used by the routing engine.
 *
 * - EU: 27 EU member states (ISO-2)
 * - EEA_EXTRA: Iceland, Liechtenstein, Norway (EEA but not EU)
 * - EU_ADJACENT: UK + Switzerland + microstates often bundled with EU acquirers
 * - OFAC: U.S. Treasury sanctioned/embargoed jurisdictions — must NEVER route
 *   to any acquirer regardless of fallback policy.
 *
 * Keep this list flat (just ISO-2 codes) so it can be used both in the
 * browser and in Deno edge functions without bundler tricks.
 */

export const EU_COUNTRIES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
  "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
] as const;

export const EEA_EXTRA = ["IS","LI","NO"] as const;

export const EU_ADJACENT = ["GB","CH","MC","SM","VA","AD"] as const;

/** OFAC comprehensively sanctioned jurisdictions. */
export const OFAC_COUNTRIES = [
  "CU", // Cuba
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
  // Disputed / regional sanctions
  "RU", // Russia
  "BY", // Belarus
  "VE", // Venezuela
  "MM", // Myanmar
] as const;

export function isEuOrEea(country?: string | null): boolean {
  if (!country) return false;
  const c = country.toUpperCase();
  return (EU_COUNTRIES as readonly string[]).includes(c)
    || (EEA_EXTRA as readonly string[]).includes(c)
    || (EU_ADJACENT as readonly string[]).includes(c);
}

export function isOfac(country?: string | null): boolean {
  if (!country) return false;
  return (OFAC_COUNTRIES as readonly string[]).includes(country.toUpperCase());
}
