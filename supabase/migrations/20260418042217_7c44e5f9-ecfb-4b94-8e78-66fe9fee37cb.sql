-- ============================================
-- Enable RLS on previously-unprotected tables
-- ============================================

-- Reference / lookup tables: readable by any authenticated user, admin-managed
ALTER TABLE public.gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read gateways" ON public.gateways FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage gateways" ON public.gateways FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.gateway_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read gateway_countries" ON public.gateway_countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage gateway_countries" ON public.gateway_countries FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.gateway_currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read gateway_currencies" ON public.gateway_currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage gateway_currencies" ON public.gateway_currencies FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.gateway_processor_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read gateway_processor_routes" ON public.gateway_processor_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage gateway_processor_routes" ON public.gateway_processor_routes FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.processor_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read processor_routes" ON public.processor_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage processor_routes" ON public.processor_routes FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.payment_processors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read payment_processors" ON public.payment_processors FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage payment_processors" ON public.payment_processors FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read payment_providers" ON public.payment_providers FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage payment_providers" ON public.payment_providers FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.provider_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read provider_pricing" ON public.provider_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage provider_pricing" ON public.provider_pricing FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read platform_fees" ON public.platform_fees FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage platform_fees" ON public.platform_fees FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Lead pipeline: admins only
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage leads" ON public.leads FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Ledger accounts: merchant-scoped
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own ledger accounts" ON public.ledger_accounts FOR SELECT TO authenticated
  USING (
    merchant_id IS NULL
    OR EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = ledger_accounts.merchant_id AND m.user_id = auth.uid())
    OR is_admin(auth.uid())
  );
CREATE POLICY "Admins manage ledger accounts" ON public.ledger_accounts FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Merchant processor configs: merchant-scoped (sensitive — encrypted credentials)
ALTER TABLE public.merchant_processor_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own processor configs" ON public.merchant_processor_configs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_processor_configs.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own processor configs" ON public.merchant_processor_configs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_processor_configs.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own processor configs" ON public.merchant_processor_configs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_processor_configs.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants delete own processor configs" ON public.merchant_processor_configs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_processor_configs.merchant_id AND m.user_id = auth.uid()));

-- Merchant processor routes: merchant-scoped
ALTER TABLE public.merchant_processor_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own processor routes" ON public.merchant_processor_routes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_processor_routes.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own processor routes" ON public.merchant_processor_routes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_processor_routes.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own processor routes" ON public.merchant_processor_routes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_processor_routes.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants delete own processor routes" ON public.merchant_processor_routes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_processor_routes.merchant_id AND m.user_id = auth.uid()));

-- Orchestrated transactions: merchant-scoped
ALTER TABLE public.orchestrated_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own orchestrated tx" ON public.orchestrated_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = orchestrated_transactions.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own orchestrated tx" ON public.orchestrated_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = orchestrated_transactions.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants update own orchestrated tx" ON public.orchestrated_transactions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = orchestrated_transactions.merchant_id AND m.user_id = auth.uid()));

-- Routing rules: merchant-scoped (with admin override)
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own routing rules" ON public.routing_rules FOR SELECT TO authenticated
  USING (
    merchant_id IS NULL
    OR EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = routing_rules.merchant_id AND m.user_id = auth.uid())
    OR is_admin(auth.uid())
  );
CREATE POLICY "Admins manage routing rules" ON public.routing_rules FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Surcharge audit logs: merchant owner read, system write
ALTER TABLE public.surcharge_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own surcharge audit logs" ON public.surcharge_audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = surcharge_audit_logs.merchant_id AND m.user_id = auth.uid()));
CREATE POLICY "Merchants insert own surcharge audit logs" ON public.surcharge_audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = surcharge_audit_logs.merchant_id AND m.user_id = auth.uid())
    AND changed_by = auth.uid()
  );

-- ============================================
-- Tighten always-true write policies from previous migration
-- ============================================

-- audit_logs: any authenticated insert is OK (system writes from edge functions),
-- but require user_id to match auth.uid() OR null (for service writes via service role)
DROP POLICY IF EXISTS "Service can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- bin_cache: only admins should write; reads stay open
DROP POLICY IF EXISTS "Service can insert bin cache" ON public.bin_cache;
CREATE POLICY "Admins manage bin cache" ON public.bin_cache FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins update bin cache" ON public.bin_cache FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()));