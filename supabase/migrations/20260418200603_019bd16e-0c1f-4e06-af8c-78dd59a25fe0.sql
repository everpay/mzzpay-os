-- Create merchant_profiles table for KYB business verification
CREATE TABLE IF NOT EXISTS public.merchant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  business_name text,
  business_type text,
  registration_number text,
  tax_id text,
  country text,
  website text,
  industry text,
  mcc_code text,
  address jsonb DEFAULT '{}'::jsonb,
  onboarding_status text NOT NULL DEFAULT 'in_review',
  kyb_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view own profile"
  ON public.merchant_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_profiles.merchant_id AND m.user_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Merchants insert own profile"
  ON public.merchant_profiles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_profiles.merchant_id AND m.user_id = auth.uid()));

CREATE POLICY "Merchants update own profile"
  ON public.merchant_profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_profiles.merchant_id AND m.user_id = auth.uid()));

CREATE POLICY "Compliance can update profiles"
  ON public.merchant_profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'compliance_officer'::app_role));

CREATE TRIGGER merchant_profiles_updated_at
  BEFORE UPDATE ON public.merchant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create private storage bucket for KYB documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyb-documents', 'kyb-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for kyb-documents bucket: each user has a folder named after their auth uid
CREATE POLICY "Users view own kyb docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyb-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own kyb docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyb-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own kyb docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyb-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own kyb docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kyb-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Compliance view all kyb docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyb-documents' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'compliance_officer'::app_role)));