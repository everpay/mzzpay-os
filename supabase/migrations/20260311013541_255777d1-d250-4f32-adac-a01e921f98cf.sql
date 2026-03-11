
-- Rolling reserves table: holds 10% of each transaction for 180 days
CREATE TABLE public.rolling_reserves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL,
  reserve_percent numeric NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'held',
  held_at timestamptz NOT NULL DEFAULT now(),
  release_at timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rolling_reserves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reserves" ON public.rolling_reserves
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = rolling_reserves.merchant_id AND merchants.user_id = auth.uid()));

CREATE POLICY "Admins can view all reserves" ON public.rolling_reserves
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service can insert reserves" ON public.rolling_reserves
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = rolling_reserves.merchant_id AND merchants.user_id = auth.uid()));

-- Card velocity tracking table: enforces 3 cards per day per customer
CREATE TABLE public.card_velocity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  customer_identifier text NOT NULL,
  card_last4 text,
  provider text NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, customer_identifier, transaction_date)
);

ALTER TABLE public.card_velocity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own velocity" ON public.card_velocity
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = card_velocity.merchant_id AND merchants.user_id = auth.uid()));

CREATE POLICY "Admins can view all velocity" ON public.card_velocity
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service can insert velocity" ON public.card_velocity
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = card_velocity.merchant_id AND merchants.user_id = auth.uid()));

CREATE POLICY "Service can update velocity" ON public.card_velocity
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = card_velocity.merchant_id AND merchants.user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_rolling_reserves_merchant ON public.rolling_reserves(merchant_id, status);
CREATE INDEX idx_rolling_reserves_release ON public.rolling_reserves(release_at) WHERE status = 'held';
CREATE INDEX idx_card_velocity_lookup ON public.card_velocity(merchant_id, customer_identifier, transaction_date);
