import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSubscriptionPlans, useSubscriptions } from '@/hooks/useSubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Currency } from '@/lib/types';
import { formatCurrency } from '@/lib/format';

export default function Subscriptions() {
  const { data: plans, refetch: refetchPlans } = useSubscriptionPlans();
  const { data: subscriptions } = useSubscriptions();
  const [isCreating, setIsCreating] = useState(false);
  const [open, setOpen] = useState(false);

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

      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!merchant) throw new Error('No merchant found');

      const { error } = await supabase
        .from('subscription_plans')
        .insert({
          merchant_id: merchant.id,
          name: planName,
          amount: parseFloat(planAmount),
          currency: planCurrency,
          interval: planInterval,
          description: planDescription,
        });

      if (error) throw error;

      toast.success('Billing plan created successfully!');
      setOpen(false);
      setPlanName('');
      setPlanAmount('');
      setPlanDescription('');
      refetchPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Failed to create billing plan');
    } finally {
      setIsCreating(false);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage recurring billing plans and active subscriptions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Billing Plan</DialogTitle>
              <DialogDescription>Set up a new recurring billing plan for your customers.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  placeholder="Premium Plan"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="29.99"
                    value={planAmount}
                    onChange={(e) => setPlanAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={planCurrency} onValueChange={(v) => setPlanCurrency(v as Currency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="Plan description..."
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Plan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {plans?.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{plan.name}</span>
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  {plan.interval}ly
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>View and manage customer subscriptions</CardDescription>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions?.map((sub: any) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {sub.customer?.first_name} {sub.customer?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{sub.customer?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{sub.plan?.name}</TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(sub.plan?.amount, sub.plan?.currency as any)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(sub.status)}>{sub.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(sub.current_period_end).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {!subscriptions?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No active subscriptions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
