-- 1) Create tables first (idempotent)
CREATE TABLE IF NOT EXISTS public.acquirers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  api_endpoint text,
  active boolean NOT NULL DEFAULT true,
  routing_weight numeric(5,2) DEFAULT 100,
  success_rate numeric(5,2) DEFAULT 0,
  avg_latency_ms integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_acquirer_mids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  acquirer_id uuid NOT NULL REFERENCES public.acquirers(id) ON DELETE CASCADE,
  mid text NOT NULL,
  routing_weight numeric(5,2) DEFAULT 100,
  priority integer DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  currency_match text[] DEFAULT '{}',
  amount_min numeric DEFAULT NULL,
  amount_max numeric DEFAULT NULL,
  target_provider text NOT NULL,
  fallback_provider text DEFAULT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.processor_fee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  percentage_fee numeric NOT NULL DEFAULT 2.9,
  fixed_fee numeric NOT NULL DEFAULT 0.30,
  chargeback_fee numeric NOT NULL DEFAULT 15.00,
  refund_fee numeric NOT NULL DEFAULT 0,
  settlement_days integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, provider, currency)
);

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  provider text NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  response_code text,
  response_message text,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Enable RLS
ALTER TABLE public.acquirers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_acquirer_mids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processor_fee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

-- 3) Drop any pre-existing policies (now safe - tables exist)
DROP POLICY IF EXISTS "Authenticated can view acquirers" ON public.acquirers;
DROP POLICY IF EXISTS "Admins manage acquirers" ON public.acquirers;
DROP POLICY IF EXISTS "Anyone can view acquirers" ON public.acquirers;

DROP POLICY IF EXISTS "Merchants view own MIDs" ON public.merchant_acquirer_mids;
DROP POLICY IF EXISTS "Admins manage MIDs" ON public.merchant_acquirer_mids;
DROP POLICY IF EXISTS "Users can view own MIDs" ON public.merchant_acquirer_mids;
DROP POLICY IF EXISTS "Users can insert own MIDs" ON public.merchant_acquirer_mids;

DROP POLICY IF EXISTS "Merchants view own routing rules" ON public.routing_rules;
DROP POLICY IF EXISTS "Admins manage routing rules" ON public.routing_rules;
DROP POLICY IF EXISTS "Users can view own routing rules" ON public.routing_rules;
DROP POLICY IF EXISTS "Users can insert own routing rules" ON public.routing_rules;
DROP POLICY IF EXISTS "Users can update own routing rules" ON public.routing_rules;
DROP POLICY IF EXISTS "Users can delete own routing rules" ON public.routing_rules;

DROP POLICY IF EXISTS "Merchants view own fee profiles" ON public.processor_fee_profiles;
DROP POLICY IF EXISTS "Admins manage fee profiles" ON public.processor_fee_profiles;
DROP POLICY IF EXISTS "Users can view own fee profiles" ON public.processor_fee_profiles;
DROP POLICY IF EXISTS "Users can insert own fee profiles" ON public.processor_fee_profiles;
DROP POLICY IF EXISTS "Users can update own fee profiles" ON public.processor_fee_profiles;

DROP POLICY IF EXISTS "Merchants view own payment attempts" ON public.payment_attempts;
DROP POLICY IF EXISTS "Admins manage payment attempts" ON public.payment_attempts;
DROP POLICY IF EXISTS "Users can view own payment attempts" ON public.payment_attempts;
DROP POLICY IF EXISTS "Users can insert own payment attempts" ON public.payment_attempts;

-- 4) Create policies
CREATE POLICY "Authenticated can view acquirers" ON public.acquirers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage acquirers" ON public.acquirers FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Merchants view own MIDs" ON public.merchant_acquirer_mids FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_acquirer_mids.merchant_id AND m.user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins manage MIDs" ON public.merchant_acquirer_mids FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Merchants view own routing rules" ON public.routing_rules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants m WHERE m.id = routing_rules.merchant_id AND m.user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins manage routing rules" ON public.routing_rules FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Merchants view own fee profiles" ON public.processor_fee_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants m WHERE m.id = processor_fee_profiles.merchant_id AND m.user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins manage fee profiles" ON public.processor_fee_profiles FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Merchants view own payment attempts" ON public.payment_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM transactions t JOIN merchants m ON m.id = t.merchant_id
            WHERE t.id = payment_attempts.transaction_id AND m.user_id = auth.uid())
    OR is_admin(auth.uid())
  );
CREATE POLICY "Admins manage payment attempts" ON public.payment_attempts FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 5) Triggers
DROP TRIGGER IF EXISTS update_acquirers_updated_at ON public.acquirers;
CREATE TRIGGER update_acquirers_updated_at BEFORE UPDATE ON public.acquirers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_merchant_acquirer_mids_updated_at ON public.merchant_acquirer_mids;
CREATE TRIGGER update_merchant_acquirer_mids_updated_at BEFORE UPDATE ON public.merchant_acquirer_mids FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_routing_rules_updated_at ON public.routing_rules;
CREATE TRIGGER update_routing_rules_updated_at BEFORE UPDATE ON public.routing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_processor_fee_profiles_updated_at ON public.processor_fee_profiles;
CREATE TRIGGER update_processor_fee_profiles_updated_at BEFORE UPDATE ON public.processor_fee_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Seed default acquirers
INSERT INTO public.acquirers (name, country, active, routing_weight, success_rate, avg_latency_ms)
SELECT * FROM (VALUES
  ('mzzpay_eur', 'EU', true, 100::numeric, 96.5::numeric, 380),
  ('mzzpay_usd', 'US', true, 100::numeric, 95.2::numeric, 420),
  ('matrix', 'Global', true, 80::numeric, 93.1::numeric, 510),
  ('moneto', 'Global', true, 70::numeric, 92.4::numeric, 540)
) AS v(name, country, active, routing_weight, success_rate, avg_latency_ms)
WHERE NOT EXISTS (SELECT 1 FROM public.acquirers WHERE acquirers.name = v.name);