import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, RefreshCw, ArrowUpDown, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSubscriptionPlans, useSubscriptions } from '@/hooks/useSubscriptions';
import { supabase } from '@/integrations/supabase/client';

import { formatCurrency } from '@/lib/format';
import { SubscriptionAnalytics } from '@/components/SubscriptionAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { notifyError, notifySuccess } from '@/lib/error-toast';

interface PriceRow {
  id: string;
  currency: string;
  subscription_price: string;
  trial_price: string;
  is_default: boolean;
}

const CURRENCY_OPTIONS = ['USD','EUR','GBP','BRL','CAD','AUD','JPY','CHF','MXN','COP'];

const RETRY_OPTIONS = [
  { value: '4_retries_1d_fri_2d_5d', label: '4 retries: 1d, Fri, 2d, 5d', desc: ['1 day after initial collection', 'on the nearest friday', '2 days after previous retry', '5 days after previous retry', 'cancel subscription'] },
  { value: '3_retries_1d_3d_7d', label: '3 retries: 1d, 3d, 7d', desc: ['1 day after initial', '3 days after', '7 days after', 'cancel subscription'] },
  { value: 'no_retry', label: 'No retry', desc: ['Cancel immediately on failure'] },
];

export default function Subscriptions() {
  const { data: plans, refetch: refetchPlans } = useSubscriptionPlans();
  const { data: subscriptions, refetch: refetchSubs } = useSubscriptions();
  const [activeTab, setActiveTab] = useState('plans');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Plan form state
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [subscriptionStarts, setSubscriptionStarts] = useState('immediately');
  const [startsDay, setStartsDay] = useState('1');
  const [startsWeekdayOccurrence, setStartsWeekdayOccurrence] = useState('2');
  const [startsWeekday, setStartsWeekday] = useState('Monday');
  const [billingInterval, setBillingInterval] = useState('1');
  const [billingPeriodUnit, setBillingPeriodUnit] = useState('months');
  const [endsType, setEndsType] = useState('never');
  const [endsAfterCount, setEndsAfterCount] = useState('1');
  const [endsAfterUnit, setEndsAfterUnit] = useState('year');
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialDuration, setTrialDuration] = useState('7');
  const [trialUnit, setTrialUnit] = useState('day');
  const [retryLogic, setRetryLogic] = useState('4_retries_1d_fri_2d_5d');
  const [priceRows, setPriceRows] = useState<PriceRow[]>([
    { id: crypto.randomUUID(), currency: 'USD', subscription_price: '', trial_price: '0', is_default: true },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  // Change plan dialog
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [newPlanId, setNewPlanId] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [proratedPreview, setProratedPreview] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const resetForm = () => {
    setPlanName(''); setPlanDescription(''); setSubscriptionStarts('immediately');
    setStartsDay('1'); setStartsWeekdayOccurrence('2'); setStartsWeekday('Monday');
    setBillingInterval('1'); setBillingPeriodUnit('months'); setEndsType('never');
    setEndsAfterCount('1'); setEndsAfterUnit('year'); setTrialEnabled(false);
    setTrialDuration('7'); setTrialUnit('day'); setRetryLogic('4_retries_1d_fri_2d_5d');
    setPriceRows([{ id: crypto.randomUUID(), currency: 'USD', subscription_price: '', trial_price: '0', is_default: true }]);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!merchant) throw new Error('No merchant found');

      const defaultRow = priceRows.find(r => r.is_default) || priceRows[0];
      const amount = parseFloat(defaultRow.subscription_price) || 0;

      const { data: plan, error } = await supabase.from('subscription_plans').insert({
        merchant_id: merchant.id,
        name: planName,
        description: planDescription || null,
        amount,
        currency: defaultRow.currency,
        interval: billingPeriodUnit === 'weeks' ? 'week' : billingPeriodUnit === 'months' ? 'month' : 'year',
        interval_count: parseInt(billingInterval) || 1,
        subscription_starts: subscriptionStarts,
        starts_day: parseInt(startsDay),
        starts_weekday_occurrence: parseInt(startsWeekdayOccurrence),
        starts_weekday: startsWeekday,
        billing_period_unit: billingPeriodUnit,
        ends_type: endsType,
        ends_after_count: parseInt(endsAfterCount),
        ends_after_unit: endsAfterUnit,
        trial_enabled: trialEnabled,
        trial_days: trialEnabled ? parseInt(trialDuration) * (trialUnit === 'month' ? 30 : trialUnit === 'week' ? 7 : 1) : 0,
        trial_duration: parseInt(trialDuration),
        trial_unit: trialUnit,
        trial_price: parseFloat(defaultRow.trial_price) || 0,
        retry_logic: retryLogic,
        status: 'active',
      } as any).select().single();

      if (error) throw error;

      if (plan && priceRows.length > 0) {
        const prices = priceRows.map(r => ({
          plan_id: plan.id,
          currency: r.currency,
          subscription_price: parseFloat(r.subscription_price) || 0,
          trial_price: parseFloat(r.trial_price) || 0,
          is_default: r.is_default,
        }));
        await supabase.from('subscription_plan_prices').insert(prices as any);
      }

      notifySuccess('Recurring plan created successfully!');
      setShowCreateForm(false);
      resetForm();
      refetchPlans();
    } catch (err: any) {
      notifyError(err.message || 'Failed to create plan');
    } finally {
      setIsCreating(false);
    }
  };

  const addPriceRow = () => {
    setPriceRows(prev => [...prev, {
      id: crypto.randomUUID(), currency: 'EUR', subscription_price: '', trial_price: '0', is_default: false,
    }]);
  };

  const removePriceRow = (id: string) => {
    setPriceRows(prev => prev.filter(r => r.id !== id));
  };

  const updatePriceRow = (id: string, field: keyof PriceRow, value: string | boolean) => {
    setPriceRows(prev => prev.map(r => {
      if (r.id === id) return { ...r, [field]: value };
      if (field === 'is_default' && value === true) return { ...r, is_default: false };
      return r;
    }));
  };

  const handlePreviewProration = async () => {
    if (!selectedSub || !newPlanId) return;
    try {
      const { data, error } = await supabase.functions.invoke('prorate-subscription', {
        body: { subscription_id: selectedSub.id, new_plan_id: newPlanId },
      });
      if (error) throw error;
      setProratedPreview(data.proration);
    } catch { notifyError('Failed to calculate proration'); }
  };

  const handleChangePlan = async () => {
    if (!selectedSub || !newPlanId) return;
    setIsChanging(true);
    try {
      const { data, error } = await supabase.functions.invoke('prorate-subscription', {
        body: { subscription_id: selectedSub.id, new_plan_id: newPlanId },
      });
      if (error) throw error;
      const p = data.proration;
      notifySuccess(`Plan ${p.is_upgrade ? 'upgraded' : 'downgraded'} to ${p.new_plan}`);
      setChangePlanOpen(false); setProratedPreview(null); refetchSubs();
    } catch { notifyError('Failed to change plan'); }
    finally { setIsChanging(false); }
  };

  const handleRetryPayment = async (subId: string) => {
    setIsRetrying(subId);
    try {
      const { data, error } = await supabase.functions.invoke('retry-payment', { body: { subscription_id: subId, force: true } });
      if (error) throw error;
      if (data.results?.[0]?.action === 'retry_succeeded') notifySuccess('Payment retry successful!');
      else notifyError('Payment retry failed.');
      refetchSubs();
    } catch { notifyError('Failed to retry payment'); }
    finally { setIsRetrying(null); }
  };

  const handleSendAlert = async (sub: any, alertType: string) => {
    try {
      const { error } = await supabase.functions.invoke('subscription-alerts', {
        body: { type: alertType, subscription_id: sub.id, customer_email: sub.customer?.email },
      });
      if (error) throw error;
      notifySuccess(`Alert sent to ${sub.customer?.email}`);
    } catch { notifyError('Failed to send alert'); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-success/10 text-success border-success/20',
      canceled: 'bg-destructive/10 text-destructive border-destructive/20',
      past_due: 'bg-warning/10 text-warning border-warning/20',
      inactive: 'bg-muted text-muted-foreground',
    };
    return <Badge className={styles[status] || styles.inactive}>{status}</Badge>;
  };

  const selectedRetry = RETRY_OPTIONS.find(r => r.value === retryLogic);

  return (
    <AppLayout>
      <div className="mb-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary uppercase">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recurring plans, multi-currency pricing, trials & smart retries</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-0">
          {['Plans', 'Subscriptions'].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 text-sm font-medium"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-4">
          {!showCreateForm ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1" />
                <Button size="sm" onClick={() => setShowCreateForm(true)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add plan
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchPlans()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Billing period</TableHead>
                        <TableHead>Trial</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans?.map((plan: any) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-mono text-xs">{plan.id.slice(0, 12)}…</TableCell>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(plan.amount, plan.currency)}</TableCell>
                          <TableCell>
                            {plan.interval_count} {plan.billing_period_unit || plan.interval}
                          </TableCell>
                          <TableCell>
                            {plan.trial_enabled
                              ? <Badge variant="outline" className="text-xs">{plan.trial_duration} {plan.trial_unit}</Badge>
                              : <span className="text-muted-foreground text-xs">—</span>
                            }
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(plan.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(plan.status || 'active')}</TableCell>
                        </TableRow>
                      ))}
                      {!plans?.length && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                            No plans created yet. Click "Add plan" to create one.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-primary uppercase text-base tracking-wide">Create Recurring Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePlan} className="space-y-6 max-w-2xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input value={planName} onChange={e => setPlanName(e.target.value)} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea value={planDescription} onChange={e => setPlanDescription(e.target.value)} rows={3} />
                  </div>

                  {/* Subscription starts */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Subscription starts</Label>
                    <RadioGroup value={subscriptionStarts} onValueChange={setSubscriptionStarts} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="immediately" id="start-imm" />
                        <Label htmlFor="start-imm" className="font-normal text-sm">Immediately</Label>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <RadioGroupItem value="nearest_day" id="start-day" />
                        <Label htmlFor="start-day" className="font-normal text-sm">on the nearest</Label>
                        <Input className="w-16 h-8" value={startsDay} onChange={e => setStartsDay(e.target.value)} type="number" min="1" max="31" disabled={subscriptionStarts !== 'nearest_day'} />
                        <span className="text-sm text-muted-foreground">day of month</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <RadioGroupItem value="nearest_weekday" id="start-wd" />
                        <Label htmlFor="start-wd" className="font-normal text-sm">on the</Label>
                        <Input className="w-14 h-8" value={startsWeekdayOccurrence} onChange={e => setStartsWeekdayOccurrence(e.target.value)} type="number" min="1" max="5" disabled={subscriptionStarts !== 'nearest_weekday'} />
                        <Select value={startsWeekday} onValueChange={setStartsWeekday} disabled={subscriptionStarts !== 'nearest_weekday'}>
                          <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">of the month</span>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Billing period */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Billing period</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Repeat every</span>
                      <Input className="w-20 h-8" value={billingInterval} onChange={e => setBillingInterval(e.target.value)} type="number" min="1" />
                      <Select value={billingPeriodUnit} onValueChange={setBillingPeriodUnit}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weeks">weeks</SelectItem>
                          <SelectItem value="months">months</SelectItem>
                          <SelectItem value="years">years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Ends */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Ends</Label>
                    <RadioGroup value={endsType} onValueChange={setEndsType} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="never" id="ends-never" />
                        <Label htmlFor="ends-never" className="font-normal text-sm">Never</Label>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <RadioGroupItem value="after_period" id="ends-after" />
                        <Label htmlFor="ends-after" className="font-normal text-sm">After</Label>
                        <Input className="w-20 h-8" value={endsAfterCount} onChange={e => setEndsAfterCount(e.target.value)} type="number" min="1" disabled={endsType !== 'after_period'} />
                        <Select value={endsAfterUnit} onValueChange={setEndsAfterUnit} disabled={endsType !== 'after_period'}>
                          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="week">week</SelectItem>
                            <SelectItem value="month">month</SelectItem>
                            <SelectItem value="year">year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Trial */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Trial</Label>
                    <div className="flex items-center gap-3">
                      <Switch checked={trialEnabled} onCheckedChange={setTrialEnabled} />
                      <span className="text-sm">{trialEnabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input className="w-20 h-8" value={trialDuration} onChange={e => setTrialDuration(e.target.value)} type="number" min="1" disabled={!trialEnabled} />
                      <Select value={trialUnit} onValueChange={setTrialUnit} disabled={!trialEnabled}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">day</SelectItem>
                          <SelectItem value="week">week</SelectItem>
                          <SelectItem value="month">month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Retry logic */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Retry logic</Label>
                    <Select value={retryLogic} onValueChange={setRetryLogic}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RETRY_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedRetry && (
                      <ul className="text-xs text-muted-foreground list-none space-y-0.5 mt-1">
                        {selectedRetry.desc.map((d, i) => (<li key={i}>- {d}</li>))}
                      </ul>
                    )}
                  </div>

                  {/* Multi-currency pricing */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Pricing</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Default</TableHead>
                          <TableHead className="w-28">Currency</TableHead>
                          <TableHead>Subscription price</TableHead>
                          <TableHead>Trial price</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceRows.map(row => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={row.is_default}
                                onChange={() => updatePriceRow(row.id, 'is_default', true)}
                                className="h-4 w-4 accent-primary"
                              />
                            </TableCell>
                            <TableCell>
                              <Select value={row.currency} onValueChange={v => updatePriceRow(row.id, 'currency', v)}>
                                <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CURRENCY_OPTIONS.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8" type="number" step="0.01" min="0"
                                value={row.subscription_price}
                                onChange={e => updatePriceRow(row.id, 'subscription_price', e.target.value)}
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8" type="number" step="0.01" min="0"
                                value={row.trial_price}
                                onChange={e => updatePriceRow(row.id, 'trial_price', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={addPriceRow}>
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                                {priceRows.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePriceRow(row.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Saving...' : 'Save plan'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions" className="space-y-4">
          <SubscriptionAnalytics subscriptions={subscriptions || []} plans={plans || []} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Subscriptions</CardTitle>
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
                          <div className="text-xs text-muted-foreground">{sub.customer?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{sub.plan?.name}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(sub.plan?.amount, sub.plan?.currency)}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { setSelectedSub(sub); setNewPlanId(''); setProratedPreview(null); setChangePlanOpen(true); }}>
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Change Plan</TooltipContent>
                          </Tooltip>
                          {sub.status === 'past_due' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-warning"
                                  onClick={() => handleRetryPayment(sub.id)} disabled={isRetrying === sub.id}>
                                  <RefreshCw className={`h-3.5 w-3.5 ${isRetrying === sub.id ? 'animate-spin' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Retry Payment</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSendAlert(sub, 'renewal_reminder')}>
                                <Bell className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Send Reminder</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!subscriptions?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No active subscriptions</TableCell>
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
            <DialogDescription>Switch plan with automatic proration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="font-semibold">{selectedSub?.plan?.name} — {formatCurrency(selectedSub?.plan?.amount, selectedSub?.plan?.currency)}/{selectedSub?.plan?.interval}</p>
            </div>
            <div className="space-y-2">
              <Label>New Plan</Label>
              <Select value={newPlanId} onValueChange={v => { setNewPlanId(v); setProratedPreview(null); }}>
                <SelectTrigger><SelectValue placeholder="Select plan..." /></SelectTrigger>
                <SelectContent>
                  {plans?.filter((p: any) => p.id !== selectedSub?.plan_id).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.amount, p.currency)}/{p.interval}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newPlanId && !proratedPreview && (
              <Button variant="outline" className="w-full" onClick={handlePreviewProration}>Preview Proration</Button>
            )}
            {proratedPreview && (
              <div className="rounded-lg border p-4 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Days remaining</span><span className="font-mono">{proratedPreview.days_remaining}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Unused credit</span><span className="font-mono text-success">−{formatCurrency(proratedPreview.unused_credit, proratedPreview.currency)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>New plan charge</span><span className="font-mono">{formatCurrency(proratedPreview.new_charge, proratedPreview.currency)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-2 mt-1">
                  <span>{proratedPreview.is_upgrade ? 'Amount due' : 'Credit applied'}</span>
                  <span className={proratedPreview.prorated_amount < 0 ? 'text-success' : ''}>{formatCurrency(Math.abs(proratedPreview.prorated_amount), proratedPreview.currency)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setChangePlanOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleChangePlan} disabled={!newPlanId || isChanging}>{isChanging ? 'Applying...' : 'Confirm'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
