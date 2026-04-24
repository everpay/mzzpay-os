ALTER TABLE public.payment_processors
  ADD COLUMN IF NOT EXISTS acquirer_country text,
  ADD COLUMN IF NOT EXISTS acquirer_descriptor text,
  ADD COLUMN IF NOT EXISTS default_currency text,
  ADD COLUMN IF NOT EXISTS flow_type text,
  ADD COLUMN IF NOT EXISTS supported_brands text[];

INSERT INTO public.payment_processors
  (name, provider_type, is_active, acquirer_country, acquirer_descriptor, default_currency, flow_type, supported_brands)
VALUES
  ('shieldhub', 'direct_api', true, 'MX', 'AXP*FER*AXP*FERES', 'USD', '3DS', ARRAY['visa','mastercard'])
ON CONFLICT (name) DO UPDATE SET
  acquirer_country     = EXCLUDED.acquirer_country,
  acquirer_descriptor  = EXCLUDED.acquirer_descriptor,
  default_currency     = EXCLUDED.default_currency,
  flow_type            = EXCLUDED.flow_type,
  supported_brands     = EXCLUDED.supported_brands,
  is_active            = true;

INSERT INTO public.payment_processors
  (name, provider_type, is_active, acquirer_country, acquirer_descriptor, default_currency, flow_type, supported_brands)
VALUES
  ('matrix', 'direct_api', true, 'EU', NULL, 'EUR', '3DS', ARRAY['visa','mastercard','amex','unionpay'])
ON CONFLICT (name) DO UPDATE SET
  acquirer_country = COALESCE(public.payment_processors.acquirer_country, EXCLUDED.acquirer_country),
  default_currency = COALESCE(public.payment_processors.default_currency, EXCLUDED.default_currency),
  flow_type        = COALESCE(public.payment_processors.flow_type, EXCLUDED.flow_type),
  supported_brands = COALESCE(public.payment_processors.supported_brands, EXCLUDED.supported_brands);