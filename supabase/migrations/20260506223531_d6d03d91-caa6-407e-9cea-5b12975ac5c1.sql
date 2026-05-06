
CREATE OR REPLACE FUNCTION public.merchant_reconciliation_rows(_merchant_id uuid)
RETURNS TABLE (
  account_id uuid,
  currency text,
  stored_balance numeric,
  ledger_total numeric,
  discrepancy numeric,
  entry_count bigint,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id AS account_id,
    a.currency,
    a.balance AS stored_balance,
    COALESCE(SUM(CASE WHEN le.entry_type = 'credit' THEN le.amount ELSE -le.amount END), 0) AS ledger_total,
    ROUND(a.balance - COALESCE(SUM(CASE WHEN le.entry_type = 'credit' THEN le.amount ELSE -le.amount END), 0), 2) AS discrepancy,
    COUNT(le.id) AS entry_count,
    CASE
      WHEN ABS(a.balance - COALESCE(SUM(CASE WHEN le.entry_type = 'credit' THEN le.amount ELSE -le.amount END), 0)) < 0.01 THEN 'matched'
      ELSE 'discrepancy'
    END AS status
  FROM public.accounts a
  LEFT JOIN public.ledger_entries le ON le.account_id = a.id
  WHERE a.merchant_id = _merchant_id
    AND (
      EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = _merchant_id AND m.user_id = auth.uid())
      OR public.is_admin(auth.uid())
    )
  GROUP BY a.id, a.currency, a.balance
  ORDER BY a.currency;
$$;
