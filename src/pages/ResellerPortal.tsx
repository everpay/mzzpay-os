import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { Users, DollarSign, TrendingUp, Plus, Building2, Mail, Globe, Phone, Loader2, BarChart3 } from 'lucide-react';

interface MerchantApplication {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  phone: string;
  website: string;
  business_type: string;
  estimated_volume: string;
  notes: string;
  status: string;
  created_at: string;
}

export default function ResellerPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewApp, setShowNewApp] = useState(false);
  const [form, setForm] = useState({
    business_name: '', contact_name: '', contact_email: '', phone: '',
    website: '', business_type: 'ecommerce', estimated_volume: '', notes: '',
  });

  // Check reseller role
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch referred merchants (merchants whose user was invited by this reseller)
  const { data: referredMerchants = [] } = useQuery({
    queryKey: ['referred-merchants', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get user IDs invited by this reseller
      const { data: invitedRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('invited_by', user.id);

      if (!invitedRoles || invitedRoles.length === 0) return [];

      const userIds = invitedRoles.map(r => r.user_id);
      const { data: merchants } = await supabase
        .from('merchants')
        .select('*')
        .in('user_id', userIds);

      return merchants || [];
    },
    enabled: !!user,
  });

  // Fetch total volume from referred merchants' transactions
  const { data: volumeStats } = useQuery({
    queryKey: ['reseller-volume', referredMerchants],
    queryFn: async () => {
      if (referredMerchants.length === 0) return { totalVolume: 0, totalTransactions: 0, commission: 0 };
      
      const merchantIds = referredMerchants.map(m => m.id);
      const { data: txns } = await supabase
        .from('transactions')
        .select('amount, currency, status')
        .in('merchant_id', merchantIds)
        .eq('status', 'completed');

      const totalVolume = (txns || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const totalTransactions = txns?.length || 0;
      // Commission: 50% of markup (0.25% MDR split = 0.125% to reseller)
      const commission = totalVolume * 0.00125;

      return { totalVolume, totalTransactions, commission };
    },
    enabled: referredMerchants.length > 0,
  });

  const submitApplication = useMutation({
    mutationFn: async () => {
      // For now, invite the merchant via the invite-admin edge function as a basic user
      const { data, error } = await supabase.functions.invoke('invite-admin', {
        body: {
          email: form.contact_email,
          fullName: form.contact_name,
          role: 'admin', // merchant gets admin role for their own account
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Merchant application submitted successfully');
      setShowNewApp(false);
      setForm({ business_name: '', contact_name: '', contact_email: '', phone: '', website: '', business_type: 'ecommerce', estimated_volume: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['referred-merchants'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit application');
    },
  });

  const stats = volumeStats || { totalVolume: 0, totalTransactions: 0, commission: 0 };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Reseller Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage merchant referrals, track volume & commissions</p>
        </div>
        <Dialog open={showNewApp} onOpenChange={setShowNewApp}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />New Merchant Application</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Submit Merchant Application</DialogTitle>
              <DialogDescription>Refer a new merchant to MZZPay. They'll receive an invitation to set up their account.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select value={form.business_type} onValueChange={v => setForm(f => ({ ...f, business_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ecommerce">E-Commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="marketplace">Marketplace</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="john@acme.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://acme.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estimated Monthly Volume (USD)</Label>
                <Input value={form.estimated_volume} onChange={e => setForm(f => ({ ...f, estimated_volume: e.target.value }))} placeholder="50,000" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional context about this merchant..." rows={3} />
              </div>
              <Button className="w-full gap-2" onClick={() => submitApplication.mutate()} disabled={!form.contact_email || !form.contact_name || submitApplication.isPending}>
                {submitApplication.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : <><Mail className="h-4 w-4" />Submit & Send Invitation</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{referredMerchants.length}</p>
                <p className="text-xs text-muted-foreground">Referred Merchants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalVolume, 'USD')}</p>
                <p className="text-xs text-muted-foreground">Total Volume</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalTransactions}</p>
                <p className="text-xs text-muted-foreground">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.commission, 'USD')}</p>
                <p className="text-xs text-muted-foreground">Earned Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merchants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referred Merchants</CardTitle>
          <CardDescription>Merchants you've referred to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {referredMerchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-1">No referred merchants yet</p>
              <p className="text-sm text-muted-foreground mb-4">Submit your first merchant application to start earning commissions</p>
              <Button variant="outline" onClick={() => setShowNewApp(true)} className="gap-2">
                <Plus className="h-4 w-4" />Submit Application
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Business</th>
                    <th className="pb-3 font-medium text-muted-foreground">Contact</th>
                    <th className="pb-3 font-medium text-muted-foreground">Currency</th>
                    <th className="pb-3 font-medium text-muted-foreground">Created</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {referredMerchants.map((merchant: any) => (
                    <tr key={merchant.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{merchant.name}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="text-xs">{merchant.contact_email || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-xs">{merchant.business_currency || 'USD'}</Badge>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {new Date(merchant.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">Active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
