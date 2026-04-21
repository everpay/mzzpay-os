
ALTER TABLE public.routing_rules ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.processor_fee_profiles ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS routing_rules_merchant_idem_uniq
  ON public.routing_rules (merchant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS fee_profiles_merchant_idem_uniq
  ON public.processor_fee_profiles (merchant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
