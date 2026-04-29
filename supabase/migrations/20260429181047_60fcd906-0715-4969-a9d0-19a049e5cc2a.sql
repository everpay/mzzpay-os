
-- Add lifecycle columns to payment_methods
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text,
  ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS network_token_status text,
  ADD COLUMN IF NOT EXISTS card_updater_enabled boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_methods_status_check') THEN
    ALTER TABLE public.payment_methods
      ADD CONSTRAINT payment_methods_status_check
      CHECK (status IN ('active','inactive','revoked','expired','rotated'));
  END IF;
END $$;

-- Token events table
CREATE TABLE IF NOT EXISTS public.token_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.payment_methods(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_token_events_token ON public.token_events(token_id);

ALTER TABLE public.token_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own token events" ON public.token_events;
CREATE POLICY "Users view own token events"
ON public.token_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.payment_methods pm
    JOIN public.customers c ON c.id = pm.customer_id
    JOIN public.merchants m ON m.id = c.merchant_id
    WHERE pm.id = token_events.token_id AND m.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users insert own token events" ON public.token_events;
CREATE POLICY "Users insert own token events"
ON public.token_events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.payment_methods pm
    JOIN public.customers c ON c.id = pm.customer_id
    JOIN public.merchants m ON m.id = c.merchant_id
    WHERE pm.id = token_events.token_id AND m.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

-- Ledger-derived balance helper
CREATE OR REPLACE FUNCTION public.merchant_account_balance(_account_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
  FROM public.ledger_entries le
  JOIN public.accounts a ON a.id = le.account_id
  JOIN public.merchants m ON m.id = a.merchant_id
  WHERE le.account_id = _account_id
    AND (m.user_id = auth.uid() OR public.is_admin(auth.uid()))
$$;
