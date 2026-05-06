import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface ValidationFieldErrors {
  [field: string]: string[];
}

// Everpay-compatible types
type ZodFieldErrors = { fieldErrors: Record<string, string[] | string | unknown>; formErrors?: string[] | string | unknown };
type ProcessorFieldErrors = { fieldErrors: Array<{ field?: string; message?: string } | string> };

export interface ValidationPayload {
  code?: string;
  error?: string;
  error_code?: string;
  provider?: string;
  validation?: ZodFieldErrors | ProcessorFieldErrors;
}

export function isValidationError(data: unknown): data is ValidationPayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as ValidationPayload;
  return (d.code === 'processor_validation_error' || d.error_code === 'processor_validation_error') && !!d.validation;
}

interface Row { field: string; messages: string[]; }

function normalize(p: ValidationPayload): Row[] {
  const v = p.validation;
  if (!v) return [];
  const fe = (v as any).fieldErrors;
  if (Array.isArray(fe)) {
    const grouped = new Map<string, string[]>();
    for (const e of fe) {
      const field = typeof e === 'object' && e ? String((e as any).field || 'form') : 'form';
      const message = typeof e === 'object' && e ? String((e as any).message || 'Invalid value') : String(e);
      const arr = grouped.get(field) ?? [];
      arr.push(message);
      grouped.set(field, arr);
    }
    return Array.from(grouped, ([field, messages]) => ({ field, messages }));
  }
  if (fe && typeof fe === 'object') {
    return Object.entries(fe).map(([field, messages]) => ({
      field,
      messages: Array.isArray(messages) ? messages.map(String) : [String(messages)],
    }));
  }
  return [];
}

const FIELD_LABELS: Record<string, string> = {
  amount: 'Amount', currency: 'Currency', paymentMethod: 'Payment method',
  customerEmail: 'Customer email', cardDetails: 'Card details',
  'cardDetails.number': 'Card number', 'cardDetails.expMonth': 'Exp. month',
  'cardDetails.expYear': 'Exp. year', 'cardDetails.cvc': 'CVV',
  'billingDetails.country': 'Billing country',
};

// New Everpay-style props
interface NewProps { data: ValidationPayload; }

// Legacy props
interface LegacyProps {
  title?: string;
  fieldErrors: ValidationFieldErrors;
  formErrors?: string[];
  className?: string;
}

type Props = NewProps | LegacyProps;

function isNewProps(p: Props): p is NewProps {
  return 'data' in p;
}

export function ValidationErrorBanner(props: Props) {
  if (isNewProps(props)) {
    const { data } = props;
    const rows = normalize(data);
    const formErrors = (() => {
      const v = (data.validation as ZodFieldErrors)?.formErrors;
      if (!v) return [];
      if (Array.isArray(v)) return v.map(String);
      return [String(v)];
    })();
    const provider = data.provider;

    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{provider ? `${provider}: ` : ''}Please correct the following</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 space-y-1.5 text-sm">
            {formErrors.map((m, i) => (
              <li key={`form-${i}`} className="flex gap-2"><span className="font-medium">•</span><span>{m}</span></li>
            ))}
            {rows.map(({ field, messages }) => (
              <li key={field} className="flex flex-wrap gap-x-2">
                <span className="font-mono text-xs font-semibold rounded bg-destructive/10 px-1.5 py-0.5">{FIELD_LABELS[field] ?? field}</span>
                <span className="text-muted-foreground">{messages.join('; ')}</span>
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  // Legacy rendering
  const { title = 'Validation Error', fieldErrors, formErrors = [], className = '' } = props;
  const hasFields = Object.keys(fieldErrors).length > 0;
  const hasFormErrors = formErrors.length > 0;
  if (!hasFields && !hasFormErrors) return null;

  return (
    <div className={`rounded-lg border border-destructive/30 bg-destructive/10 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-destructive" />
        <div className="flex-1 space-y-2">
          <p className="font-medium text-sm text-destructive">{title}</p>
          {hasFormErrors && (
            <ul className="list-disc list-inside text-xs text-destructive/90 space-y-0.5">
              {formErrors.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          )}
          {hasFields && (
            <div className="space-y-1.5">
              {Object.entries(fieldErrors).map(([field, messages]) => (
                <div key={field} className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-1.5">
                  <span className="font-mono text-xs font-semibold text-destructive">{field}</span>
                  <ul className="mt-0.5 list-disc list-inside text-xs text-destructive/80">
                    {messages.map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
