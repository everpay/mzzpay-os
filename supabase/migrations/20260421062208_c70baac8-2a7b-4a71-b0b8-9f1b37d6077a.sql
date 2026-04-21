-- ============================================================
-- Integrations & Gateways: gateway_credentials, migration_jobs,
-- psp_routes, processor_metrics
-- ============================================================

-- 1. gateway_credentials
CREATE TABLE IF NOT EXISTS public.gateway_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  gateway_name TEXT NOT NULL,
  gateway_type TEXT NOT NULL DEFAULT 'active_merchant' CHECK (gateway_type IN ('direct', 'active_merchant')),
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, gateway_name, environment)
);

ALTER TABLE public.gateway_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view own gateway credentials"
  ON public.gateway_credentials FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Merchants insert own gateway credentials"
  ON public.gateway_credentials FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants update own gateway credentials"
  ON public.gateway_credentials FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants delete own gateway credentials"
  ON public.gateway_credentials FOR DELETE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_gateway_credentials_updated_at ON public.gateway_credentials;
CREATE TRIGGER update_gateway_credentials_updated_at
  BEFORE UPDATE ON public.gateway_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. migration_jobs
CREATE TABLE IF NOT EXISTS public.migration_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  source_gateway TEXT NOT NULL,
  import_method TEXT NOT NULL DEFAULT 'csv' CHECK (import_method IN ('csv', 'api')),
  data_types TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  file_url TEXT,
  progress_pct INTEGER NOT NULL DEFAULT 0,
  total_records INTEGER DEFAULT 0,
  imported_records INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view own migration jobs"
  ON public.migration_jobs FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Merchants insert own migration jobs"
  ON public.migration_jobs FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants update own migration jobs"
  ON public.migration_jobs FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_migration_jobs_updated_at ON public.migration_jobs;
CREATE TRIGGER update_migration_jobs_updated_at
  BEFORE UPDATE ON public.migration_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. psp_routes (admin-managed override routing)
CREATE TABLE IF NOT EXISTS public.psp_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT,
  country_match TEXT[] DEFAULT ARRAY[]::text[],
  card_brand_match TEXT[] DEFAULT ARRAY[]::text[],
  max_risk_score INTEGER,
  provider TEXT NOT NULL,
  fallback_provider TEXT,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.psp_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active psp_routes"
  ON public.psp_routes FOR SELECT TO authenticated
  USING (active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage psp_routes"
  ON public.psp_routes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_psp_routes_updated_at ON public.psp_routes;
CREATE TRIGGER update_psp_routes_updated_at
  BEFORE UPDATE ON public.psp_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. processor_metrics (used by routing-engine for scoring)
CREATE TABLE IF NOT EXISTS public.processor_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id TEXT NOT NULL,
  region TEXT,
  success_rate NUMERIC(5,2) DEFAULT 95.00,
  avg_latency INTEGER DEFAULT 200,
  avg_fee NUMERIC(5,2) DEFAULT 2.50,
  sample_count INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(processor_id, region)
);

ALTER TABLE public.processor_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read processor_metrics"
  ON public.processor_metrics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage processor_metrics"
  ON public.processor_metrics FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_processor_metrics_updated_at ON public.processor_metrics;
CREATE TRIGGER update_processor_metrics_updated_at
  BEFORE UPDATE ON public.processor_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_gateway_credentials_merchant ON public.gateway_credentials(merchant_id);
CREATE INDEX IF NOT EXISTS idx_migration_jobs_merchant ON public.migration_jobs(merchant_id);
CREATE INDEX IF NOT EXISTS idx_psp_routes_merchant ON public.psp_routes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_processor_metrics_processor ON public.processor_metrics(processor_id);