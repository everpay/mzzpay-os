import { useSearchParams, Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckoutDeclined() {
  const [params] = useSearchParams();
  const amount = params.get('amount') || '';
  const currency = params.get('currency') || 'USD';
  const ref = params.get('ref') || '';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Payment Declined</h1>
        {amount && (
          <p className="text-muted-foreground">
            Your payment of{' '}
            <span className="font-semibold text-foreground">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(amount))}
            </span>{' '}
            could not be processed.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Please try again with a different payment method or contact your bank.
        </p>
        {ref && (
          <Button asChild variant="outline">
            <Link to={`/checkout?ref=${ref}&currency=${currency}&amount=${amount}`}>
              Try Again
            </Link>
          </Button>
        )}
        <p className="text-xs text-muted-foreground pt-4">
          Secured by <span className="font-medium text-foreground">MZZPay</span> · mzzpay.io
        </p>
      </div>
    </div>
  );
}
