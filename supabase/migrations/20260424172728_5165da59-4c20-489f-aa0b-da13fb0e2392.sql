CREATE TABLE IF NOT EXISTS public.card_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('matrix','shieldhub')),
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  scenario text NOT NULL,
  card_last4 text,
  card_brand text,
  currency text,
  amount numeric,
  upstream_http_status int,
  result_status text,
  result_code text,
  error_message text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_test_runs_merchant ON public.card_test_runs(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_test_runs_batch ON public.card_test_runs(batch_id);

ALTER TABLE public.card_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view their own card test runs"
ON public.card_test_runs FOR SELECT
TO authenticated
USING (
  merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  OR public.is_admin(auth.uid())
);

-- No client INSERT/UPDATE/DELETE — only service role writes.