import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

/**
 * 3DS Result Callback Page
 *
 * The processor redirects here after 3DS / issuer OTP authentication.
 * Reads query params, calls confirm-3ds-result, then redirects back to
 * the originating page (stored in sessionStorage).
 *
 * Fallback: if sessionStorage keys are missing (e.g. user cleared storage,
 * opened in a new tab, or the redirect landed on a different origin),
 * we show a clear error with a manual navigation option.
 */
export default function ThreeDSecureResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [missingContext, setMissingContext] = useState(false);

  const result = useMemo(() => {
    const status = (searchParams.get('status') || searchParams.get('Status') || '').toLowerCase();
    const txRef = searchParams.get('transaction_reference') || searchParams.get('trans_id') || searchParams.get('id') || '';
    const errorCode = searchParams.get('error_code') || searchParams.get('code') || searchParams.get('respcode') || '';
    const errorMessage = searchParams.get('error_message') || searchParams.get('message') || searchParams.get('respmsg') || '';
    const txId = searchParams.get('id') || searchParams.get('transaction_id') || '';

    const isApproved = ['approved', 'success', 'completed', 'authenticated'].includes(status);
    const isDeclined = ['declined', 'failed', 'error', 'rejected'].includes(status);

    return { status, txRef, errorCode, errorMessage, txId, isApproved, isDeclined };
  }, [searchParams]);

  useEffect(() => {
    const confirm = async () => {
      const storedTxId = sessionStorage.getItem('3ds_transaction_id') || result.txId;
      const returnTo = sessionStorage.getItem('3ds_return_to');

      // Fallback: if we have no transaction ID or return path, surface a clear error
      if (!storedTxId && !returnTo) {
        setMissingContext(true);
        return;
      }

      if (storedTxId) {
        try {
          await supabase.functions.invoke('confirm-3ds-result', {
            body: {
              transaction_id: storedTxId,
              transaction_reference: result.txRef,
              status: result.isApproved ? 'completed' : 'failed',
              error_code: result.errorCode || (result.isDeclined ? '3DS_FAILED' : undefined),
              error_message: result.errorMessage,
              raw_status: result.status,
            },
          });
        } catch (e) {
          console.error('confirm-3ds-result error:', e);
        }
      }

      setConfirmed(true);

      // Clean up session storage
      const finalReturnTo = returnTo || '/';
      const outcome = result.isApproved ? 'success' : 'failed';
      sessionStorage.removeItem('3ds_transaction_id');
      sessionStorage.removeItem('3ds_return_to');

      setTimeout(() => {
        const sep = finalReturnTo.includes('?') ? '&' : '?';
        navigate(`${finalReturnTo}${sep}3ds_outcome=${outcome}&tx=${storedTxId || 'unknown'}`, { replace: true });
      }, 2000);
    };

    confirm();
  }, [result, navigate]);

  // Fallback UI when session context is missing
  if (missingContext) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-foreground">Session Context Missing</h1>
            <p className="text-sm text-muted-foreground mt-2">
              We couldn't find the original payment session for this 3D Secure callback.
              This can happen if you opened this page in a new tab or your browser cleared storage.
            </p>
          </div>

          {(result.status || result.txRef) && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono text-muted-foreground space-y-1 text-left">
              {result.status && <p>Status: {result.status}</p>}
              {result.txRef && <p>Ref: {result.txRef}</p>}
              {result.errorCode && <p>Code: {result.errorCode}</p>}
              {result.errorMessage && <p>Message: {result.errorMessage}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Button className="w-full" onClick={() => navigate('/payments/new', { replace: true })}>
              Go to Payments
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/', { replace: true })}>
              Go to Dashboard
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Secured by 3D Secure 2.0</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          {result.isApproved ? (
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
          ) : result.isDeclined ? (
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {result.isApproved
              ? 'Authentication Successful'
              : result.isDeclined
                ? 'Authentication Failed'
                : 'Processing...'}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {result.isApproved
              ? 'Your card has been verified. Redirecting…'
              : result.isDeclined
                ? result.errorMessage || 'Your bank declined the authentication.'
                : 'Waiting for authentication result...'}
          </p>
        </div>

        {(result.errorCode || result.txRef) && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono text-muted-foreground space-y-1">
            {result.txRef && <p>Ref: {result.txRef}</p>}
            {result.errorCode && <p>Code: {result.errorCode}</p>}
            {result.errorMessage && <p>Message: {result.errorMessage}</p>}
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Secured by 3D Secure 2.0</span>
        </div>
      </div>
    </div>
  );
}
