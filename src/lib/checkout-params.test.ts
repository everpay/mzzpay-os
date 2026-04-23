import { describe, it, expect } from "vitest";
import { validateCheckoutParams } from "./checkout-params";

describe("validateCheckoutParams", () => {
  const goodMerchant = "144c0880-4734-43ef-a5aa-40bf382e1012";

  it("accepts a normal payment-link query string", () => {
    const sp = new URLSearchParams({
      currency: "USD",
      ref: "ORD-123",
      merchant_id: goodMerchant,
      amount: "49.99",
    });
    const r = validateCheckoutParams(sp);
    expect(r.isValid).toBe(true);
    expect(r.values.currency).toBe("USD");
    expect(r.values.merchantId).toBe(goodMerchant);
    expect(r.values.amount).toBe("49.99");
  });

  it("flags a missing merchant_id as an error", () => {
    const r = validateCheckoutParams(new URLSearchParams({ currency: "USD" }));
    expect(r.isValid).toBe(false);
    expect(r.issues.some((i) => i.field === "merchant_id" && i.severity === "error")).toBe(true);
  });

  it("rejects an unsupported currency", () => {
    const r = validateCheckoutParams(
      new URLSearchParams({ currency: "XYZ", merchant_id: goodMerchant }),
    );
    expect(r.isValid).toBe(false);
    expect(r.issues.some((i) => i.field === "currency")).toBe(true);
  });

  it("rejects relative success_url", () => {
    const r = validateCheckoutParams(
      new URLSearchParams({
        currency: "USD",
        merchant_id: goodMerchant,
        success_url: "/thanks",
      }),
    );
    expect(r.isValid).toBe(false);
    expect(r.issues.some((i) => i.field === "success_url")).toBe(true);
  });

  it("warns on missing ref but stays valid", () => {
    const r = validateCheckoutParams(
      new URLSearchParams({ currency: "USD", merchant_id: goodMerchant }),
    );
    expect(r.isValid).toBe(true);
    expect(r.issues.some((i) => i.field === "ref" && i.severity === "warn")).toBe(true);
  });

  it("normalizes method aliases", () => {
    const r = validateCheckoutParams(
      new URLSearchParams({
        currency: "EUR",
        merchant_id: goodMerchant,
        method: "open_banking",
      }),
    );
    expect(r.values.method).toBe("openbanking");
  });

  it("decodes percent-encoded description and email", () => {
    const sp = new URLSearchParams();
    sp.set("currency", "USD");
    sp.set("merchant_id", goodMerchant);
    sp.set("description", encodeURIComponent("Hello world & friends"));
    sp.set("email", encodeURIComponent("buyer@example.com"));
    const r = validateCheckoutParams(sp);
    expect(r.values.description).toBe("Hello world & friends");
    expect(r.values.email).toBe("buyer@example.com");
  });
});
