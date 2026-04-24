DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'card_test_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.card_test_runs;
  END IF;
END $$;

ALTER TABLE public.card_test_runs REPLICA IDENTITY FULL;