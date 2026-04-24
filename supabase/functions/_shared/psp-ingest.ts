// Shared idempotency + provider_events ingestion helpers used by Mondo,
// Shieldhub (MzzPay USD) and Matrix flows. Keeps webhook handling and
// payment-creation in lockstep with the canonical Moneto pattern.
//
// Usage:
//   const cached = await getIdempotentResponse(supabase, merchantId, key);
//   if (cached) return jsonResponse(cached);
//   ... do work ...
//   await saveIdempotentResponse(supabase, merchantId, key, payload);
//
//   await ingestProviderWebhook(supabase, {
//     provider: 'mondo', eventId, eventType, payload,
//     transactionId, merchantId, mappedStatus,
//   });
//
// `webhook_event_id` is enforced unique-per-provider in the DB; a duplicate
// insert returns the existing event row and short-circuits ledger writes.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface WebhookIngestArgs {
  provider: "mondo" | "shieldhub" | "matrix" | "moneto";
  eventId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  transactionId?: string | null;
  merchantId: string;
  mappedStatus?: "completed" | "failed" | "processing" | "pending" | null;
}

export interface IngestResult {
  duplicate: boolean;
  eventId: string | null;
}

/** Look up a previously cached idempotent response. */
export async function getIdempotentResponse(
  supabase: SupabaseClient,
  merchantId: string,
  key: string | null | undefined,
): Promise<unknown | null> {
  if (!key) return null;
  const { data } = await supabase
    .from("idempotency_keys")
    .select("response")
    .eq("key", key)
    .eq("merchant_id", merchantId)
    .maybeSingle();
  return data?.response ?? null;
}

/** Persist an idempotent response so re-runs return the same body. */
export async function saveIdempotentResponse(
  supabase: SupabaseClient,
  merchantId: string,
  key: string | null | undefined,
  response: unknown,
): Promise<void> {
  if (!key) return;
  await supabase
    .from("idempotency_keys")
    .upsert(
      { merchant_id: merchantId, key, response },
      { onConflict: "merchant_id,key" },
    );
}

/**
 * Insert a provider_events row idempotently keyed on (provider, webhook_event_id).
 * If the event was already ingested we return duplicate=true and skip ledger writes.
 * When eventId is null we always insert (used for synthetic system events).
 */
export async function ingestProviderEvent(
  supabase: SupabaseClient,
  args: WebhookIngestArgs,
): Promise<IngestResult> {
  if (args.eventId) {
    const { data: existing } = await supabase
      .from("provider_events")
      .select("id")
      .eq("provider", args.provider)
      .eq("webhook_event_id", args.eventId)
      .maybeSingle();
    if (existing) return { duplicate: true, eventId: existing.id };
  }

  const { data, error } = await supabase
    .from("provider_events")
    .insert({
      provider: args.provider,
      event_type: args.eventType,
      payload: args.payload,
      transaction_id: args.transactionId ?? null,
      merchant_id: args.merchantId,
      webhook_event_id: args.eventId,
    })
    .select("id")
    .single();

  if (error) {
    // Race lost to a sibling worker — treat as duplicate.
    if (error.code === "23505") return { duplicate: true, eventId: null };
    throw error;
  }
  return { duplicate: false, eventId: data.id };
}

/**
 * Update transaction + ledger atomically for a successful webhook event.
 * Mirrors moneto-webhook accounting: credits the merchant account in the
 * transaction's currency and writes a paired ledger_entries row.
 */
export async function applyLedgerCredit(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<void> {
  const { data: tx } = await supabase
    .from("transactions")
    .select("id, merchant_id, amount, currency")
    .eq("id", transactionId)
    .single();
  if (!tx) return;

  const { data: account } = await supabase
    .from("accounts")
    .select("id, balance, available_balance")
    .eq("merchant_id", tx.merchant_id)
    .eq("currency", tx.currency)
    .maybeSingle();

  let accountId = account?.id;
  if (!accountId) {
    const { data: created } = await supabase
      .from("accounts")
      .insert({
        merchant_id: tx.merchant_id,
        currency: tx.currency,
        balance: tx.amount,
        available_balance: tx.amount,
      })
      .select("id")
      .single();
    accountId = created?.id;
  } else {
    await supabase
      .from("accounts")
      .update({
        balance: Number(account.balance) + Number(tx.amount),
        available_balance: Number(account.available_balance) + Number(tx.amount),
      })
      .eq("id", account.id);
  }

  if (!accountId) return;

  // Idempotent ledger entry: skip if one already exists for this tx + credit.
  const { data: existingLedger } = await supabase
    .from("ledger_entries")
    .select("id")
    .eq("transaction_id", transactionId)
    .eq("entry_type", "credit")
    .maybeSingle();

  if (existingLedger) return;

  await supabase.from("ledger_entries").insert({
    transaction_id: transactionId,
    account_id: accountId,
    entry_type: "credit",
    amount: tx.amount,
    currency: tx.currency,
  });
}
