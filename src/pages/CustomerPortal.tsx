import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { formatCurrency } from '@/lib/format';
import { CardBrandBadge } from '@/components/CardBrandBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { notifyError, notifySuccess } from '@/lib/error-toast';

export default function CustomerPortal() {
  const [isCanceling, setIsCanceling] = useState(false);

  const { data: subscription, refetch } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!customer) return null;

      // Get active subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(name, amount, currency, interval, description),
          payment_method:payment_methods(card_brand, card_last4, exp_month, exp_year)
        `)
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
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
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'canceled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'past_due':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Plan</CardTitle>
                <Badge className={getStatusColor(subscription.status)}>{subscription.status}</Badge>
              </div>
              <CardDescription>Your active subscription details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </div>
      )}
    </AppLayout>
  );
}
