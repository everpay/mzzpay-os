// Inline validation for routing rules: detect overlapping rules within a
// merchant before the admin saves an override. A conflict is two ACTIVE rules
// for the same merchant with the same priority that share at least one
// currency AND have overlapping amount ranges.

export type RoutingRule = {
  id?: string;
  merchant_id: string;
  name?: string | null;
  priority: number;
  active?: boolean;
  currency_match?: string[] | null;
  amount_min?: number | null;
  amount_max?: number | null;
};

const rangesOverlap = (
  aMin: number | null | undefined,
  aMax: number | null | undefined,
  bMin: number | null | undefined,
  bMax: number | null | undefined,
) => {
  const a1 = aMin ?? -Infinity;
  const a2 = aMax ?? Infinity;
  const b1 = bMin ?? -Infinity;
  const b2 = bMax ?? Infinity;
  return a1 <= b2 && b1 <= a2;
};

const currenciesOverlap = (a?: string[] | null, b?: string[] | null) => {
  const A = (a ?? []).map((c) => c.toUpperCase());
  const B = (b ?? []).map((c) => c.toUpperCase());
  if (A.length === 0 || B.length === 0) return true; // empty == "all currencies"
  return A.some((c) => B.includes(c));
};

export function findConflicts(candidate: RoutingRule, existing: RoutingRule[]): RoutingRule[] {
  return existing.filter((r) => {
    if (r.id && candidate.id && r.id === candidate.id) return false;
    if (r.merchant_id !== candidate.merchant_id) return false;
    if (r.active === false || candidate.active === false) return false;
    if (Number(r.priority) !== Number(candidate.priority)) return false;
    if (!currenciesOverlap(r.currency_match, candidate.currency_match)) return false;
    if (!rangesOverlap(r.amount_min, r.amount_max, candidate.amount_min, candidate.amount_max)) return false;
    return true;
  });
}

export function validateRoutingRule(
  candidate: RoutingRule,
  existing: RoutingRule[],
): { ok: true } | { ok: false; reason: string; conflicts: RoutingRule[] } {
  if (!candidate.merchant_id) return { ok: false, reason: "Merchant is required", conflicts: [] };
  if (
    candidate.amount_min != null &&
    candidate.amount_max != null &&
    Number(candidate.amount_min) > Number(candidate.amount_max)
  ) {
    return { ok: false, reason: "Min amount must be less than or equal to max amount", conflicts: [] };
  }
  const conflicts = findConflicts(candidate, existing);
  if (conflicts.length > 0) {
    return {
      ok: false,
      reason: `Overlaps with ${conflicts.length} existing rule${conflicts.length > 1 ? "s" : ""} at the same priority`,
      conflicts,
    };
  }
  return { ok: true };
}
