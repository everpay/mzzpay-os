// RLS audit for processor-routing tables.
// Confirms: a merchant logged in as user A only sees their own routing_rules,
// merchant_acquirer_mids, and processor_fee_profiles — and never another
// merchant's records.
//
// Run with:  bun scripts/rls-audit.ts <userA-email> <userA-password>
//        or  bun scripts/rls-audit.ts <userA-email> <userA-password> <userB-email> <userB-password>
//
// Uses VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from .env.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
if (!SUPABASE_URL || !ANON) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const TABLES = ["routing_rules", "merchant_acquirer_mids", "processor_fee_profiles"] as const;

async function loginAndScan(email: string, password: string, label: string) {
  const sb = createClient(SUPABASE_URL, ANON);
  const { data: auth, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !auth.user) throw new Error(`[${label}] login failed: ${error?.message}`);

  const { data: merchant } = await sb.from("merchants").select("id").eq("user_id", auth.user.id).maybeSingle();
  if (!merchant) throw new Error(`[${label}] no merchant row for user`);
  console.log(`\n[${label}] user=${auth.user.id}  merchant=${merchant.id}`);

  for (const t of TABLES) {
    const { data, error: e } = await (sb.from as any)(t).select("merchant_id");
    if (e) {
      console.log(`  ${t}: error ${e.message}`);
      continue;
    }
    const rows = data ?? [];
    const foreign = rows.filter((r: any) => r.merchant_id && r.merchant_id !== merchant.id);
    const status = foreign.length === 0 ? "✅ scoped" : `❌ LEAK (${foreign.length} foreign)`;
    console.log(`  ${t}: ${rows.length} visible row(s) — ${status}`);
    if (foreign.length > 0) {
      console.log(`    foreign merchant_ids:`, [...new Set(foreign.map((r: any) => r.merchant_id))]);
    }
  }

  await sb.auth.signOut();
  return merchant.id;
}

async function main() {
  const [emailA, passA, emailB, passB] = process.argv.slice(2);
  if (!emailA || !passA) {
    console.error("Usage: bun scripts/rls-audit.ts <userA-email> <userA-password> [<userB-email> <userB-password>]");
    process.exit(1);
  }
  console.log("=== RLS audit: processor-routing tables ===");
  await loginAndScan(emailA, passA, "userA");
  if (emailB && passB) await loginAndScan(emailB, passB, "userB");
  console.log("\nDone. Any ❌ above means RLS is letting cross-merchant rows through.");
}

main().catch((e) => { console.error(e); process.exit(1); });
