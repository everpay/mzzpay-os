
-- 1) CHECK constraints on routing_rules
ALTER TABLE public.routing_rules
  ADD CONSTRAINT routing_rules_amount_range_chk
    CHECK (amount_min IS NULL OR amount_max IS NULL OR amount_min <= amount_max);

ALTER TABLE public.routing_rules
  ADD CONSTRAINT routing_rules_amount_nonneg_chk
    CHECK ((amount_min IS NULL OR amount_min >= 0) AND (amount_max IS NULL OR amount_max >= 0));

ALTER TABLE public.routing_rules
  ADD CONSTRAINT routing_rules_priority_range_chk
    CHECK (priority IS NULL OR (priority >= 0 AND priority <= 1000));

ALTER TABLE public.routing_rules
  ALTER COLUMN active SET NOT NULL,
  ALTER COLUMN active SET DEFAULT true;

-- 2) CHECK constraints on processor_fee_profiles
ALTER TABLE public.processor_fee_profiles
  ADD CONSTRAINT pfp_percentage_range_chk    CHECK (percentage_fee >= 0 AND percentage_fee <= 100),
  ADD CONSTRAINT pfp_fixed_nonneg_chk        CHECK (fixed_fee >= 0),
  ADD CONSTRAINT pfp_chargeback_nonneg_chk   CHECK (chargeback_fee >= 0),
  ADD CONSTRAINT pfp_refund_nonneg_chk       CHECK (refund_fee >= 0),
  ADD CONSTRAINT pfp_settlement_range_chk    CHECK (settlement_days >= 0 AND settlement_days <= 90);

-- 3) Audit-logging trigger function (records actor + merchant + idempotency_key + diff)
CREATE OR REPLACE FUNCTION public.audit_admin_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_merchant uuid;
  v_idem text;
  v_entity uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_merchant := OLD.merchant_id;
    v_idem     := OLD.idempotency_key;
    v_entity   := OLD.id;
  ELSE
    v_merchant := NEW.merchant_id;
    v_idem     := NEW.idempotency_key;
    v_entity   := NEW.id;
  END IF;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, merchant_id, metadata)
  VALUES (
    lower(TG_OP) || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    v_entity::text,
    auth.uid(),
    v_merchant,
    jsonb_build_object(
      'idempotency_key', v_idem,
      'before',          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
      'after',           CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) Wire triggers
DROP TRIGGER IF EXISTS audit_routing_rules ON public.routing_rules;
CREATE TRIGGER audit_routing_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_writes();

DROP TRIGGER IF EXISTS audit_processor_fee_profiles ON public.processor_fee_profiles;
CREATE TRIGGER audit_processor_fee_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.processor_fee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_writes();
