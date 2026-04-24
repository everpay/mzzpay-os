-- Remove FacilitaPay fee rows
DELETE FROM public.provider_fees WHERE provider = 'facilitapay';

-- Tighten provider check on transactions to drop facilitapay
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_provider_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_provider_check
  CHECK (provider = ANY (ARRAY['mondo','stripe','mzzpay','moneto','moneto_mpg','shieldhub','matrix']));