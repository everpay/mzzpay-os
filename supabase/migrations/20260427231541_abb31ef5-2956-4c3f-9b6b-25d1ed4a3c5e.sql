-- Explicit deny-all policy: this table is service-role only.
-- Service role bypasses RLS, so this policy only affects anon/authenticated users.
CREATE POLICY "Block all client access to email_idempotency_keys"
ON public.email_idempotency_keys
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);