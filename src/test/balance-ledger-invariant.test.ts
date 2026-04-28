/**
 * Balance integrity: for every (merchant, currency) the `accounts.balance`
 * column MUST equal the signed sum of `ledger_entries` (credits − debits).
 * Any drift indicates the dashboard is showing stale or wrong numbers and
 * needs a reconciliation run.
 *
 * Skipped when no service role key is present (local dev without secrets).
 * In CI / managed-DB sessions this runs against the real DB.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  "";

describe.skipIf(!url || !serviceKey)(
  "accounts.balance == sum(ledger_entries) per (merchant, currency)",
  () => {
    const admin = createClient(url!, serviceKey);

    it("derived balances match for all currencies", async () => {
      const { data: accounts, error } = await admin
        .from("accounts")
        .select("id, merchant_id, currency, balance");
      expect(error).toBeNull();
      if (!accounts || accounts.length === 0) return;

      const { data: entries } = await admin
        .from("ledger_entries")
        .select("account_id, entry_type, amount");

      const sums = new Map<string, number>();
      for (const e of entries || []) {
        const cur = sums.get(e.account_id as string) || 0;
        const sign = e.entry_type === "credit" ? 1 : -1;
        sums.set(e.account_id as string, cur + sign * Number(e.amount));
      }

      const drift: Array<{ account_id: string; balance: number; ledger: number }> = [];
      for (const a of accounts) {
        const ledger = sums.get(a.id as string) || 0;
        if (Math.abs(Number(a.balance) - ledger) > 0.005) {
          drift.push({
            account_id: a.id as string,
            balance: Number(a.balance),
            ledger,
          });
        }
      }

      // Surface drift in the failure message so operators see exactly which
      // accounts need reconciliation.
      expect(
        drift,
        `Accounts with balance/ledger drift: ${JSON.stringify(drift)}`,
      ).toEqual([]);
    });
  },
);
