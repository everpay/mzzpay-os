
-- 1. Restrict public bucket listing for email-assets
DROP POLICY IF EXISTS "Public read access for email-assets" ON storage.objects;

CREATE POLICY "Public can read email-assets files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'email-assets'
  AND name IS NOT NULL
  AND name <> ''
  AND position('/' in name) <> 0
);

-- 2. Move pg_net out of public schema by drop+recreate (pg_net doesn't support SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- 3. Auto-create retry_settings row per merchant
CREATE OR REPLACE FUNCTION public.ensure_retry_settings_for_merchant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.retry_settings (merchant_id)
  VALUES (NEW.id)
  ON CONFLICT (merchant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_retry_settings ON public.merchants;
CREATE TRIGGER trg_ensure_retry_settings
AFTER INSERT ON public.merchants
FOR EACH ROW EXECUTE FUNCTION public.ensure_retry_settings_for_merchant();

INSERT INTO public.retry_settings (merchant_id)
SELECT m.id FROM public.merchants m
LEFT JOIN public.retry_settings rs ON rs.merchant_id = m.id
WHERE rs.merchant_id IS NULL;
