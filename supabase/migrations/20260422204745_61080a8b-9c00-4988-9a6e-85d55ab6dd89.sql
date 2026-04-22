CREATE TABLE IF NOT EXISTS public.crypto_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL UNIQUE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  network TEXT,
  decimals INTEGER NOT NULL DEFAULT 8,
  is_fiat BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_withdrawal_amount NUMERIC(30,10),
  max_withdrawal_amount NUMERIC(30,10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crypto_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_test BOOLEAN NOT NULL DEFAULT false,
  elektropay_store_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crypto_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.crypto_stores(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  address TEXT,
  network TEXT,
  balance NUMERIC(30,10) NOT NULL DEFAULT 0,
  on_hold NUMERIC(30,10) NOT NULL DEFAULT 0,
  available NUMERIC(30,10) GENERATED ALWAYS AS (balance - on_hold) STORED,
  base_balance NUMERIC(30,10) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  is_user_added BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crypto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.crypto_wallets(id) ON DELETE SET NULL,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.crypto_stores(id) ON DELETE SET NULL,
  tx_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  asset_id TEXT NOT NULL,
  amount NUMERIC(30,10) NOT NULL,
  fee NUMERIC(30,10) NOT NULL DEFAULT 0,
  fee_asset_id TEXT,
  to_address TEXT,
  from_address TEXT,
  tx_hash TEXT,
  elektropay_id TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  initiated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crypto_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  asset_id TEXT,
  tx_type TEXT NOT NULL,
  fee_percent NUMERIC(10,4) NOT NULL DEFAULT 0,
  fee_fixed NUMERIC(30,10) NOT NULL DEFAULT 0,
  split_to_wallet_id UUID REFERENCES public.crypto_wallets(id) ON DELETE SET NULL,
  split_percent NUMERIC(10,4) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.elektropay_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crypto_stores_merchant_name_key
  ON public.crypto_stores (merchant_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS crypto_wallets_store_asset_key
  ON public.crypto_wallets (store_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_crypto_stores_merchant_id
  ON public.crypto_stores (merchant_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_merchant_id
  ON public.crypto_wallets (merchant_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_store_id
  ON public.crypto_wallets (store_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_merchant_id_created_at
  ON public.crypto_transactions (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_wallet_id_created_at
  ON public.crypto_transactions (wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_elektopay_id
  ON public.crypto_transactions (elektropay_id);
CREATE INDEX IF NOT EXISTS idx_crypto_commissions_merchant_id
  ON public.crypto_commissions (merchant_id);
CREATE INDEX IF NOT EXISTS idx_elektropay_webhook_events_created_at
  ON public.elektropay_webhook_events (created_at DESC);

ALTER TABLE public.crypto_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elektropay_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_assets' AND policyname = 'Authenticated can view crypto assets') THEN
    CREATE POLICY "Authenticated can view crypto assets"
    ON public.crypto_assets
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_assets' AND policyname = 'Admins manage crypto assets') THEN
    CREATE POLICY "Admins manage crypto assets"
    ON public.crypto_assets
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_stores' AND policyname = 'Merchants view own crypto stores') THEN
    CREATE POLICY "Merchants view own crypto stores"
    ON public.crypto_stores
    FOR SELECT
    TO authenticated
    USING (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = crypto_stores.merchant_id AND m.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_stores' AND policyname = 'Merchants insert own crypto stores') THEN
    CREATE POLICY "Merchants insert own crypto stores"
    ON public.crypto_stores
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = crypto_stores.merchant_id AND m.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_stores' AND policyname = 'Merchants update own crypto stores') THEN
    CREATE POLICY "Merchants update own crypto stores"
    ON public.crypto_stores
    FOR UPDATE
    TO authenticated
    USING (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = crypto_stores.merchant_id AND m.user_id = auth.uid()
      )
    )
    WITH CHECK (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = crypto_stores.merchant_id AND m.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_stores' AND policyname = 'Admins delete crypto stores') THEN
    CREATE POLICY "Admins delete crypto stores"
    ON public.crypto_stores
    FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_wallets' AND policyname = 'Merchants view own crypto wallets') THEN
    CREATE POLICY "Merchants view own crypto wallets"
    ON public.crypto_wallets
    FOR SELECT
    TO authenticated
    USING (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = crypto_wallets.merchant_id AND m.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_wallets' AND policyname = 'Merchants insert own crypto wallets') THEN
    CREATE POLICY "Merchants insert own crypto wallets"
    ON public.crypto_wallets
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = crypto_wallets.merchant_id AND m.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_wallets' AND policyname = 'Admins manage crypto wallets') THEN
    CREATE POLICY "Admins manage crypto wallets"
    ON public.crypto_wallets
    FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_wallets' AND policyname = 'Admins delete crypto wallets') THEN
    CREATE POLICY "Admins delete crypto wallets"
    ON public.crypto_wallets
    FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_transactions' AND policyname = 'Merchants view own crypto transactions') THEN
    CREATE POLICY "Merchants view own crypto transactions"
    ON public.crypto_transactions
    FOR SELECT
    TO authenticated
    USING (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = crypto_transactions.merchant_id AND m.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_transactions' AND policyname = 'Merchants insert own crypto transactions') THEN
    CREATE POLICY "Merchants insert own crypto transactions"
    ON public.crypto_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.is_admin(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = crypto_transactions.merchant_id AND m.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_transactions' AND policyname = 'Admins manage crypto transactions') THEN
    CREATE POLICY "Admins manage crypto transactions"
    ON public.crypto_transactions
    FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_transactions' AND policyname = 'Admins delete crypto transactions') THEN
    CREATE POLICY "Admins delete crypto transactions"
    ON public.crypto_transactions
    FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_commissions' AND policyname = 'Merchants view own crypto commissions') THEN
    CREATE POLICY "Merchants view own crypto commissions"
    ON public.crypto_commissions
    FOR SELECT
    TO authenticated
    USING (
      public.is_admin(auth.uid()) OR merchant_id IS NULL OR EXISTS (
        SELECT 1 FROM public.merchants m
        WHERE m.id = crypto_commissions.merchant_id AND m.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crypto_commissions' AND policyname = 'Admins manage crypto commissions') THEN
    CREATE POLICY "Admins manage crypto commissions"
    ON public.crypto_commissions
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'elektropay_webhook_events' AND policyname = 'Admins manage elektropay webhook events') THEN
    CREATE POLICY "Admins manage elektropay webhook events"
    ON public.elektropay_webhook_events
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_crypto_assets_updated_at ON public.crypto_assets;
CREATE TRIGGER update_crypto_assets_updated_at
BEFORE UPDATE ON public.crypto_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_stores_updated_at ON public.crypto_stores;
CREATE TRIGGER update_crypto_stores_updated_at
BEFORE UPDATE ON public.crypto_stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_wallets_updated_at ON public.crypto_wallets;
CREATE TRIGGER update_crypto_wallets_updated_at
BEFORE UPDATE ON public.crypto_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_transactions_updated_at ON public.crypto_transactions;
CREATE TRIGGER update_crypto_transactions_updated_at
BEFORE UPDATE ON public.crypto_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_commissions_updated_at ON public.crypto_commissions;
CREATE TRIGGER update_crypto_commissions_updated_at
BEFORE UPDATE ON public.crypto_commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_elektropay_webhook_events_updated_at ON public.elektropay_webhook_events;
CREATE TRIGGER update_elektropay_webhook_events_updated_at
BEFORE UPDATE ON public.elektropay_webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();