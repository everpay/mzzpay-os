import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Shield, AlertTriangle, CheckCircle2, FileCode2 } from 'lucide-react';
import {
  MATRIX_FIELD_RULES,
  MATRIX_RESULT_CODES,
  MATRIX_STATUS_DESCRIPTIONS,
  type MatrixStatus,
} from '@/lib/matrix-status';
import { getStatusVariant } from '@/lib/format';

interface ProcessorValidationRulesDrawerProps {
  /** Currently-selected processor in the form. We highlight Matrix when matched. */
  provider?: string;
  /** Optional custom trigger; defaults to a small outline button. */
  trigger?: React.ReactNode;
}

const STATUS_ORDER: MatrixStatus[] = [
  'initial',
  'pending',
  'success',
  'error',
  'declined',
  'suspended',
  'blocked',
];

/**
 * In-app reference drawer that documents the Matrix `/api/payments`
 * contract — required fields, formats, status vocabulary, and numeric
 * result codes — so the merchant can verify the payload BEFORE submitting
 * and avoid `processor_validation_error` round trips.
 */
export function ProcessorValidationRulesDrawer({
  provider,
  trigger,
}: ProcessorValidationRulesDrawerProps) {
  const isMatrix = provider === 'matrix';
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Validation rules
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-primary" />
            <SheetTitle className="font-heading">Processor validation rules</SheetTitle>
          </div>
          <SheetDescription>
            Required fields, formats and status codes the gateway enforces on{' '}
            <code className="font-mono text-foreground">/api/payments</code>.{' '}
            {isMatrix && (
              <span className="font-medium text-foreground">Currently routing to Matrix.</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-7">
            {/* SECTION: Required fields ------------------------------------- */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Matrix · required fields
              </h3>
              <ul className="space-y-3">
                {MATRIX_FIELD_RULES.map((rule) => (
                  <li
                    key={rule.field}
                    className="rounded-xl border border-border bg-card/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <code className="font-mono text-sm font-semibold text-foreground">
                        {rule.field}
                      </code>
                      {rule.required ? (
                        <Badge variant="destructive" className="text-[10px]">required</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">optional</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {rule.description}
                    </p>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      <span className="text-foreground/70">Format:</span> {rule.format}
                    </div>
                    {rule.example && (
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        <span className="text-foreground/70">Example:</span> {rule.example}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <Separator />

            {/* SECTION: Status vocabulary ---------------------------------- */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Transaction statuses
              </h3>
              <ul className="space-y-2">
                {STATUS_ORDER.map((s) => (
                  <li
                    key={s}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-3"
                  >
                    <Badge variant={getStatusVariant(s)} className="capitalize shrink-0">
                      {s}
                    </Badge>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {MATRIX_STATUS_DESCRIPTIONS[s]}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <Separator />

            {/* SECTION: Result codes --------------------------------------- */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Transaction result codes
              </h3>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Code</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Description</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(MATRIX_RESULT_CODES).map(([code, info]) => (
                      <tr key={code}>
                        <td className="px-3 py-2 font-mono text-foreground">{code}</td>
                        <td className="px-3 py-2 text-muted-foreground">{info.label}</td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusVariant(info.status)} className="text-[10px] capitalize">
                            {info.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <Separator />

            {/* SECTION: Pre-flight checklist ------------------------------- */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Pre-flight checklist
              </h3>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>
                    Card flow: call <code className="font-mono">/v1/customer/token</code> first,
                    then chain the returned <code className="font-mono">customer_token</code>{' '}
                    into the <code className="font-mono">pay</code> request.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>
                    <code className="font-mono">order_id</code> stays stable across retries
                    so cascading routes use the same order.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>
                    Matrix is <strong>blocked for US billing addresses</strong> — the request
                    will be rejected with code <code className="font-mono">REGION_BLOCKED</code>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>
                    Code <code className="font-mono">2099</code> means the transaction is{' '}
                    <em>cascading after 3DS</em> — keep polling{' '}
                    <code className="font-mono">/v1/transaction/status</code> until terminal.
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
