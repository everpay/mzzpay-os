import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, DollarSign, AlertCircle, Clock, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { formatCurrency } from '@/lib/format';
import { CardBrandBadge } from '@/components/CardBrandBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { notifyError, notifySuccess } from '@/lib/error-toast';

/* ── Dunning retry schedule helpers ───────────────── */

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

interface RetrySettings {
  max_attempts: number;
  backoff_strategy: Strategy;
  backoff_seconds: number;
}

const DEFAULT_RETRY: RetrySettings = { max_attempts: 3, backoff_strategy: 'exponential', backoff_seconds: 60 };

export default function CustomerPortal() {
  const [isCanceling, setIsCanceling] = useState(false);

  const { data: subscription, refetch } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!customer) return null;

      // Query both active AND past_due subscriptions so the dunning UI renders
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(name, amount, currency, interval, description),
          payment_method:payment_methods(card_brand, card_last4, exp_month, exp_year)
        `)
        .eq('customer_id', customer.id)
        .in('status', ['active', 'past_due', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch retry settings & recent dunning events when subscription is past_due
  const { data: dunningInfo } = useQuery({
    queryKey: ['dunning-info', subscription?.id],
    enabled: subscription?.status === 'past_due',
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get merchant's retry settings
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let settings = DEFAULT_RETRY;
      if (merchant) {
        const { data: rs } = await (supabase.from as any)('retry_settings')
          .select('max_attempts, backoff_strategy, backoff_seconds')
          .eq('merchant_id', merchant.id)
          .maybeSingle();
        if (rs) settings = rs as RetrySettings;
      }

      // Get recent dunning provider events for this subscription
      const { data: events } = await (supabase.from as any)('provider_events')
        .select('id, event_type, payload, created_at')
        .or(`event_type.eq.payment.retry,event_type.eq.payment.retry_failed,event_type.eq.payment.retry_success,event_type.eq.subscription.payment_failed`)
        .order('created_at', { ascending: false })
        .limit(10);

      // Filter events relevant to this subscription
      const relevantEvents = (events ?? []).filter((ev: any) =>
        ev.payload?.subscription_id === subscription?.id
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

  // Fetch subscription lifecycle events for the activity feed
  const { data: activityEvents } = useQuery({
    queryKey: ['subscription-activity', subscription?.id],
    enabled: !!subscription,
    queryFn: async () => {
      const { data: events } = await (supabase.from as any)('provider_events')
        .select('id, event_type, payload, created_at, provider')
        .in('event_type', [
          'payment.created', 'payment.approved', 'payment.declined', 'payment.retry',
          'payment.retry_failed', 'payment.retry_success',
          'subscription.payment_failed', 'subscription.renewed', 'subscription.canceled',
        ])
        .order('created_at', { ascending: false })
        .limit(20);

      return (events ?? []).filter((ev: any) =>
        ev.payload?.subscription_id === subscription?.id ||
        ev.event_type?.startsWith('subscription.')
      ).slice(0, 8);
    },
  });

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    setIsCanceling(true);

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      notifySuccess('Subscription canceled successfully');
      refetch();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      notifyError('Failed to cancel subscription');
    } finally {
      setIsCanceling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'canceled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'past_due':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'trialing':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Build retry schedule for dunning display
  const retrySchedule = dunningInfo ? Array.from({ length: dunningInfo.settings.max_attempts }, (_, i) => {
    const delay = delaySeconds(i + 1, dunningInfo.settings.backoff_seconds, dunningInfo.settings.backoff_strategy);
    const completed = i < dunningInfo.attemptsSoFar;
    const isCurrent = i === dunningInfo.attemptsSoFar;
    return { attempt: i + 1, delay, completed, isCurrent };
  }) : [];

  const eventIcon = (type: string) => {
    if (type.includes('success') || type.includes('approved') || type.includes('renewed')) return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (type.includes('failed') || type.includes('declined') || type.includes('canceled')) return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    if (type.includes('retry')) return <RotateCcw className="h-3.5 w-3.5 text-warning" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const eventLabel = (type: string) => {
    const map: Record<string, string> = {
      'payment.retry': 'Retry attempted',
      'payment.retry_failed': 'Retry failed',
      'payment.retry_success': 'Retry succeeded',
      'payment.approved': 'Payment approved',
      'payment.declined': 'Payment declined',
      'payment.created': 'Payment created',
      'subscription.payment_failed': 'Renewal payment failed',
      'subscription.renewed': 'Subscription renewed',
      'subscription.canceled': 'Subscription canceled',
    };
    return map[type] || type.replace(/\./g, ' ');
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Customer Portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your subscription and payment methods</p>
      </div>

      {!subscription ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No Active Subscription</p>
            <p className="text-sm text-muted-foreground">You don't have any active subscriptions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Current Plan</CardTitle>
                  <Badge className={getStatusColor(subscription.status)}>{subscription.status}</Badge>
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
                        <p className="text-sm font-medium text-warning">Payment past due — automatic retries in progress</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          We&rsquo;re retrying your renewal payment automatically. Update your payment method if the issue persists.
                        </p>
                      </div>
                    </div>

                    {/* Last failure reason */}
                    {dunningInfo?.lastFailure && (
                      <div className="rounded-md bg-destructive/5 border border-destructive/20 px-3 py-2">
                        <p className="text-xs font-medium text-destructive">Last failure reason</p>
                        <p className="text-xs text-destructive/80 mt-0.5">
                          {dunningInfo.lastFailure.payload?.failure_reason ||
                           dunningInfo.lastFailure.payload?.error_message ||
                           'Payment was declined by the issuer'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(dunningInfo.lastFailure.created_at).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Retry schedule timeline */}
                    {retrySchedule.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Retry Schedule</p>
                        <div className="space-y-1">
                          {retrySchedule.map((step) => (
                            <div key={step.attempt} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                              step.completed ? 'bg-destructive/5 text-destructive/70' :
                              step.isCurrent ? 'bg-warning/10 text-warning font-medium border border-warning/30' :
                              'bg-muted/40 text-muted-foreground'
                            }`}>
                              {step.completed ? (
                                <XCircle className="h-3 w-3 shrink-0" />
                              ) : step.isCurrent ? (
                                <RotateCcw className="h-3 w-3 shrink-0 animate-spin" />
                              ) : (
                                <Clock className="h-3 w-3 shrink-0" />
                              )}
                              <span>Attempt {step.attempt}</span>
                              <span className="ml-auto font-mono text-[10px]">
                                +{formatDuration(step.delay)}
                              </span>
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
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Amount</span>
                  </div>
                  <span className="text-lg font-semibold">
                    {formatCurrency(subscription.plan?.amount, subscription.plan?.currency as any)} / {subscription.plan?.interval}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Next Billing Date</span>
                  </div>
                  <span className="font-medium">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </span>
                </div>

                {subscription.trial_end && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Trial Ends</span>
                    </div>
                    <span className="font-medium">
                      {new Date(subscription.trial_end).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <Separator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isCanceling}>
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel your subscription. You'll continue to have access until{' '}
                        {new Date(subscription.current_period_end).toLocaleDateString()}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Cancel Subscription
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Your saved payment information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription.payment_method ? (
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <CardBrandBadge
                      brand={subscription.payment_method.card_brand}
                      last4={subscription.payment_method.card_last4}
                      expMonth={subscription.payment_method.exp_month}
                      expYear={subscription.payment_method.exp_year}
                      size="md"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment method on file
                  </div>
                )}

                <Button variant="outline" className="w-full">
                  Update Payment Method
                </Button>
              </CardContent>
            </Card>

            {/* Subscription Activity Feed */}
            {activityEvents && activityEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription className="text-xs">Subscription lifecycle events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activityEvents.map((ev: any) => (
                      <div key={ev.id} className="flex items-start gap-2.5 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                        {eventIcon(ev.event_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{eventLabel(ev.event_type)}</p>
                          {ev.payload?.error_message && (
                            <p className="text-[10px] text-destructive/80 mt-0.5 truncate">{ev.payload.error_message}</p>
                          )}
                          {ev.payload?.failure_reason && (
                            <p className="text-[10px] text-destructive/80 mt-0.5 truncate">{ev.payload.failure_reason}</p>
                          )}
                          {ev.payload?.amount && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatCurrency(ev.payload.amount, ev.payload.currency)} · {ev.provider}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(ev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
