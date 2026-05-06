import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, ExternalLink } from 'lucide-react';

interface ThreeDSecureResult {
  status: 'completed' | 'failed';
  transactionReference?: string;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  rawStatus?: string;
}

interface ThreeDSecureModalProps {
  open: boolean;
  onClose: () => void;
  redirectUrl: string;
  transactionId: string;
  timeoutMs?: number;
  onComplete?: (result?: ThreeDSecureResult) => void;
  onFailed?: (result?: ThreeDSecureResult) => void;
}

export function ThreeDSecureModal({ open, onClose, redirectUrl, transactionId, timeoutMs = 5 * 60_000, onComplete, onFailed }: ThreeDSecureModalProps) {
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    const data = event.data;
    if (data?.type === '3ds_complete') {
      const result: ThreeDSecureResult = {
        status: data.status,
        transactionReference: data.transactionReference,
        transactionId: data.transactionId,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        rawStatus: data.rawStatus,
      };
      if (data.status === 'completed') {
        onComplete?.(result);
      } else {
        onFailed?.(result);
      }
      onClose();
    }
  }, [onClose, onComplete, onFailed]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const result: ThreeDSecureResult = {
        status: 'failed',
        transactionId,
        errorCode: '3DS_TIMEOUT',
        errorMessage: 'Authentication timed out — issuer did not respond within the allowed window',
        rawStatus: 'timeout',
      };
      onFailed?.(result);
      onClose();
    }, timeoutMs);
    return () => window.clearTimeout(t);
  }, [open, timeoutMs, transactionId, onFailed, onClose]);

  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    };
  }, []);

  const openInPopup = () => {
    const w = 500, h = 700;
    const left = (screen.width - w) / 2;
    const top = (screen.height - h) / 2;
    popupRef.current = window.open(redirectUrl, '3ds_popup', `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg">3D Secure Authentication</DialogTitle>
          </div>
          <DialogDescription className="text-xs">Complete authentication with your bank to finalize payment.</DialogDescription>
        </DialogHeader>

        {iframeError ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <p className="text-sm text-muted-foreground text-center">
              Your bank's authentication page couldn't load in this window. Please open it in a new window to continue.
            </p>
            <Button className="gap-2" onClick={openInPopup}>
              <ExternalLink className="h-4 w-4" /> Open Bank Authentication
            </Button>
          </div>
        ) : (
          <div className="relative w-full" style={{ height: '500px' }}>
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading bank authentication...</p>
              </div>
            )}
            <iframe
              src={redirectUrl}
              className="w-full h-full border-0"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setIframeError(true); }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              title="3D Secure Authentication"
            />
          </div>
        )}

        <div className="p-3 border-t border-border flex items-center justify-between bg-muted/30">
          <p className="text-[10px] font-mono text-muted-foreground">TX: {transactionId.slice(0, 8)}</p>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={openInPopup}>
            <ExternalLink className="h-3 w-3" /> Open in new window
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
