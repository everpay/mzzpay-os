
-- Remove old MzzPay USD tiered fees and replace with CBCG Schedule
DELETE FROM provider_fees WHERE provider = 'mzzpay';

-- MzzPay USD (CBCG Schedule I) - Single MDR tier at 6.50%
INSERT INTO provider_fees (provider, region, fee_type, rail, description, rate_percent, flat_fee, flat_fee_currency, volume_tier, is_active) VALUES
  ('mzzpay', 'US', 'mdr', 'card', 'Card MDR - Visa/Mastercard (CBCG)', 6.50, 0, 'USD', 'standard', true),
  ('mzzpay', 'US', 'gateway_approved', 'card', 'Approved gateway fee per tx', 0, 0.30, 'USD', 'standard', true),
  ('mzzpay', 'US', 'gateway_declined', 'card', 'Declined gateway fee per tx', 0, 0, 'USD', 'standard', true),
  ('mzzpay', 'US', 'refund', 'card', 'Cost per refund presented', 0, 12.00, 'USD', 'standard', true),
  ('mzzpay', 'US', 'chargeback', 'card', 'Chargeback fee', 0, 60.00, 'USD', 'standard', true),
  ('mzzpay', 'US', 'settlement', 'swift', 'Settlement fee - SWIFT at cost', 1.5, 0, 'USD', 'standard', true),
  ('mzzpay', 'US', '3ds', 'card', '3DS authentication fee (included in MDR)', 0, 0, 'USD', 'standard', true),
  ('mzzpay', 'GLOBAL', 'mdr', 'card', 'Card MDR - Global (CBCG)', 6.50, 0, 'USD', 'standard', true),
  ('mzzpay', 'GLOBAL', 'gateway_approved', 'card', 'Approved gateway fee per tx', 0, 0.30, 'USD', 'standard', true),
  ('mzzpay', 'GLOBAL', 'refund', 'card', 'Cost per refund presented', 0, 12.00, 'USD', 'standard', true),
  ('mzzpay', 'GLOBAL', 'chargeback', 'card', 'Chargeback fee', 0, 60.00, 'USD', 'standard', true),
  ('mzzpay', 'GLOBAL', 'settlement', 'swift', 'Settlement fee - SWIFT at cost', 1.5, 0, 'USD', 'standard', true);
