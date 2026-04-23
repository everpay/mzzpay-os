ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS prefer_checkout_subdomain boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.merchants.prefer_checkout_subdomain IS
  'When true, payment links for this merchant are generated against checkout.mzzpay.io. When false (default), they use the apex mzzpay.io/checkout, which is guaranteed to preserve query strings.';