REVOKE EXECUTE ON FUNCTION public.merchant_reconciliation_rows(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.merchant_reconciliation_rows(uuid) TO authenticated;