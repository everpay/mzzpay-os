import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, DollarSign, RefreshCw, ArrowUpDown, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSubscriptionPlans, useSubscriptions } from '@/hooks/useSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Currency } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { SubscriptionAnalytics } from '@/components/SubscriptionAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function Subscriptions() {
  const { data: plans, refetch: refetchPlans } = useSubscriptionPlans();
  const { data: subscriptions, refetch: refetchSubs } = useSubscriptions();
  const [isCreating, setIsCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [newPlanId, setNewPlanId] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [proratedPreview, setProratedPreview] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const [planName, setPlanName] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planCurrency, setPlanCurrency] = useState<Currency>('USD');
  const [planInterval, setPlanInterval] = useState<'month' | 'year'>('month');
  const [planDescription, setPlanDescription] = useState('');

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!merchant) throw new Error('No merchant found');
      const { error } = await supabase.from('subscription_plans').insert({
        merchant_id: merchant.id, name: planName, amount: parseFloat(planAmount),
        currency: planCurrency, interval: planInterval, description: planDescription,
      });
      if (error) throw error;
      toast.success('Billing plan created successfully!');
      setOpen(false);
      setPlanName(''); setPlanAmount(''); setPlanDescription('');
      refetchPlans();
    } catch (err) {
      toast.error('Failed to create billing plan');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePreviewProration = async () => {
    if (!selectedSub || !newPlanId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('prorate-subscription', {
        body: { subscription_id: selectedSub.id, new_plan_id: newPlanId },
      });
      if (error) throw error;
      setProratedPreview(data.proration);
    } catch (err) {
      toast.error('Failed to calculate proration');
    }
  };

  const handleChangePlan = async () => {
    if (!selectedSub || !newPlanId) return;
    setIsChanging(true);
    try {
      const { data, error } = await supabase.functions.invoke('prorate-subscription', {
        body: { subscription_id: selectedSub.id, new_plan_id: newPlanId },
      });
      if (error) throw error;
      const proration = data.proration;
      toast.success(`Plan ${proration.is_upgrade ? 'upgraded' : 'downgraded'} to ${proration.new_plan}`, {
        description: `Prorated ${proration.is_upgrade ? 'charge' : 'credit'}: ${formatCurrency(Math.abs(proration.prorated_amount), proration.currency)}`,
      });
      setChangePlanOpen(false);
      setProratedPreview(null);
      refetchSubs();
    } catch (err) {
      toast.error('Failed to change plan');
    } finally {
      setIsChanging(false);
    }
  };

  const handleRetryPayment = async (subId: string) => {
    setIsRetrying(subId);
    try {
      const { data, error } = await supabase.functions.invoke('retry-payment', {
        body: { subscription_id: subId, force: true },
      });
      if (error) throw error;
      const result = data.results?.[0];
      if (result?.action === 'retry_succeeded') {
        toast.success('Payment retry successful! Subscription reactivated.');
      } else {
        toast.error('Payment retry failed. Customer will be notified.');
      }
      refetchSubs();
    } catch (err) {
      toast.error('Failed to retry payment');
    } finally {
      setIsRetrying(null);
    }
  };

  const handleSendAlert = async (sub: any, alertType: string) => {
    try {
      const { error } = await supabase.functions.invoke('subscription-alerts', {
        body: { type: alertType, subscription_id: sub.id, customer_email: sub.customer?.email },
      });
      if (error) throw error;
      toast.success(`${alertType.replace('_', ' ')} alert sent to ${sub.customer?.email}`);
    } catch (err) {
      toast.error('Failed to send alert');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'canceled': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'past_due': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage recurring billing plans and active subscriptions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Create Plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Billing Plan</DialogTitle>
              <DialogDescription>Set up a new recurring billing plan for your customers.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input placeholder="Premium Plan" value={planName} onChange={(e) => setPlanName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" placeholder="29.99" value={planAmount} onChange={(e) => setPlanAmount(e.target.value)} step="0.01" min="0" required />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={planCurrency} onValueChange={(v) => setPlanCurrency(v as Currency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Billing Interval</Label>
                <Select value={planInterval} onValueChange={(v: any) => setPlanInterval(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="Plan description..." value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Plan'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="plans">Billing Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Active Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <SubscriptionAnalytics subscriptions={subscriptions || []} plans={plans || []} />
        </TabsContent>

        <TabsContent value="plans">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans?.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{plan.name}</span>
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />{plan.interval}ly
                    </Badge>
                  </CardTitle>
                  {plan.description && <CardDescription>{plan.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="text-3xl font-bold">{formatCurrency(plan.amount, plan.currency as any)}</span>
                    <span className="text-muted-foreground">/ {plan.interval}</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground font-mono">{plan.id.slice(0, 16)}…</p>
                </CardContent>
              </Card>
            ))}
            {!plans?.length && (
              <div className="col-span-3 flex flex-col items-center justify-center py-12 text-muted-foreground">
                <DollarSign className="h-8 w-8 mb-3 opacity-40" />
                <p>No billing plans yet. Create your first plan.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>View and manage customer subscriptions with proration and retry controls</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub: any) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sub.customer?.first_name} {sub.customer?.last_name}</div>
                          <div className="text-sm text-muted-foreground">{sub.customer?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{sub.plan?.name}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(sub.plan?.amount, sub.plan?.currency as any)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(sub.status)}>{sub.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(sub.current_period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { setSelectedSub(sub); setNewPlanId(''); setProratedPreview(null); setChangePlanOpen(true); }}
                              >
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Change Plan (with proration)</TooltipContent>
                          </Tooltip>
                          {sub.status === 'past_due' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-warning"
                                  onClick={() => handleRetryPayment(sub.id)}
                                  disabled={isRetrying === sub.id}
                                >
                                  <RefreshCw className={`h-3.5 w-3.5 ${isRetrying === sub.id ? 'animate-spin' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Retry Payment</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => handleSendAlert(sub, 'renewal_reminder')}
                              >
                                <Bell className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Send Renewal Reminder</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!subscriptions?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No active subscriptions yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Switch plan with automatic proration calculated for remaining days in billing cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="font-semibold text-foreground">{selectedSub?.plan?.name} — {formatCurrency(selectedSub?.plan?.amount, selectedSub?.plan?.currency)}/{selectedSub?.plan?.interval}</p>
            </div>
            <div className="space-y-2">
              <Label>New Plan</Label>
              <Select value={newPlanId} onValueChange={(v) => { setNewPlanId(v); setProratedPreview(null); }}>
                <SelectTrigger><SelectValue placeholder="Select a new plan..." /></SelectTrigger>
                <SelectContent>
                  {plans?.filter((p) => p.id !== selectedSub?.plan_id).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.amount, p.currency as any)}/{p.interval}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newPlanId && !proratedPreview && (
              <Button variant="outline" className="w-full" onClick={handlePreviewProration}>
                Preview Proration
              </Button>
            )}

            {proratedPreview && (
              <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Proration Preview</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Days remaining in period</span>
                    <span className="font-mono">{proratedPreview.days_remaining}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Unused credit</span>
                    <span className="font-mono text-success">−{formatCurrency(proratedPreview.unused_credit, proratedPreview.currency)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>New plan charge</span>
                    <span className="font-mono">{formatCurrency(proratedPreview.new_charge, proratedPreview.currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2 mt-1">
                    <span>{proratedPreview.is_upgrade ? 'Amount due now' : 'Credit applied'}</span>
                    <span className={`font-mono ${proratedPreview.prorated_amount < 0 ? 'text-success' : 'text-foreground'}`}>
                      {formatCurrency(Math.abs(proratedPreview.prorated_amount), proratedPreview.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setChangePlanOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleChangePlan} disabled={!newPlanId || isChanging}>
                {isChanging ? 'Applying...' : 'Confirm Change'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
