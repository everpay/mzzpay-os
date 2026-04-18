-- ============================================
-- PHASE 1: Schema for ported merchant features
-- ============================================

-- 1) REFUNDS
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  reason TEXT,
  provider TEXT,
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own refunds" ON public.refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = refunds.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own refunds" ON public.refunds FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = refunds.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own refunds" ON public.refunds FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = refunds.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) BANK_ACCOUNTS
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  bank_name TEXT,
  country TEXT,
  currency TEXT,
  account_number TEXT,
  iban TEXT,
  sort_code TEXT,
  swift_code TEXT,
  account_holder_name TEXT,
  external_account_id TEXT,
  provider TEXT,
  status TEXT DEFAULT 'pending_verification',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own bank accounts" ON public.bank_accounts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = bank_accounts.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own bank accounts" ON public.bank_accounts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = bank_accounts.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own bank accounts" ON public.bank_accounts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = bank_accounts.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants delete own bank accounts" ON public.bank_accounts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = bank_accounts.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RECIPIENTS
CREATE TABLE IF NOT EXISTS public.recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  country TEXT,
  account_type TEXT,
  account_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own recipients" ON public.recipients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = recipients.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own recipients" ON public.recipients FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = recipients.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own recipients" ON public.recipients FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = recipients.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants delete own recipients" ON public.recipients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = recipients.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER recipients_updated_at BEFORE UPDATE ON public.recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  product_type TEXT DEFAULT 'physical',
  sku TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own products" ON public.products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = products.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = products.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own products" ON public.products FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = products.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants delete own products" ON public.products FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = products.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) WEBHOOK_ENDPOINTS
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own webhook endpoints" ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = webhook_endpoints.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own webhook endpoints" ON public.webhook_endpoints FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = webhook_endpoints.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own webhook endpoints" ON public.webhook_endpoints FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = webhook_endpoints.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants delete own webhook endpoints" ON public.webhook_endpoints FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = webhook_endpoints.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER webhook_endpoints_updated_at BEFORE UPDATE ON public.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) WEBHOOK_DELIVERIES
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  response_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own webhook deliveries" ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = webhook_deliveries.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own webhook deliveries" ON public.webhook_deliveries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = webhook_deliveries.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER webhook_deliveries_updated_at BEFORE UPDATE ON public.webhook_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (
    (merchant_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = audit_logs.merchant_id AND m.user_id = auth.uid()))
    OR is_admin(auth.uid())
  );
CREATE POLICY "Service can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- 8) KYC_DOCUMENTS
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  review_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own kyc docs" ON public.kyc_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = kyc_documents.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own kyc docs" ON public.kyc_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = kyc_documents.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Compliance can update kyc docs" ON public.kyc_documents FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'compliance_officer'::app_role));
CREATE TRIGGER kyc_documents_updated_at BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) MERCHANT_RISK_SCORES
CREATE TABLE IF NOT EXISTS public.merchant_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'low',
  factors JSONB DEFAULT '[]'::jsonb,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own risk score" ON public.merchant_risk_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_risk_scores.merchant_id AND m.user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE TRIGGER merchant_risk_scores_updated_at BEFORE UPDATE ON public.merchant_risk_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) THREE_DS_SETTINGS
CREATE TABLE IF NOT EXISTS public.three_ds_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'auto',
  threshold_amount NUMERIC DEFAULT 50,
  exemptions JSONB DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.three_ds_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own 3ds" ON public.three_ds_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = three_ds_settings.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own 3ds" ON public.three_ds_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = three_ds_settings.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own 3ds" ON public.three_ds_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = three_ds_settings.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER three_ds_settings_updated_at BEFORE UPDATE ON public.three_ds_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11) RETRY_SETTINGS
CREATE TABLE IF NOT EXISTS public.retry_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  backoff_strategy TEXT NOT NULL DEFAULT 'exponential',
  backoff_seconds INTEGER NOT NULL DEFAULT 60,
  retry_decline_codes JSONB DEFAULT '["insufficient_funds","do_not_honor","try_again_later"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.retry_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own retry settings" ON public.retry_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = retry_settings.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own retry settings" ON public.retry_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = retry_settings.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own retry settings" ON public.retry_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = retry_settings.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER retry_settings_updated_at BEFORE UPDATE ON public.retry_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12) FX_RATES
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  source TEXT DEFAULT 'manual',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fx_rates_pair_idx ON public.fx_rates(base_currency, quote_currency, fetched_at DESC);
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read fx rates" ON public.fx_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fx rates" ON public.fx_rates FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 13) BIN_CACHE
CREATE TABLE IF NOT EXISTS public.bin_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bin TEXT NOT NULL UNIQUE,
  brand TEXT,
  card_type TEXT,
  card_category TEXT,
  issuer TEXT,
  country TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bin_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read bin cache" ON public.bin_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can insert bin cache" ON public.bin_cache FOR INSERT TO authenticated WITH CHECK (true);

-- 14) LIQUIDITY_POOLS
CREATE TABLE IF NOT EXISTS public.liquidity_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency TEXT NOT NULL,
  region TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  reserved_amount NUMERIC NOT NULL DEFAULT 0,
  provider TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.liquidity_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view pools" ON public.liquidity_pools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage pools" ON public.liquidity_pools FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 15) SETTLEMENTS
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  batch_id TEXT,
  processor TEXT,
  currency TEXT,
  settlement_currency TEXT,
  gross_amount NUMERIC DEFAULT 0,
  fee NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own settlements" ON public.settlements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = settlements.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16) SETTLEMENT_INSTRUCTIONS
CREATE TABLE IF NOT EXISTS public.settlement_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  rail TEXT NOT NULL DEFAULT 'wire',
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settlement_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own settlement instructions" ON public.settlement_instructions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = settlement_instructions.merchant_id AND m.user_id = auth.uid()));
CREATE TRIGGER settlement_instructions_updated_at BEFORE UPDATE ON public.settlement_instructions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 17) SETTLEMENT_BATCHES (admin/system level)
CREATE TABLE IF NOT EXISTS public.settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT,
  processor TEXT,
  currency TEXT,
  amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settlement_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view settlement batches" ON public.settlement_batches FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated view batches" ON public.settlement_batches FOR SELECT TO authenticated USING (true);

-- ============================================
-- SEED REFERENCE DATA
-- ============================================

INSERT INTO public.fx_rates (base_currency, quote_currency, rate, source) VALUES
  ('USD', 'EUR', 0.92, 'seed'),
  ('USD', 'GBP', 0.79, 'seed'),
  ('USD', 'CAD', 1.36, 'seed'),
  ('USD', 'BRL', 5.05, 'seed'),
  ('USD', 'MXN', 17.20, 'seed'),
  ('USD', 'COP', 3850.00, 'seed'),
  ('EUR', 'USD', 1.087, 'seed'),
  ('EUR', 'GBP', 0.86, 'seed'),
  ('GBP', 'USD', 1.27, 'seed'),
  ('GBP', 'EUR', 1.16, 'seed'),
  ('CAD', 'USD', 0.735, 'seed'),
  ('USD', 'USD', 1.0, 'seed')
ON CONFLICT DO NOTHING;

INSERT INTO public.liquidity_pools (currency, region, balance, provider) VALUES
  ('USD', 'Global', 1000000, 'mzzpay'),
  ('EUR', 'EU',     500000,  'mzzpay'),
  ('GBP', 'UK',     350000,  'mzzpay')
ON CONFLICT DO NOTHING;