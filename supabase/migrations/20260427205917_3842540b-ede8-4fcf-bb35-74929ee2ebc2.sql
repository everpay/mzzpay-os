-- 1) settlement_batches: drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated view batches" ON public.settlement_batches;

-- 2) acquirers: drop all permissive read policies and keep only admin access
DROP POLICY IF EXISTS "Authenticated can view acquirers" ON public.acquirers;
DROP POLICY IF EXISTS "everyone reads acquirers" ON public.acquirers;
DROP POLICY IF EXISTS "Anyone can view acquirers" ON public.acquirers;

-- Ensure admin-only SELECT exists
DROP POLICY IF EXISTS "Admins view acquirers" ON public.acquirers;
CREATE POLICY "Admins view acquirers" ON public.acquirers
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3) email-assets storage bucket: lock down upload + list to admins only
DROP POLICY IF EXISTS "Service role can upload to email-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for email-assets" ON storage.objects;

-- Public can read individual files (needed for <img src> in emails)
CREATE POLICY "Public read individual email-assets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'email-assets');

-- Only admins can upload, update, or delete email assets
CREATE POLICY "Admins upload email-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'email-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update email-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'email-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete email-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'email-assets' AND public.is_admin(auth.uid()));