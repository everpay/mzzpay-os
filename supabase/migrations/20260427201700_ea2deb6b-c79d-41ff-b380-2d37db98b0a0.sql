INSERT INTO public.acquirers (name, country, success_rate, avg_latency_ms, active, routing_weight)
VALUES ('RisonPay', 'EU/EEA', 95.40, 460, true, 50)
ON CONFLICT DO NOTHING;