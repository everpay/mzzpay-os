-- 1) Add new role enum values (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'support'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'support';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'compliance_officer'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'compliance_officer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employee'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'employee';
  END IF;
END$$;

-- 2) retry_settings
CREATE TABLE IF NOT EXISTS public.retry_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  backoff_strategy text NOT NULL DEFAULT 'exponential'
    CHECK (backoff_strategy IN ('linear','exponential','fibonacci')),
  backoff_seconds integer NOT NULL DEFAULT 60 CHECK (backoff_seconds >= 1),
  retry_on_codes text[] NOT NULL DEFAULT ARRAY['insufficient_funds','do_not_honor','try_again_later']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.retry_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage retry_settings" ON public.retry_settings;
CREATE POLICY "admins manage retry_settings" ON public.retry_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "merchants read own retry_settings" ON public.retry_settings;
CREATE POLICY "merchants read own retry_settings" ON public.retry_settings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid()));

-- 3) platform_integrations
CREATE TABLE IF NOT EXISTS public.platform_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'plugin',
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage platform_integrations" ON public.platform_integrations;
CREATE POLICY "admins manage platform_integrations" ON public.platform_integrations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- 4) liquidity_wallets
CREATE TABLE IF NOT EXISTS public.liquidity_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  wallet_type text NOT NULL CHECK (wallet_type IN ('bank','crypto','virtual')),
  currency text NOT NULL,
  account_holder text,
  bank_name text,
  routing_number text,
  account_last4 text,
  iban text,
  swift_bic text,
  crypto_network text,
  crypto_address text,
  balance numeric(20,4) NOT NULL DEFAULT 0,
  pending_balance numeric(20,4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liquidity_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage liquidity_wallets" ON public.liquidity_wallets;
CREATE POLICY "admins manage liquidity_wallets" ON public.liquidity_wallets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- 5) acquirers (skipped if exists; only RLS applied)
CREATE TABLE IF NOT EXISTS public.acquirers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  country text,
  active boolean NOT NULL DEFAULT true,
  success_rate numeric(5,2) DEFAULT 0,
  avg_latency_ms integer DEFAULT 0,
  supported_currencies text[] DEFAULT ARRAY[]::text[],
  supported_methods text[] DEFAULT ARRAY[]::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.acquirers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "everyone reads acquirers" ON public.acquirers;
CREATE POLICY "everyone reads acquirers" ON public.acquirers
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage acquirers" ON public.acquirers;
CREATE POLICY "admins manage acquirers" ON public.acquirers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- 6) processor_fee_profiles
CREATE TABLE IF NOT EXISTS public.processor_fee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  percentage_fee numeric(5,3) NOT NULL DEFAULT 2.9,
  fixed_fee numeric(10,2) NOT NULL DEFAULT 0.30,
  chargeback_fee numeric(10,2) NOT NULL DEFAULT 15,
  refund_fee numeric(10,2) NOT NULL DEFAULT 0,
  settlement_days integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, provider, currency)
);
ALTER TABLE public.processor_fee_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage fee profiles" ON public.processor_fee_profiles;
CREATE POLICY "admins manage fee profiles" ON public.processor_fee_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "merchants read own fees" ON public.processor_fee_profiles;
CREATE POLICY "merchants read own fees" ON public.processor_fee_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid()));

-- 7) merchant_acquirer_mids
CREATE TABLE IF NOT EXISTS public.merchant_acquirer_mids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  acquirer_id uuid NOT NULL REFERENCES public.acquirers(id) ON DELETE CASCADE,
  mid text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, acquirer_id, mid)
);
ALTER TABLE public.merchant_acquirer_mids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage mids" ON public.merchant_acquirer_mids;
CREATE POLICY "admins manage mids" ON public.merchant_acquirer_mids
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- updated_at triggers (search_path-safe)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['retry_settings','platform_integrations','liquidity_wallets','acquirers','processor_fee_profiles']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I; CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END$$;