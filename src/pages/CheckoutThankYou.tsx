import { useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function CheckoutThankYou() {
  const [params] = useSearchParams();
  const amount = params.get('amount') || '';
  const currency = params.get('currency') || 'USD';
  const txId = params.get('transaction_id') || '';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Payment Successful</h1>
        {amount && (
          <p className="text-muted-foreground">
            Your payment of{' '}
            <span className="font-semibold text-foreground">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(amount))}
            </span>{' '}
            has been processed.
          </p>
        )}
        {txId && (
          <p className="text-sm text-muted-foreground">
            Transaction: <span className="font-mono">{txId.slice(0, 12)}…</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">You can close this window.</p>
        <p className="text-xs text-muted-foreground pt-4">
          Secured by <span className="font-medium text-foreground">MZZPay</span> · mzzpay.io
        </p>
      </div>
    </div>
  );
}
