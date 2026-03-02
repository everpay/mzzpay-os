import { Transaction, Account, Payout, ProviderEvent } from './types';

export const mockAccounts: Account[] = [
  { id: '1', merchant_id: 'm1', currency: 'USD', balance: 284750.42, pending_balance: 12340.00, available_balance: 272410.42 },
  { id: '2', merchant_id: 'm1', currency: 'EUR', balance: 156230.18, pending_balance: 8900.00, available_balance: 147330.18 },
  { id: '3', merchant_id: 'm1', currency: 'GBP', balance: 89420.55, pending_balance: 3200.00, available_balance: 86220.55 },
  { id: '4', merchant_id: 'm1', currency: 'BRL', balance: 1245680.90, pending_balance: 45000.00, available_balance: 1200680.90 },
  { id: '5', merchant_id: 'm1', currency: 'MXN', balance: 562340.00, pending_balance: 18750.00, available_balance: 543590.00 },
];

export const mockTransactions: Transaction[] = [
  { id: 'tx_01', merchant_id: 'm1', amount: 2500.00, currency: 'USD', status: 'completed', provider: 'stripe', customer_email: 'alice@acme.co', description: 'Enterprise Plan - Annual', created_at: '2026-03-02T14:30:00Z', updated_at: '2026-03-02T14:30:05Z' },
  { id: 'tx_02', merchant_id: 'm1', amount: 18500.00, currency: 'BRL', status: 'completed', provider: 'facilitapay', customer_email: 'carlos@empresa.br', description: 'PIX Payment', fx_rate: 5.12, settlement_currency: 'USD', settlement_amount: 3613.28, created_at: '2026-03-02T13:15:00Z', updated_at: '2026-03-02T13:15:12Z' },
  { id: 'tx_03', merchant_id: 'm1', amount: 1200.00, currency: 'EUR', status: 'processing', provider: 'mondo', customer_email: 'hans@firma.de', description: 'SEPA Transfer', created_at: '2026-03-02T12:45:00Z', updated_at: '2026-03-02T12:45:00Z' },
  { id: 'tx_04', merchant_id: 'm1', amount: 450.00, currency: 'GBP', status: 'pending', provider: 'mondo', customer_email: 'jane@london.uk', description: 'Faster Payments', created_at: '2026-03-02T11:20:00Z', updated_at: '2026-03-02T11:20:00Z' },
  { id: 'tx_05', merchant_id: 'm1', amount: 35000.00, currency: 'MXN', status: 'completed', provider: 'facilitapay', customer_email: 'maria@empresa.mx', description: 'SPEI Payment', fx_rate: 17.45, settlement_currency: 'USD', settlement_amount: 2006.30, created_at: '2026-03-02T10:00:00Z', updated_at: '2026-03-02T10:00:08Z' },
  { id: 'tx_06', merchant_id: 'm1', amount: 890.00, currency: 'USD', status: 'failed', provider: 'stripe', customer_email: 'bob@startup.io', description: 'Card Payment - Declined', created_at: '2026-03-02T09:30:00Z', updated_at: '2026-03-02T09:30:02Z' },
  { id: 'tx_07', merchant_id: 'm1', amount: 5600.00, currency: 'EUR', status: 'completed', provider: 'mondo', customer_email: 'pierre@societe.fr', description: 'SEPA Direct Debit', created_at: '2026-03-01T16:00:00Z', updated_at: '2026-03-01T16:00:10Z' },
  { id: 'tx_08', merchant_id: 'm1', amount: 75000.00, currency: 'BRL', status: 'processing', provider: 'facilitapay', description: 'Boleto Payment', fx_rate: 5.14, settlement_currency: 'USD', settlement_amount: 14591.44, created_at: '2026-03-01T14:30:00Z', updated_at: '2026-03-01T14:30:00Z' },
  { id: 'tx_09', merchant_id: 'm1', amount: 320.00, currency: 'GBP', status: 'refunded', provider: 'mondo', customer_email: 'sarah@company.uk', description: 'Refund - Order #4521', created_at: '2026-03-01T10:15:00Z', updated_at: '2026-03-01T12:00:00Z' },
  { id: 'tx_10', merchant_id: 'm1', amount: 1500.00, currency: 'USD', status: 'completed', provider: 'stripe', customer_email: 'team@agency.com', description: 'Pro Plan - Monthly', created_at: '2026-02-28T18:00:00Z', updated_at: '2026-02-28T18:00:04Z' },
];

export const mockPayouts: Payout[] = [
  { id: 'po_01', merchant_id: 'm1', amount: 50000.00, currency: 'USD', status: 'completed', destination: 'Chase ****4521', created_at: '2026-03-01T00:00:00Z' },
  { id: 'po_02', merchant_id: 'm1', amount: 25000.00, currency: 'EUR', status: 'processing', destination: 'DE89 ****7890', created_at: '2026-03-02T08:00:00Z' },
  { id: 'po_03', merchant_id: 'm1', amount: 15000.00, currency: 'GBP', status: 'pending', destination: 'Barclays ****1234', created_at: '2026-03-02T10:00:00Z' },
];

export const mockEvents: ProviderEvent[] = [
  { id: 'ev_01', provider: 'stripe', event_type: 'payment.succeeded', payload: {}, transaction_id: 'tx_01', created_at: '2026-03-02T14:30:05Z' },
  { id: 'ev_02', provider: 'facilitapay', event_type: 'pix.confirmed', payload: {}, transaction_id: 'tx_02', created_at: '2026-03-02T13:15:12Z' },
  { id: 'ev_03', provider: 'mondo', event_type: 'sepa.processing', payload: {}, transaction_id: 'tx_03', created_at: '2026-03-02T12:45:00Z' },
  { id: 'ev_04', provider: 'stripe', event_type: 'payment.failed', payload: { reason: 'card_declined' }, transaction_id: 'tx_06', created_at: '2026-03-02T09:30:02Z' },
  { id: 'ev_05', provider: 'mondo', event_type: 'refund.completed', payload: {}, transaction_id: 'tx_09', created_at: '2026-03-01T12:00:00Z' },
  { id: 'ev_06', provider: 'facilitapay', event_type: 'boleto.pending', payload: {}, transaction_id: 'tx_08', created_at: '2026-03-01T14:30:00Z' },
];

export const mockVolumeData = [
  { date: 'Feb 24', volume: 42000, count: 28 },
  { date: 'Feb 25', volume: 58000, count: 35 },
  { date: 'Feb 26', volume: 31000, count: 22 },
  { date: 'Feb 27', volume: 67000, count: 41 },
  { date: 'Feb 28', volume: 54000, count: 38 },
  { date: 'Mar 01', volume: 89000, count: 52 },
  { date: 'Mar 02', volume: 73000, count: 45 },
];
