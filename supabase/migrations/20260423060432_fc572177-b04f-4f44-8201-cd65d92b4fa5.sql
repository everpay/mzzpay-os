-- payment_links: persist user-saved checkout links
CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  customer_email TEXT,
  customer_name TEXT,
  order_id TEXT,
  payment_method TEXT DEFAULT 'all',
  success_url TEXT,
  cancel_url TEXT,
  url TEXT NOT NULL,
  products JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants manage own payment links"
  ON public.payment_links
  FOR ALL
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

CREATE POLICY "Admins view all payment links"
  ON public.payment_links
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS payment_links_merchant_idx ON public.payment_links(merchant_id, created_at DESC);

CREATE TRIGGER set_payment_links_updated_at
  BEFORE UPDATE ON public.payment_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend subscription_plans for richer scheduling and trial/retry logic
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS subscription_starts TEXT NOT NULL DEFAULT 'immediately',
  ADD COLUMN IF NOT EXISTS starts_day INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS starts_weekday TEXT NOT NULL DEFAULT 'Monday',
  ADD COLUMN IF NOT EXISTS starts_weekday_occurrence INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS billing_period_unit TEXT NOT NULL DEFAULT 'months',
  ADD COLUMN IF NOT EXISTS ends_type TEXT NOT NULL DEFAULT 'never',
  ADD COLUMN IF NOT EXISTS ends_after_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ends_after_unit TEXT NOT NULL DEFAULT 'year',
  ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_duration INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_unit TEXT NOT NULL DEFAULT 'days',
  ADD COLUMN IF NOT EXISTS trial_price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_logic TEXT NOT NULL DEFAULT '4_retries_1d_fri_2d_5d',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- subscription_plan_prices: per-currency pricing rows
CREATE TABLE IF NOT EXISTS public.subscription_plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  subscription_price NUMERIC NOT NULL DEFAULT 0,
  trial_price NUMERIC NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, currency)
);

ALTER TABLE public.subscription_plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants manage own plan prices"
  ON public.subscription_plan_prices
  FOR ALL
  USING (plan_id IN (
    SELECT sp.id FROM public.subscription_plans sp
    JOIN public.merchants m ON m.id = sp.merchant_id
    WHERE m.user_id = auth.uid()
  ))
  WITH CHECK (plan_id IN (
    SELECT sp.id FROM public.subscription_plans sp
    JOIN public.merchants m ON m.id = sp.merchant_id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Admins view all plan prices"
  ON public.subscription_plan_prices
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS plan_prices_plan_idx ON public.subscription_plan_prices(plan_id);

CREATE TRIGGER set_plan_prices_updated_at
  BEFORE UPDATE ON public.subscription_plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend transactions with detailed processor + billing capture
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS billing_address JSONB,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_first_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_last_name TEXT,
  ADD COLUMN IF NOT EXISTS processor_error_code TEXT,
  ADD COLUMN IF NOT EXISTS processor_error_message TEXT,
  ADD COLUMN IF NOT EXISTS processor_raw_response JSONB;