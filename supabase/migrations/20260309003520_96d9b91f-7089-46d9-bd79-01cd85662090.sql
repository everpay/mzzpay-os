-- Create customers table for recurring billing
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  billing_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, email)
);

-- Create payment_methods table to store VGS aliases
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vgs_alias TEXT NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  exp_month TEXT,
  exp_year TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('day', 'week', 'month', 'year')),
  interval_count INTEGER NOT NULL DEFAULT 1,
  trial_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'paused', 'trial')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view own customers"
  ON public.customers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = customers.merchant_id
    AND merchants.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own customers"
  ON public.customers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = customers.merchant_id
    AND merchants.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own customers"
  ON public.customers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = customers.merchant_id
    AND merchants.user_id = auth.uid()
  ));

-- RLS Policies for payment_methods
CREATE POLICY "Users can view own payment methods"
  ON public.payment_methods FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.merchants m ON m.id = c.merchant_id
    WHERE c.id = payment_methods.customer_id
    AND m.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own payment methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.merchants m ON m.id = c.merchant_id
    WHERE c.id = payment_methods.customer_id
    AND m.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own payment methods"
  ON public.payment_methods FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.merchants m ON m.id = c.merchant_id
    WHERE c.id = payment_methods.customer_id
    AND m.user_id = auth.uid()
  ));

-- RLS Policies for subscription_plans
CREATE POLICY "Users can view own plans"
  ON public.subscription_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = subscription_plans.merchant_id
    AND merchants.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own plans"
  ON public.subscription_plans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = subscription_plans.merchant_id
    AND merchants.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own plans"
  ON public.subscription_plans FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.merchants
    WHERE merchants.id = subscription_plans.merchant_id
    AND merchants.user_id = auth.uid()
  ));

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.merchants m ON m.id = c.merchant_id
    WHERE c.id = subscriptions.customer_id
    AND m.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.merchants m ON m.id = c.merchant_id
    WHERE c.id = subscriptions.customer_id
    AND m.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.merchants m ON m.id = c.merchant_id
    WHERE c.id = subscriptions.customer_id
    AND m.user_id = auth.uid()
  ));

-- Add updated_at triggers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();