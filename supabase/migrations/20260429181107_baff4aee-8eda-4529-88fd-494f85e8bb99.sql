
REVOKE ALL ON FUNCTION public.merchant_account_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_account_balance(uuid) TO authenticated;
