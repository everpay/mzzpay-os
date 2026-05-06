import { AlertTriangle } from 'lucide-react';

export interface FormValidationBannerData {
  /** Top-level form-wide errors (not tied to a specific field) */
  formErrors?: string[];
  /** Field-level errors keyed by field name */
  fieldErrors?: Record<string, string[]> | null;
}

interface Props {
  data: FormValidationBannerData | null;
  onDismiss?: () => void;
}

/**
 * Global form validation banner — unified across NewPayment, Checkout, PayInvoice.
 * Shows a single consolidated banner with all field and form errors.
 */
export function FormValidationBanner({ data, onDismiss }: Props) {
  if (!data) return null;

  const hasFieldErrors = data.fieldErrors && Object.keys(data.fieldErrors).length > 0;
  const hasFormErrors = data.formErrors && data.formErrors.length > 0;
  if (!hasFieldErrors && !hasFormErrors) return null;

  return (
    <div
      role="alert"
      data-testid="form-validation-banner"
      className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 text-sm"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-destructive">Please fix the following errors</p>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded p-1 text-destructive/60 hover:text-destructive transition-colors"
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>

          {hasFormErrors && (
            <ul className="mt-2 list-disc pl-5 space-y-0.5 text-destructive/90">
              {data.formErrors!.map((msg, i) => (
                <li key={`form-${i}`}>{msg}</li>
              ))}
            </ul>
          )}

          {hasFieldErrors && (
            <ul className="mt-2 list-disc pl-5 space-y-1 text-destructive/90">
              {Object.entries(data.fieldErrors!).map(([field, messages]) => (
                <li key={field}>
                  <span className="font-mono text-xs px-1 py-0.5 rounded bg-destructive/10">{field}</span>
                  <span className="ml-1.5">{messages.join('; ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
