import { AlertTriangle } from 'lucide-react';

export interface ValidationFieldErrors {
  [field: string]: string[];
}

interface Props {
  title?: string;
  fieldErrors: ValidationFieldErrors;
  formErrors?: string[];
  className?: string;
}

/**
 * Renders processor_validation_error responses with inline field-level detail
 * instead of a single summary string.
 */
export function ValidationErrorBanner({ title = 'Validation Error', fieldErrors, formErrors = [], className = '' }: Props) {
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
              {formErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}

          {hasFields && (
            <div className="space-y-1.5">
              {Object.entries(fieldErrors).map(([field, messages]) => (
                <div key={field} className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-1.5">
                  <span className="font-mono text-xs font-semibold text-destructive">{field}</span>
                  <ul className="mt-0.5 list-disc list-inside text-xs text-destructive/80">
                    {messages.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
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
