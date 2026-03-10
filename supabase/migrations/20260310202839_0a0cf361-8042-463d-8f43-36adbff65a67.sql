
-- Add business details columns to merchants
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS business_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS website_urls text[] DEFAULT '{}';

-- Add phone_number to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text;
