
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'reseller');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper: check if user is any admin type
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin')
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can invite resellers"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) 
    AND role = 'reseller'
  );

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Create provider_fees table for all fee configurations
CREATE TABLE public.provider_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'global',
  fee_type TEXT NOT NULL,
  rail TEXT,
  description TEXT,
  rate_percent NUMERIC DEFAULT 0,
  flat_fee NUMERIC DEFAULT 0,
  flat_fee_currency TEXT DEFAULT 'USD',
  volume_tier TEXT DEFAULT 'standard',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_fees ENABLE ROW LEVEL SECURITY;

-- Only admins can manage fees
CREATE POLICY "Admins can manage fees"
  ON public.provider_fees FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- All authenticated users can view fees (needed for payout calculations)
CREATE POLICY "Authenticated users can view fees"
  ON public.provider_fees FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 6. Create platform_markup table for MzzPay markup rules
CREATE TABLE public.platform_markup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rail TEXT NOT NULL,
  markup_percent NUMERIC NOT NULL DEFAULT 0,
  markup_flat NUMERIC NOT NULL DEFAULT 0,
  markup_flat_currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_markup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage markup"
  ON public.platform_markup FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view markup"
  ON public.platform_markup FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Add updated_at triggers
CREATE TRIGGER update_provider_fees_updated_at
  BEFORE UPDATE ON public.provider_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_markup_updated_at
  BEFORE UPDATE ON public.platform_markup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
