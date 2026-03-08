-- Create merchants table
CREATE TABLE public.merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key_hash TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own merchants" ON public.merchants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own merchants" ON public.merchants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own merchants" ON public.merchants FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = accounts.merchant_id AND merchants.user_id = auth.uid())
);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = accounts.merchant_id AND merchants.user_id = auth.uid())
);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = accounts.merchant_id AND merchants.user_id = auth.uid())
);
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  provider TEXT NOT NULL CHECK (provider IN ('facilitapay', 'mondo', 'stripe', 'shieldhub')),
  provider_ref TEXT,
  customer_email TEXT,
  description TEXT,
  idempotency_key TEXT,
  fx_rate NUMERIC,
  settlement_currency TEXT,
  settlement_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = transactions.merchant_id AND merchants.user_id = auth.uid())
);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = transactions.merchant_id AND merchants.user_id = auth.uid())
);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = transactions.merchant_id AND merchants.user_id = auth.uid())
);
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_transactions_merchant ON public.transactions(merchant_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_idempotency ON public.transactions(idempotency_key);

-- Create ledger_entries table
CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ledger entries" ON public.ledger_entries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    JOIN public.merchants m ON m.id = t.merchant_id
    WHERE t.id = ledger_entries.transaction_id AND m.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own ledger entries" ON public.ledger_entries FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transactions t
    JOIN public.merchants m ON m.id = t.merchant_id
    WHERE t.id = ledger_entries.transaction_id AND m.user_id = auth.uid()
  )
);
CREATE INDEX idx_ledger_transaction ON public.ledger_entries(transaction_id);

-- Create idempotency_keys table
CREATE TABLE public.idempotency_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE(key, merchant_id)
);
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own idempotency keys" ON public.idempotency_keys FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = idempotency_keys.merchant_id AND merchants.user_id = auth.uid())
);
CREATE POLICY "Users can insert own idempotency keys" ON public.idempotency_keys FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = idempotency_keys.merchant_id AND merchants.user_id = auth.uid())
);

-- Create provider_events table
CREATE TABLE public.provider_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  transaction_id UUID REFERENCES public.transactions(id),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON public.provider_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = provider_events.merchant_id AND merchants.user_id = auth.uid())
);
CREATE POLICY "Users can insert own events" ON public.provider_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.merchants WHERE merchants.id = provider_events.merchant_id AND merchants.user_id = auth.uid())
);
CREATE INDEX idx_events_merchant ON public.provider_events(merchant_id);
CREATE INDEX idx_events_transaction ON public.provider_events(transaction_id);

-- Auto-create merchant on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.merchants (user_id, name)
  VALUES (NEW.user_id, COALESCE(NEW.display_name, 'My Merchant'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();