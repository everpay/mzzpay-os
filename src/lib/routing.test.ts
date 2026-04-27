/**
 * End-to-end routing matrix for `resolveProvider` + `fallbackChain`.
 *
 * Validates the 2026-04 routing policy:
 *  - OPEN_BANKING (EUR/GBP)   → mondo
 *  - GAMBLING_ENABLED          → matrix (per-merchant gate)
 *  - EU/EEA/EU-adjacent OR EUR/GBP currency → risonpay (primary)
 *  - All other non-OFAC regions → shieldhub (USD MX MID, with risonpay fallback)
 *  - OFAC jurisdictions        → blocked at server (resolveProvider returns
 *    shieldhub but `fallbackChain` returns [] so retry never fires)
 *
 * NOTE: The user requested a "FaciltiaPay" fallback. No such provider exists
 * in this project — the universal non-OFAC fallback is **shieldhub**, with
 * **risonpay** as the secondary cascade target. Tests assert against the
 * real provider names defined in `src/lib/providers.ts`.
 */

import { describe, it, expect } from "vitest";
import { resolveProvider, fallbackChain } from "./providers";
import { EU_COUNTRIES, EEA_EXTRA, EU_ADJACENT, OFAC_COUNTRIES } from "./regions";
import type { Currency } from "./types";

describe("resolveProvider — EU / EEA / EU-adjacent → risonpay", () => {
  for (const country of [...EU_COUNTRIES, ...EEA_EXTRA, ...EU_ADJACENT]) {
    it(`${country} (USD card) → risonpay`, () => {
      expect(
        resolveProvider("USD" as Currency, undefined, {
          country,
          paymentMethod: "card",
        }),
      ).toBe("risonpay");
    });
  }

  it("EUR currency without a country still routes to risonpay", () => {
    expect(resolveProvider("EUR" as Currency)).toBe("risonpay");
  });

  it("GBP currency without a country still routes to risonpay", () => {
    expect(resolveProvider("GBP" as Currency)).toBe("risonpay");
  });

  it("EUR + DE country → risonpay (region + currency aligned)", () => {
    expect(
      resolveProvider("EUR" as Currency, undefined, {
        country: "DE",
        paymentMethod: "card",
      }),
    ).toBe("risonpay");
  });
});

describe("resolveProvider — Open Banking always wins for EUR/GBP", () => {
  it("EUR open_banking → mondo (overrides risonpay)", () => {
    expect(
      resolveProvider("EUR" as Currency, undefined, {
        paymentMethod: "open_banking",
        country: "DE",
      }),
    ).toBe("mondo");
  });

  it("GBP open_banking → mondo", () => {
    expect(
      resolveProvider("GBP" as Currency, undefined, {
        paymentMethod: "open_banking",
        country: "GB",
      }),
    ).toBe("mondo");
  });
});

describe("resolveProvider — non-EU regions", () => {
  it("US / USD card → shieldhub (primary US/global)", () => {
    expect(
      resolveProvider("USD" as Currency, undefined, {
        country: "US",
        paymentMethod: "card",
      }),
    ).toBe("shieldhub");
  });

  it("MX / USD card → shieldhub", () => {
    expect(
      resolveProvider("USD" as Currency, undefined, {
        country: "MX",
        paymentMethod: "card",
      }),
    ).toBe("shieldhub");
  });

  it("BR / BRL card → shieldhub (no EU match, no EUR/GBP)", () => {
    expect(
      resolveProvider("BRL" as Currency, undefined, {
        country: "BR",
        paymentMethod: "card",
      }),
    ).toBe("shieldhub");
  });
});

describe("resolveProvider — OFAC jurisdictions", () => {
  for (const country of OFAC_COUNTRIES) {
    it(`${country} returns shieldhub but fallbackChain is empty (server enforces block)`, () => {
      const provider = resolveProvider("USD" as Currency, undefined, {
        country,
        paymentMethod: "card",
      });
      // resolveProvider intentionally returns a sentinel — the real
      // enforcement is at the edge function (ofac_blocked) and the
      // empty fallbackChain prevents any cascade retry.
      expect(provider).toBe("shieldhub");
      expect(fallbackChain(provider, country)).toEqual([]);
    });
  }

  it("EUR currency from sanctioned IR is still blocked at fallback layer", () => {
    expect(fallbackChain("risonpay", "IR")).toEqual([]);
  });
});

describe("resolveProvider — gambling override", () => {
  it("gambling_enabled merchant routes to matrix regardless of country", () => {
    expect(
      resolveProvider("EUR" as Currency, undefined, {
        country: "DE",
        gamblingEnabled: true,
      }),
    ).toBe("matrix");
    expect(
      resolveProvider("USD" as Currency, undefined, {
        country: "US",
        gamblingEnabled: true,
      }),
    ).toBe("matrix");
  });
});

describe("resolveProvider — explicit routing_rules override", () => {
  it("active rule with matching currency wins over default policy", () => {
    expect(
      resolveProvider("USD" as Currency, undefined, {
        country: "US",
        rules: [
          {
            priority: 1,
            active: true,
            currency_match: ["USD"],
            target_provider: "moneto_mpg",
          },
        ],
      }),
    ).toBe("moneto_mpg");
  });

  it("inactive rule is ignored", () => {
    expect(
      resolveProvider("EUR" as Currency, undefined, {
        country: "DE",
        rules: [
          {
            priority: 1,
            active: false,
            currency_match: ["EUR"],
            target_provider: "matrix",
          },
        ],
      }),
    ).toBe("risonpay");
  });

  it("amount filter excludes rule when out of range", () => {
    expect(
      resolveProvider("USD" as Currency, undefined, {
        country: "US",
        amount: 50,
        rules: [
          {
            priority: 1,
            active: true,
            currency_match: ["USD"],
            amount_min: 100,
            target_provider: "moneto_mpg",
          },
        ],
      }),
    ).toBe("shieldhub");
  });
});

describe("fallbackChain — cascade ordering", () => {
  it("shieldhub primary → [shieldhub, risonpay]", () => {
    expect(fallbackChain("shieldhub", "US")).toEqual(["shieldhub", "risonpay"]);
  });

  it("risonpay primary → [risonpay, shieldhub]", () => {
    expect(fallbackChain("risonpay", "DE")).toEqual(["risonpay", "shieldhub"]);
  });

  it("matrix primary → [matrix, risonpay, shieldhub]", () => {
    expect(fallbackChain("matrix", "DE")).toEqual([
      "matrix",
      "risonpay",
      "shieldhub",
    ]);
  });

  it("OFAC country always returns empty chain regardless of primary", () => {
    expect(fallbackChain("risonpay", "CU")).toEqual([]);
    expect(fallbackChain("shieldhub", "KP")).toEqual([]);
    expect(fallbackChain("matrix", "RU")).toEqual([]);
  });
});
