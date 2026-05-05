ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_error text DEFAULT NULL;