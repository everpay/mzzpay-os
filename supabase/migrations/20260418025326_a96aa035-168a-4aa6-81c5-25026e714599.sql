CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.app_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_merchant ON public.team_invitations(merchant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_unique_pending
  ON public.team_invitations(merchant_id, lower(email)) WHERE status = 'pending';

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant owners can view invitations"
  ON public.team_invitations FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = team_invitations.merchant_id AND m.user_id = auth.uid()));

CREATE POLICY "Merchant owners can insert invitations"
  ON public.team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = team_invitations.merchant_id AND m.user_id = auth.uid()));

CREATE POLICY "Merchant owners can update invitations"
  ON public.team_invitations FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = team_invitations.merchant_id AND m.user_id = auth.uid()));

CREATE POLICY "Merchant owners can delete invitations"
  ON public.team_invitations FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = team_invitations.merchant_id AND m.user_id = auth.uid()));

CREATE TRIGGER trg_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();