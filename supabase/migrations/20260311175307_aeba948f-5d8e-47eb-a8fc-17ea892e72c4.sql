CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE POLICY "Service can update reserves for release"
  ON public.rolling_reserves
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM merchants
    WHERE merchants.id = rolling_reserves.merchant_id
      AND merchants.user_id = auth.uid()
  ));