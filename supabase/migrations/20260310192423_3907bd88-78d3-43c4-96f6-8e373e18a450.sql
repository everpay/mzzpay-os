
-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  customer_id UUID REFERENCES public.customers(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  transaction_id UUID REFERENCES public.transactions(id),
  invoice_number TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = invoices.merchant_id AND merchants.user_id = auth.uid()));

CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = invoices.merchant_id AND merchants.user_id = auth.uid()));

CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = invoices.merchant_id AND merchants.user_id = auth.uid()));

-- Public read policy for invoice payment page (by invoice ID)
CREATE POLICY "Anyone can view invoice for payment" ON public.invoices
  FOR SELECT TO anon
  USING (status IN ('sent', 'overdue'));

-- Updated at trigger
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
