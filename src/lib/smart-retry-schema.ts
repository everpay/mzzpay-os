import { z } from 'zod';

export const BACKOFF_STRATEGIES = ['linear', 'exponential', 'fibonacci'] as const;
export type BackoffStrategy = (typeof BACKOFF_STRATEGIES)[number];

/** Shared validation for a single decline code string. */
export const declineCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => v.replace(/\s+/g, '_'))
  .pipe(
    z
      .string()
      .min(1, 'Code cannot be empty')
      .max(50, 'Code must be 50 characters or fewer')
      .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
  );

/** Full Smart Retry settings schema — used for save validation on both client & API. */
export const smartRetrySchema = z.object({
  enabled: z.boolean(),
  max_attempts: z
    .number({ invalid_type_error: 'Must be a number' })
    .int('Must be a whole number')
    .min(1, 'Minimum 1 attempt')
    .max(10, 'Maximum 10 attempts'),
  backoff_strategy: z.enum(BACKOFF_STRATEGIES),
  backoff_seconds: z
    .number({ invalid_type_error: 'Must be a number' })
    .int('Must be a whole number')
    .min(10, 'Minimum 10 seconds')
    .max(86400, 'Maximum 86,400 seconds (24 hours)'),
  retry_decline_codes: z
    .array(z.string())
    .min(1, 'At least one decline code is required'),
});

export type SmartRetrySettings = z.infer<typeof smartRetrySchema>;

/**
 * Validate settings and return a field → message error map (empty = valid).
 * Designed for inline UI error display.
 */
export function validateSmartRetry(data: unknown): Record<string, string> {
  const result = smartRetrySchema.safeParse(data);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0]?.toString();
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
