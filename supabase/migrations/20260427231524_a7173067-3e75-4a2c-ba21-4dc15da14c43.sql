-- Server-side idempotency tracking for transactional email sends.
-- Prevents the same logical email (identified by idempotencyKey) from being
-- enqueued more than once, even across devices or after localStorage is cleared.
CREATE TABLE IF NOT EXISTS public.email_idempotency_keys (
  key text PRIMARY KEY,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_idempotency_recipient
  ON public.email_idempotency_keys (recipient_email);

ALTER TABLE public.email_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- No public policies: only the service role (used by the edge function) may read/write.