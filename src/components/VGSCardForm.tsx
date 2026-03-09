import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VGSCardFormProps {
  onTokenReceived: (token: string) => void;
  isSubmitting?: boolean;
}

export function VGSCardForm({ onTokenReceived, isSubmitting = false }: VGSCardFormProps) {
  const [isVGSReady, setIsVGSReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const formRef = useRef<any>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cvcRef = useRef<HTMLDivElement>(null);
  const expDateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load VGS Collect.js script
    const script = document.createElement('script');
    script.src = 'https://js.verygoodvault.com/vgs-collect/2.13.0/vgs-collect.js';
    script.async = true;
    
    script.onload = () => {
      initializeVGS();
    };

    script.onerror = () => {
      toast.error('Failed to load VGS security module');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      if (formRef.current) {
        formRef.current = null;
      }
      document.body.removeChild(script);
    };
  }, []);

  const initializeVGS = () => {
    try {
      // @ts-ignore - VGS Collect global
      const form = window.VGSCollect.create(
        import.meta.env.VITE_VGS_VAULT_ID || 'tntxvbqvs1f',
        import.meta.env.VITE_VGS_ENVIRONMENT || 'sandbox',
        (state: any) => {
          console.log('VGS State:', state);
        }
      );

      formRef.current = form;

      // Create card number field
      const cardNumber = form.field('#card-number', {
        type: 'card-number',
        name: 'card_number',
        placeholder: '4242 4242 4242 4242',
        validations: ['required', 'validCardNumber'],
        showCardIcon: true,
        css: getFieldStyles(),
      });

      // Create CVC field
      const cvc = form.field('#card-cvc', {
        type: 'card-security-code',
        name: 'card_cvc',
        placeholder: '123',
        validations: ['required', 'validCardSecurityCode'],
        css: getFieldStyles(),
      });

      // Create expiration date field
      const expDate = form.field('#card-exp', {
        type: 'card-expiration-date',
        name: 'card_exp',
        placeholder: 'MM / YY',
        validations: ['required', 'validCardExpirationDate'],
        css: getFieldStyles(),
      });

      setIsVGSReady(true);
      setIsLoading(false);
      toast.success('Secure payment form loaded');
    } catch (error) {
      console.error('VGS initialization error:', error);
      toast.error('Failed to initialize secure payment form');
      setIsLoading(false);
    }
  };

  const getFieldStyles = () => ({
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: 'hsl(var(--foreground))',
    '&::placeholder': {
      color: 'hsl(var(--muted-foreground))',
    },
    '&:focus': {
      outline: 'none',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formRef.current) {
      toast.error('Payment form not ready');
      return;
    }

    try {
      setIsLoading(true);
      
      // Submit to VGS and get tokens
      formRef.current.submit(
        '/post',
        {},
        (status: number, data: any) => {
          if (status === 200) {
            // Extract the token/alias from VGS response
            const token = data.json?.card_number || data.json?.vgs_alias;
            if (token) {
              onTokenReceived(token);
              toast.success('Card securely tokenized');
            } else {
              toast.error('Failed to tokenize card');
            }
          } else {
            console.error('VGS Submit Error:', data);
            toast.error('Card validation failed');
          }
          setIsLoading(false);
        },
        (errors: any) => {
          console.error('VGS Validation Errors:', errors);
          toast.error('Please check your card details');
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('VGS Submit Error:', error);
      toast.error('Failed to process card');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Recurring Payment Setup</p>
            <p className="text-xs text-muted-foreground">Powered by VGS — Securely vault card for recurring billing</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        <div className={`space-y-4 ${isLoading ? 'hidden' : ''}`}>
          <div className="space-y-2">
            <Label>Card Number</Label>
            <div 
              id="card-number" 
              ref={cardNumberRef}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiration</Label>
              <div 
                id="card-exp" 
                ref={expDateRef}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label>CVC</Label>
              <div 
                id="card-cvc" 
                ref={cvcRef}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              />
            </div>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full gap-2" 
        disabled={!isVGSReady || isLoading || isSubmitting}
      >
        {isLoading || isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Shield className="h-4 w-4" />
            Securely Save Card
          </>
        )}
      </Button>
    </form>
  );
}
