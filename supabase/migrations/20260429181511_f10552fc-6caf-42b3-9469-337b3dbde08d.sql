CREATE TABLE IF NOT EXISTS public.tapix_enrichment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  tapix_handle text,
  shop_uid text,
  merchant_uid text,
  enrichment_type text NOT NULL DEFAULT 'card',
  shop_data jsonb,
  merchant_data jsonb,
  raw_find_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tapix_cache_merchant ON public.tapix_enrichment_cache(merchant_id);
CREATE INDEX IF NOT EXISTS idx_tapix_cache_tx ON public.tapix_enrichment_cache(transaction_id);

ALTER TABLE public.tapix_enrichment_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants view own tapix cache"
  ON public.tapix_enrichment_cache FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = tapix_enrichment_cache.merchant_id AND m.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_tapix_cache_updated_at
  BEFORE UPDATE ON public.tapix_enrichment_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();