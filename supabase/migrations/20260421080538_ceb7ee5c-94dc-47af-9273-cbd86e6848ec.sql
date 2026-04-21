-- 1. Add Everpay-style columns to routing_rules (additive, non-destructive)
ALTER TABLE public.routing_rules
  ADD COLUMN IF NOT EXISTS target_provider text,
  ADD COLUMN IF NOT EXISTS fallback_provider text,
  ADD COLUMN IF NOT EXISTS currency_match text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS amount_min numeric,
  ADD COLUMN IF NOT EXISTS amount_max numeric,
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Backfill active from is_active for existing rows
UPDATE public.routing_rules SET active = COALESCE(is_active, true) WHERE active IS NULL;

CREATE INDEX IF NOT EXISTS idx_routing_rules_merchant_priority
  ON public.routing_rules (merchant_id, priority);

-- 2. Seed default acquirers if not present
INSERT INTO public.acquirers (name, country, success_rate, avg_latency_ms, active)
SELECT * FROM (VALUES
  ('SmartFastPay', 'Global', 96.2, 320, true),
  ('Mondo', 'EU/UK', 94.5, 410, true),
  ('ShieldHub', 'US/Global', 95.8, 380, true),
  ('Matrix Partners', 'EU', 92.1, 520, true),
  ('Paygate10', 'LATAM/APAC', 89.4, 680, true)
) AS v(name, country, success_rate, avg_latency_ms, active)
WHERE NOT EXISTS (SELECT 1 FROM public.acquirers a WHERE a.name = v.name);