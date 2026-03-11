
-- Clear existing provider fees and re-seed with correct Schedule A + Mondo fees
DELETE FROM provider_fees;

-- ==================== MONETO (Schedule A) ====================
-- SWIFT
INSERT INTO provider_fees (provider, region, fee_type, rail, description, rate_percent, flat_fee, flat_fee_currency) VALUES
('moneto', 'global', 'swift_in', 'SWIFT', 'SWIFT Inbound', 0.4, 30, 'USD'),
('moneto', 'global', 'swift_out', 'SWIFT', 'SWIFT Outbound', 0.4, 30, 'USD'),
-- ACH
('moneto', 'US', 'ach_in', 'ACH', 'ACH Inbound', 0.2, 0.35, 'USD'),
('moneto', 'US', 'ach_out', 'ACH', 'ACH Outbound', 0.2, 0.35, 'USD'),
-- Fedwire
('moneto', 'US', 'fedwire_in', 'Fedwire', 'Fedwire Inbound', 0.2, 20, 'USD'),
('moneto', 'US', 'fedwire_out', 'Fedwire', 'Fedwire Outbound', 0.2, 20, 'USD'),
-- SEPA
('moneto', 'EU', 'sepa_in', 'SEPA', 'SEPA Inbound', 0.2, 4.5, 'EUR'),
('moneto', 'EU', 'sepa_out', 'SEPA', 'SEPA Outbound', 0.2, 4.5, 'EUR'),
-- Account & Onboarding
('moneto', 'global', 'account_maintenance', NULL, 'Account Maintenance (monthly)', 0, 1000, 'USD'),
('moneto', 'global', 'onboarding', NULL, 'Onboarding Fee (one-time)', 0, 2500, 'USD'),
-- FX & Stablecoin
('moneto', 'global', 'fx_conversion', 'FX', 'FX Conversions', 1, 0, 'USD'),
('moneto', 'global', 'stablecoin_exchange', 'Crypto', 'Stablecoin Exchange', 1, 0, 'USD'),
('moneto', 'global', 'non_stablecoin_exchange', 'Crypto', 'Non-Stablecoin Exchange', 1, 0, 'USD'),
-- Credit Card Processing (volume tiers)
('moneto', 'global', 'card_processing', 'Card', 'MDR $0-3m', 5.85, 0.30, 'USD'),
('moneto', 'global', 'card_chargeback', 'Card', 'Chargeback fee', 0, 45, 'USD'),
('moneto', 'global', 'card_refund', 'Card', 'Refund fee', 0, 20, 'USD'),
('moneto', 'global', 'card_3ds', 'Card', '3DS per transaction', 0, 0.40, 'USD');

-- ==================== MONDO (GetMondo) ====================
-- Mastercard/Visa EU
INSERT INTO provider_fees (provider, region, fee_type, rail, description, rate_percent, flat_fee, flat_fee_currency) VALUES
('mondo', 'EU', 'card_eu', 'Card', 'MC/Visa EU Card Processing (6%)', 6, 0.40, 'EUR'),
('mondo', 'EU', 'card_refund', 'Card', 'EU Card Refund', 0, 1, 'EUR'),
('mondo', 'EU', 'card_chargeback', 'Card', 'EU Card Chargeback', 0, 50, 'EUR'),
-- Mastercard/Visa Non-EU
('mondo', 'global', 'card_non_eu', 'Card', 'MC/Visa Non-EU Card Processing (7%)', 7, 0.40, 'EUR'),
('mondo', 'global', 'card_refund', 'Card', 'Non-EU Card Refund', 0, 1, 'EUR'),
('mondo', 'global', 'card_chargeback', 'Card', 'Non-EU Card Chargeback', 0, 50, 'EUR'),
-- SEPA
('mondo', 'EU', 'sepa_in', 'SEPA', 'SEPA Pay-In (1.25%)', 1.25, 0, 'EUR'),
('mondo', 'EU', 'sepa_out', 'SEPA', 'SEPA Pay-Out (1.25%)', 1.25, 0, 'EUR'),
-- SWIFT
('mondo', 'global', 'swift_in', 'SWIFT', 'SWIFT Pay-In (1.5%)', 1.5, 0, 'EUR'),
('mondo', 'global', 'swift_out', 'SWIFT', 'SWIFT Pay-Out (1.5%)', 1.5, 0, 'EUR'),
-- Open Banking
('mondo', 'EU', 'open_banking', 'Open Banking', 'Open Banking (4% + €0.00)', 4, 0, 'EUR'),
('mondo', 'EU', 'open_banking_refund', 'Open Banking', 'Open Banking Refund', 0, 1, 'EUR'),
-- Virtual IBAN
('mondo', 'EU', 'viban_issuance', 'Virtual IBAN', 'Virtual IBAN Issuance (one-time)', 0, 200, 'EUR'),
('mondo', 'EU', 'viban_maintenance', 'Virtual IBAN', 'Virtual IBAN Monthly Maintenance', 0, 100, 'EUR');

-- ==================== MZZPAY USD ====================
INSERT INTO provider_fees (provider, region, fee_type, rail, description, rate_percent, flat_fee, flat_fee_currency) VALUES
('mzzpay', 'US', 'card_processing', 'Card', 'Card Processing MDR', 2.9, 0.30, 'USD'),
('mzzpay', 'US', 'card_refund', 'Card', 'Refund fee', 0, 1, 'USD'),
('mzzpay', 'US', 'card_chargeback', 'Card', 'Chargeback fee', 0, 5, 'USD'),
('mzzpay', 'US', 'ach_in', 'ACH', 'ACH Inbound', 0.8, 0, 'USD'),
('mzzpay', 'US', 'ach_out', 'ACH', 'ACH Outbound', 0.8, 0, 'USD');

-- ==================== FACILITAPAY ====================
INSERT INTO provider_fees (provider, region, fee_type, rail, description, rate_percent, flat_fee, flat_fee_currency) VALUES
('facilitapay', 'BR', 'pix', 'PIX', 'PIX Processing', 1.5, 0, 'BRL'),
('facilitapay', 'BR', 'boleto', 'Boleto', 'Boleto Processing', 0, 3.50, 'BRL'),
('facilitapay', 'MX', 'spei', 'SPEI', 'SPEI Processing', 1.2, 0, 'MXN'),
('facilitapay', 'CO', 'pse', 'PSE', 'PSE Processing', 2.0, 0, 'COP');

-- Update platform markup
DELETE FROM platform_markup;
INSERT INTO platform_markup (rail, markup_percent, markup_flat, markup_flat_currency, description) VALUES
('Card', 0.25, 0.10, 'USD', 'Card processing markup'),
('SEPA', 0.25, 0, 'EUR', 'SEPA markup'),
('SWIFT', 0.25, 0, 'USD', 'SWIFT markup'),
('ACH', 0.15, 0, 'USD', 'ACH markup'),
('Fedwire', 0.15, 0, 'USD', 'Fedwire markup'),
('PIX', 0.20, 0, 'BRL', 'PIX markup'),
('Open Banking', 0.25, 0, 'EUR', 'Open Banking markup'),
('Refund', 0, 1, 'USD', 'Refund fee markup'),
('Chargeback', 0, 5, 'USD', 'Chargeback fee markup'),
('Settlement', 0.25, 0, 'USD', 'Settlement markup');
