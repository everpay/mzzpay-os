import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreditCard, Calendar, DollarSign, AlertCircle, ShoppingBag, FileText,
  Wallet, Clock, RotateCcw, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { getTransactionStatusInfo } from '@/lib/transaction-status';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { notifyError, notifySuccess } from '@/lib/error-toast';
import { CardBrandBadge } from '@/components/CardBrandBadge';

/* ── Dunning helpers ───────────────── */
type Strategy = 'linear' | 'exponential' | 'fibonacci';
function fib(n: number): number {
  if (n <= 1) return 1;
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
function delaySeconds(attempt: number, base: number, strategy: Strategy): number {
  if (attempt < 1) return base;
  switch (strategy) {
    case 'linear': return base * attempt;
    case 'fibonacci': return base * fib(attempt);
    case 'exponential':
    default: return base * Math.pow(2, attempt - 1);
  }
}
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}
interface RetrySettings { max_attempts: number; backoff_strategy: Strategy; backoff_seconds: number; }
const DEFAULT_RETRY: RetrySettings = { max_attempts: 3, backoff_strategy: 'exponential', backoff_seconds: 60 };

/* ── Data hook ───────────────── */
function useCustomerData() {
  return useQuery({
    queryKey: ['customer-portal-data'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: customer } = await supabase
        .from('customers')
        .select('id, email, first_name, last_name, billing_address')
        .eq('email', user.email!)
        .single();

      if (!customer) return { customer: null, transactions: [], invoices: [], subscription: null, paymentMethods: [] };

      const [txRes, invRes, subRes, pmRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('customer_email', customer.email).order('created_at', { ascending: false }).limit(50),
        supabase.from('invoices').select('*').eq('customer_email', customer.email).order('created_at', { ascending: false }).limit(50),
        supabase.from('subscriptions')
          .select('*, plan:subscription_plans(name, amount, currency, interval, description), payment_method:payment_methods(id, card_brand, card_last4, exp_month, exp_year)')
          .eq('customer_id', customer.id)
          .in('status', ['active', 'past_due', 'trialing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('payment_methods').select('*').eq('customer_id', customer.id),
      ]);

      return {
        customer,
        transactions: txRes.data ?? [],
        invoices: invRes.data ?? [],
        subscription: subRes.data,
        paymentMethods: pmRes.data ?? [],
      };
    },
  });
}

export default function CustomerPortal() {
  const [isCanceling, setIsCanceling] = useState(false);
  const [showUpdatePM, setShowUpdatePM] = useState(false);
  const [updatingPM, setUpdatingPM] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newExpMonth, setNewExpMonth] = useState('');
  const [newExpYear, setNewExpYear] = useState('');
  const [newCvc, setNewCvc] = useState('');

  const { data, isLoading, refetch } = useCustomerData();

  // Dunning info for past_due subscriptions
  const { data: dunningInfo } = useQuery({
    queryKey: ['dunning-info', data?.subscription?.id],
    enabled: data?.subscription?.status === 'past_due',
    queryFn: async () => {
      let settings = DEFAULT_RETRY;
      const { data: events } = await (supabase.from as any)('provider_events')
        .select('id, event_type, payload, created_at')
        .or('event_type.eq.payment.retry,event_type.eq.payment.retry_failed,event_type.eq.payment.retry_success,event_type.eq.subscription.payment_failed')
        .order('created_at', { ascending: false })
        .limit(10);

      const relevantEvents = (events ?? []).filter((ev: any) =>
        ev.payload?.subscription_id === data?.subscription?.id
      );
      const attemptsSoFar = relevantEvents.filter((ev: any) =>
        ev.event_type === 'payment.retry' || ev.event_type === 'payment.retry_failed'
      ).length;
      const lastFailure = relevantEvents.find((ev: any) =>
        ev.event_type === 'payment.retry_failed' || ev.event_type === 'subscription.payment_failed'
      );

      return { settings, events: relevantEvents, attemptsSoFar, lastFailure };
    },
  });

  const handleCancelSubscription = async () => {
    if (!data?.subscription) return;
    setIsCanceling(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', data.subscription.id);
      if (error) throw error;
      notifySuccess('Subscription canceled successfully');
      refetch();
    } catch {
      notifyError('Failed to cancel subscription');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    if (!data?.subscription || !data?.customer) return;
    setUpdatingPM(true);
    try {
      // Save new card as payment method
      const cleanNum = newCardNumber.replace(/\s/g, '');
      const { data: pm, error: pmError } = await supabase
        .from('payment_methods')
        .insert({
          customer_id: data.customer.id,
          card_brand: detectCardBrand(cleanNum),
          card_last4: cleanNum.slice(-4),
          exp_month: newExpMonth,
          exp_year: newExpYear,
          is_default: true,
          vgs_alias: `tok_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
        })
        .select('id')
        .single();

      if (pmError) throw pmError;

      // Update subscription to use new payment method
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ payment_method_id: pm.id })
        .eq('id', data.subscription.id);
      if (subError) throw subError;

      // If past_due, attempt immediate retry
      if (data.subscription.status === 'past_due') {
        try {
          await supabase.functions.invoke('retry-payment', {
            body: {
              subscription_id: data.subscription.id,
              payment_method_id: pm.id,
            },
          });
          notifySuccess('Payment method updated and renewal retry initiated');
        } catch {
          notifySuccess('Payment method updated — retry will happen on next cycle');
        }
      } else {
        notifySuccess('Payment method updated successfully');
      }

      setShowUpdatePM(false);
      setNewCardNumber(''); setNewExpMonth(''); setNewExpYear(''); setNewCvc('');
      refetch();
    } catch (err: any) {
      notifyError(err.message || 'Failed to update payment method');
    } finally {
      setUpdatingPM(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'active' || s === 'completed' || s === 'paid') return 'bg-success/10 text-success border-success/20';
    if (s === 'canceled' || s === 'failed') return 'bg-destructive/10 text-destructive border-destructive/20';
    if (s === 'pending' || s === 'past_due' || s === 'draft' || s === 'trialing') return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-muted text-muted-foreground';
  };

  const formatCardNum = (v: string) => {
    const cleaned = v.replace(/\D/g, '');
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  };

  const retrySchedule = dunningInfo ? Array.from({ length: dunningInfo.settings.max_attempts }, (_, i) => {
    const delay = delaySeconds(i + 1, dunningInfo.settings.backoff_seconds, dunningInfo.settings.backoff_strategy);
    const completed = i < dunningInfo.attemptsSoFar;
    const isCurrent = i === dunningInfo.attemptsSoFar;
    return { attempt: i + 1, delay, completed, isCurrent };
  }) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="font-heading text-xl font-bold text-foreground">MZZPay Billing</h1>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No Account Found</p>
              <p className="text-sm text-muted-foreground text-center">
                Your email is not associated with any customer account yet.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { transactions, invoices, subscription, paymentMethods } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground">MZZPay Billing</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.customer.first_name || data.customer.email}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{transactions.length}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
                <p className="text-xs text-muted-foreground">Invoices</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Wallet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{paymentMethods.length}</p>
                <p className="text-xs text-muted-foreground">Payment Methods</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders" className="gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Orders</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Invoices</TabsTrigger>
            <TabsTrigger value="subscription" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Subscription</TabsTrigger>
            <TabsTrigger value="payment-methods" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Payment Methods</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>Your past transactions and purchases</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No orders yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx: any) => {
                        const info = getTransactionStatusInfo(tx.status, tx.metadata);
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(tx.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-foreground">
                              {tx.description || 'Payment'}
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                              {formatCurrency(tx.amount, tx.currency)}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant={info.variant}>{info.label}</Badge>
                                  </TooltipTrigger>
                                  {info.reason && (
                                    <TooltipContent>
                                      <p className="text-xs">{info.reason}{info.responseCode ? ` (${info.responseCode})` : ''}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>View and download your invoices</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No invoices yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="text-sm font-medium text-foreground">
                            {inv.invoice_number || inv.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(inv.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-sm font-semibold">
                            {formatCurrency(inv.amount, inv.currency)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColor(inv.status)}>{inv.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            {!subscription ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">No Active Subscription</p>
                  <p className="text-sm text-muted-foreground">You don't have any active subscriptions.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Current Plan</CardTitle>
                    <Badge className={statusColor(subscription.status)}>{subscription.status}</Badge>
                  </div>
                  <CardDescription>Your active subscription details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Past-due dunning banner */}
                  {subscription.status === 'past_due' && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-warning">
                            Payment past due — automatic retries in progress
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            We&rsquo;re retrying your renewal payment automatically.
                            Update your payment method if the issue persists.
                          </p>
                        </div>
                      </div>

                      {dunningInfo?.lastFailure && (
                        <div className="rounded-md bg-destructive/5 border border-destructive/20 px-3 py-2">
                          <p className="text-xs font-medium text-destructive">Last failure reason</p>
                          <p className="text-xs text-destructive/80 mt-0.5">
                            {dunningInfo.lastFailure.payload?.failure_reason ||
                             dunningInfo.lastFailure.payload?.error_message ||
                             'Payment was declined by the issuer'}
                          </p>
                        </div>
                      )}

                      {retrySchedule.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Retry Schedule
                          </p>
                          <div className="space-y-1">
                            {retrySchedule.map((step) => (
                              <div key={step.attempt} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                                step.completed ? 'bg-destructive/5 text-destructive/70' :
                                step.isCurrent ? 'bg-warning/10 text-warning font-medium border border-warning/30' :
                                'bg-muted/40 text-muted-foreground'
                              }`}>
                                {step.completed ? <XCircle className="h-3 w-3 shrink-0" /> :
                                 step.isCurrent ? <RotateCcw className="h-3 w-3 shrink-0 animate-spin" /> :
                                 <Clock className="h-3 w-3 shrink-0" />}
                                <span>Attempt {step.attempt}</span>
                                <span className="ml-auto font-mono text-[10px]">+{formatDuration(step.delay)}</span>
                                {step.completed && <span className="text-[10px]">failed</span>}
                                {step.isCurrent && <span className="text-[10px]">next</span>}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {dunningInfo!.attemptsSoFar}/{dunningInfo!.settings.max_attempts} attempts used
                            · {dunningInfo!.settings.backoff_strategy} backoff
                          </p>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => setShowUpdatePM(true)}
                        className="w-full"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        Update Payment Method &amp; Retry Now
                      </Button>
                    </div>
                  )}

                  <div>
                    <p className="text-2xl font-bold">{subscription.plan?.name}</p>
                    {subscription.plan?.description && (
                      <p className="text-sm text-muted-foreground mt-1">{subscription.plan.description}</p>
                    )}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" /><span className="text-sm">Amount</span>
                    </div>
                    <span className="text-lg font-semibold">
                      {formatCurrency(subscription.plan?.amount, subscription.plan?.currency as any)} / {subscription.plan?.interval}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" /><span className="text-sm">Next Billing</span>
                    </div>
                    <span className="font-medium">
                      {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {subscription.trial_end && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" /><span className="text-sm">Trial Ends</span>
                      </div>
                      <span className="font-medium">
                        {format(new Date(subscription.trial_end), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}

                  {/* Current payment method */}
                  {subscription.payment_method && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CreditCard className="h-4 w-4" /><span className="text-sm">Card on file</span>
                        </div>
                        <CardBrandBadge
                          brand={subscription.payment_method.card_brand}
                          last4={subscription.payment_method.card_last4}
                          expMonth={subscription.payment_method.exp_month}
                          expYear={subscription.payment_method.exp_year}
                          size="sm"
                        />
                      </div>
                    </>
                  )}

                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowUpdatePM(true)}>
                      Update Payment Method
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex-1" disabled={isCanceling}>
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will cancel your subscription. You'll have access until{' '}
                            {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Cancel Subscription
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment-methods">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Your saved cards and payment methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No saved payment methods</div>
                ) : (
                  paymentMethods.map((pm: any) => (
                    <div key={pm.id} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background">
                        <CreditCard className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {pm.card_brand || 'Card'} •••• {pm.card_last4}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Expires {pm.exp_month}/{pm.exp_year}
                        </p>
                      </div>
                      {pm.is_default && <Badge variant="outline">Default</Badge>}
                    </div>
                  ))
                )}
                <Button variant="outline" className="w-full mt-2" onClick={() => setShowUpdatePM(true)}>
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">
            Secured by <span className="font-medium text-foreground">MZZPay</span> · billing.mzzpay.io
          </p>
        </div>
      </div>

      {/* Update Payment Method Dialog */}
      <Dialog open={showUpdatePM} onOpenChange={setShowUpdatePM}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>
              Enter your new card details.
              {data?.subscription?.status === 'past_due' && (
                <span className="block mt-1 text-warning font-medium">
                  A renewal retry will be attempted immediately after saving.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Card Number</Label>
              <Input
                placeholder="4242 4242 4242 4242"
                value={formatCardNum(newCardNumber)}
                onChange={(e) => setNewCardNumber(e.target.value.replace(/\s/g, ''))}
                className="font-mono"
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Month</Label>
                <Input placeholder="12" value={newExpMonth} onChange={(e) => setNewExpMonth(e.target.value)} maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Year</Label>
                <Input placeholder="2027" value={newExpYear} onChange={(e) => setNewExpYear(e.target.value)} maxLength={4} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">CVC</Label>
                <Input placeholder="123" value={newCvc} onChange={(e) => setNewCvc(e.target.value)} maxLength={4} type="password" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdatePM(false)}>Cancel</Button>
            <Button
              onClick={handleUpdatePaymentMethod}
              disabled={updatingPM || !newCardNumber || !newExpMonth || !newExpYear || !newCvc}
            >
              {updatingPM ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving…</> : 'Save & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function detectCardBrand(num: string): string {
  if (/^4/.test(num)) return 'visa';
  if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^6(?:011|5)/.test(num)) return 'discover';
  return 'unknown';
}
