
-- 1) Extend surcharge_settings with merchant-side fields
ALTER TABLE public.surcharge_settings
  ADD COLUMN IF NOT EXISTS apply_to_credit BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS apply_to_debit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disclosure_text TEXT;

-- 2) Add RLS policies on surcharge_settings (currently has none)
ALTER TABLE public.surcharge_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchant owners view surcharge" ON public.surcharge_settings;
DROP POLICY IF EXISTS "Merchant owners insert surcharge" ON public.surcharge_settings;
DROP POLICY IF EXISTS "Merchant owners update surcharge" ON public.surcharge_settings;

CREATE POLICY "Merchant owners view surcharge"
  ON public.surcharge_settings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = surcharge_settings.merchant_id AND m.user_id = auth.uid()));

CREATE POLICY "Merchant owners insert surcharge"
  ON public.surcharge_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = surcharge_settings.merchant_id AND m.user_id = auth.uid()));

CREATE POLICY "Merchant owners update surcharge"
  ON public.surcharge_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = surcharge_settings.merchant_id AND m.user_id = auth.uid()));

-- 3) Auto-accept team invitations on signup
-- When a new auth user is created, if there is a pending invitation matching their email,
-- mark it accepted, assign the role, and link them to the inviting merchant's team.
CREATE OR REPLACE FUNCTION public.accept_team_invitations_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  FOR inv IN
    SELECT id, role, merchant_id
    FROM public.team_invitations
    WHERE lower(email) = lower(NEW.email)
      AND status = 'pending'
  LOOP
    -- Assign the role
    INSERT INTO public.user_roles (user_id, role, invited_by)
    VALUES (NEW.id, inv.role, NULL)
    ON CONFLICT DO NOTHING;

    -- Mark invitation accepted
    UPDATE public.team_invitations
    SET status = 'accepted', accepted_at = now(), updated_at = now()
    WHERE id = inv.id;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_accept_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_accept_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.accept_team_invitations_on_signup();
