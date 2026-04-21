import { describe, it, expect } from "vitest";
import { findConflicts, validateRoutingRule, type RoutingRule } from "./routing-rules-validation";

const M = "merchant-1";
const base = (over: Partial<RoutingRule> = {}): RoutingRule => ({
  merchant_id: M, priority: 0, active: true, currency_match: [], amount_min: null, amount_max: null, ...over,
});

describe("routing-rule validation", () => {
  it("flags two unbounded rules at same priority as conflicting", () => {
    const existing = [base({ id: "a" })];
    expect(findConflicts(base(), existing)).toHaveLength(1);
  });

  it("ignores rules at a different priority", () => {
    const existing = [base({ id: "a", priority: 1 })];
    expect(findConflicts(base({ priority: 2 }), existing)).toHaveLength(0);
  });

  it("ignores rules with disjoint currencies", () => {
    const existing = [base({ id: "a", currency_match: ["USD"] })];
    expect(findConflicts(base({ currency_match: ["EUR"] }), existing)).toHaveLength(0);
  });

  it("flags overlapping currency sets", () => {
    const existing = [base({ id: "a", currency_match: ["USD", "EUR"] })];
    expect(findConflicts(base({ currency_match: ["EUR", "GBP"] }), existing)).toHaveLength(1);
  });

  it("ignores non-overlapping amount ranges", () => {
    const existing = [base({ id: "a", amount_min: 0, amount_max: 100 })];
    expect(findConflicts(base({ amount_min: 200, amount_max: 300 }), existing)).toHaveLength(0);
  });

  it("flags overlapping amount ranges", () => {
    const existing = [base({ id: "a", amount_min: 0, amount_max: 100 })];
    expect(findConflicts(base({ amount_min: 50, amount_max: 200 }), existing)).toHaveLength(1);
  });

  it("excludes the rule itself when editing", () => {
    const existing = [base({ id: "a" })];
    expect(findConflicts(base({ id: "a" }), existing)).toHaveLength(0);
  });

  it("ignores inactive rules", () => {
    const existing = [base({ id: "a", active: false })];
    expect(findConflicts(base(), existing)).toHaveLength(0);
  });

  it("scopes to the same merchant only", () => {
    const existing = [base({ id: "a", merchant_id: "merchant-2" })];
    expect(findConflicts(base(), existing)).toHaveLength(0);
  });

  it("validateRoutingRule rejects min > max", () => {
    const v = validateRoutingRule(base({ amount_min: 100, amount_max: 50 }), []);
    expect(v.ok).toBe(false);
  });

  it("validateRoutingRule rejects negative min", () => {
    const v = validateRoutingRule(base({ amount_min: -10 }), []);
    expect(v.ok).toBe(false);
    if (v.ok === false) expect(v.reason).toMatch(/negative/i);
  });

  it("validateRoutingRule rejects negative max", () => {
    const v = validateRoutingRule(base({ amount_max: -5 }), []);
    expect(v.ok).toBe(false);
  });

  it("validateRoutingRule rejects priority below 0", () => {
    const v = validateRoutingRule(base({ priority: -1 }), []);
    expect(v.ok).toBe(false);
  });

  it("validateRoutingRule rejects priority above 1000", () => {
    const v = validateRoutingRule(base({ priority: 1001 }), []);
    expect(v.ok).toBe(false);
  });

  it("validateRoutingRule passes a clean rule", () => {
    expect(validateRoutingRule(base({ priority: 5 }), []).ok).toBe(true);
  });

  it("validateRoutingRule passes priority at boundaries", () => {
    expect(validateRoutingRule(base({ priority: 0 }), []).ok).toBe(true);
    expect(validateRoutingRule(base({ priority: 1000 }), []).ok).toBe(true);
  });
});
