import { describe, it, expect, beforeEach } from "vitest";
import { buildCheckoutUrl, currentCheckoutHost } from "./checkout-url";

describe("buildCheckoutUrl", () => {
  beforeEach(() => {
    try {
      window.localStorage.removeItem("mzz:useCheckoutSubdomain");
    } catch {
      /* noop */
    }
  });

  it("defaults to apex when no preference is set", () => {
    const url = buildCheckoutUrl({ currency: "USD", merchantId: "abc" });
    expect(url.startsWith("https://mzzpay.io/checkout?")).toBe(true);
    expect(url).toContain("currency=USD");
    expect(url).toContain("merchant_id=abc");
  });

  it("uses subdomain when merchant preference is true", () => {
    const url = buildCheckoutUrl(
      { currency: "EUR", merchantId: "abc", ref: "X" },
      { merchantPreference: true },
    );
    expect(url.startsWith("https://checkout.mzzpay.io/?")).toBe(true);
    expect(url).toContain("ref=X");
  });

  it("explicit preferSubdomain=false beats merchant pref true", () => {
    const url = buildCheckoutUrl(
      { currency: "EUR", merchantId: "abc" },
      { merchantPreference: true, preferSubdomain: false },
    );
    expect(url.startsWith("https://mzzpay.io/checkout?")).toBe(true);
  });

  it("currentCheckoutHost reflects the preference", () => {
    expect(currentCheckoutHost({ merchantPreference: true })).toBe(
      "checkout.mzzpay.io",
    );
    expect(currentCheckoutHost({ merchantPreference: false })).toBe("mzzpay.io");
  });
});
