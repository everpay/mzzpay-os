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

-- 2) retry_settings (already exists; ensure)
CREATE TABLE IF NOT EXISTS public.retry_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  backoff_strategy text NOT NULL DEFAULT 'exponential'
    CHECK (backoff_strategy IN ('linear','exponential','fibonacci')),
  backoff_seconds integer NOT NULL DEFAULT 60 CHECK (backoff_seconds >= 1),
  retry_decline_codes jsonb DEFAULT '["insufficient_funds","do_not_honor","try_again_later"]'::jsonb,
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
DROP POLICY IF EXISTS "merchants update own retry_settings" ON public.retry_settings;
CREATE POLICY "merchants update own retry_settings" ON public.retry_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid()));

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

-- 4) liquidity_wallets (already exists; ensure RLS)
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

-- 5) acquirers (table already exists with different schema; ensure RLS only)
ALTER TABLE public.acquirers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "everyone reads acquirers" ON public.acquirers;
CREATE POLICY "everyone reads acquirers" ON public.acquirers
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage acquirers" ON public.acquirers;
CREATE POLICY "admins manage acquirers" ON public.acquirers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- 6) processor_fee_profiles (already exists; ensure RLS)
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

-- 7) merchant_acquirer_mids (table exists; ensure RLS)
ALTER TABLE public.merchant_acquirer_mids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage mids" ON public.merchant_acquirer_mids;
CREATE POLICY "admins manage mids" ON public.merchant_acquirer_mids
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- updated_at triggers
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

-- ============================================================
-- Allow admins to view all user_roles (fixes Users page)
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- Provision the admin@mzzpay.io super_admin (idempotent)
-- Adapted to this project's profiles schema (user_id, display_name)
-- ============================================================
DO $$
DECLARE
  v_user_id uuid;
  v_email   text := 'admin@mzzpay.io';
  v_password text := 'MB.78788.wer';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Mzzpay Super Admin"}'::jsonb,
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email', v_user_id::text,
      now(), now(), now()
    );

    RAISE NOTICE 'Created auth user % (%)', v_email, v_user_id;
  ELSE
    RAISE NOTICE 'Auth user % already exists (%)', v_email, v_user_id;
  END IF;

  -- profiles row (this project: user_id, display_name)
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (v_user_id, 'Mzzpay Super Admin')
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name, updated_at = now();

  -- super_admin role
  DELETE FROM public.user_roles WHERE user_id = v_user_id AND role <> 'super_admin'::app_role;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'super_admin'::app_role)
  ON CONFLICT DO NOTHING;
END $$;