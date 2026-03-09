CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  transaction_id uuid REFERENCES transactions(id),
  chargeflow_id text,
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  reason text,
  evidence_due_date timestamp with time zone,
  provider text,
  customer_email text,
  description text,
  outcome text,
  chargeflow_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own disputes" ON public.disputes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = disputes.merchant_id AND merchants.user_id = auth.uid()));

CREATE POLICY "Users can insert own disputes" ON public.disputes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = disputes.merchant_id AND merchants.user_id = auth.uid()));

CREATE POLICY "Users can update own disputes" ON public.disputes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = disputes.merchant_id AND merchants.user_id = auth.uid()));

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();