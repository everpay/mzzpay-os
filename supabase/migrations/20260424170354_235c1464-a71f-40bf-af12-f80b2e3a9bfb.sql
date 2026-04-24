
-- Allow new providers
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_provider_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_provider_check
  CHECK (provider = ANY (ARRAY['facilitapay','mondo','stripe','mzzpay','moneto','shieldhub','matrix']));

-- Webhook dedup on provider_events
ALTER TABLE public.provider_events
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS webhook_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS provider_events_webhook_dedup_idx
  ON public.provider_events (provider, webhook_event_id)
  WHERE webhook_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS provider_events_idem_idx
  ON public.provider_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Reconciliation runs
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  transactions_checked integer NOT NULL DEFAULT 0,
  mismatches_found integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  notes jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reconciliation runs"
  ON public.reconciliation_runs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Mismatches
CREATE TABLE IF NOT EXISTS public.reconciliation_mismatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE,
  mismatch_type text NOT NULL,
  expected_amount numeric,
  actual_amount numeric,
  expected_currency text,
  actual_currency text,
  fx_rate_expected numeric,
  fx_rate_actual numeric,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT recon_mismatch_type_check CHECK (mismatch_type = ANY (ARRAY['amount','fx_rate','currency','settlement','missing_ledger','missing_provider']))
);

ALTER TABLE public.reconciliation_mismatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reconciliation mismatches"
  ON public.reconciliation_mismatches FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Merchants can view own reconciliation mismatches"
  ON public.reconciliation_mismatches FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.merchants m
                 WHERE m.id = reconciliation_mismatches.merchant_id AND m.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS recon_mismatch_run_idx ON public.reconciliation_mismatches(run_id);
CREATE INDEX IF NOT EXISTS recon_mismatch_tx_idx ON public.reconciliation_mismatches(transaction_id);
CREATE INDEX IF NOT EXISTS recon_mismatch_status_idx ON public.reconciliation_mismatches(status);
