-- Add per-merchant gambling enable flag for Matrix Partners enablement.
-- Only super_admin can toggle this; UI will gate the control with has_role().
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS gambling_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.merchants.gambling_enabled IS
  'Super-admin only. Enables Matrix Partners routing for gambling/casino/lottery/sportsbook/sweepstakes merchants.';

-- Allow super_admin/admin to update this column via existing RLS update policies;
-- since merchants RLS already exists, just guard mutation in app + add a policy for admins
-- to ensure they can update any merchant row's flags.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='merchants' AND policyname='Admins can update merchants'
  ) THEN
    CREATE POLICY "Admins can update merchants"
      ON public.merchants
      FOR UPDATE
      TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END$$;