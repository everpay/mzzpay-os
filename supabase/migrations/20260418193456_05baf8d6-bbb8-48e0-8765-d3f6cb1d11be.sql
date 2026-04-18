-- Add card and customer metadata columns to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS card_bin text,
  ADD COLUMN IF NOT EXISTS card_last4 text,
  ADD COLUMN IF NOT EXISTS card_brand text,
  ADD COLUMN IF NOT EXISTS payment_method_type text,
  ADD COLUMN IF NOT EXISTS customer_ip inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS customer_country text;

-- Seed super_admin role for the two specified users
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('d2e90e16-d283-4f4a-8d58-3f285af9dbdb', 'super_admin'),
  ('48c8c507-0142-492e-bbfb-a27bc80ad98f', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;