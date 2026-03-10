import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, ExternalLink } from 'lucide-react';

interface ThreeDSecureModalProps {
  open: boolean;
  onClose: () => void;
  redirectUrl: string;
  transactionId: string;
  onComplete?: () => void;
}

export function ThreeDSecureModal({ open, onClose, redirectUrl, transactionId, onComplete }: ThreeDSecureModalProps) {
  const [loading, setLoading] = useState(true);

  const handleMessage = useCallback((event: MessageEvent) => {
    // Listen for 3DS completion messages from the iframe
    if (event.data?.type === '3ds_complete' || event.data?.status === 'completed') {
      onComplete?.();
      onClose();
    }
  }, [onClose, onComplete]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const handleOpenExternal = () => {
    window.open(redirectUrl, '_blank', 'width=500,height=700,scrollbars=yes');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg">3D Secure Authentication</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Complete authentication with your bank to finalize payment.
          </DialogDescription>
        </DialogHeader>

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
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
            title="3D Secure Authentication"
          />
        </div>

        <div className="p-3 border-t border-border flex items-center justify-between bg-muted/30">
          <p className="text-[10px] font-mono text-muted-foreground">TX: {transactionId.slice(0, 8)}</p>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={handleOpenExternal}>
            <ExternalLink className="h-3 w-3" /> Open in new window
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
