import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings as SettingsIcon, Webhook, Key, Building2, Trash2, Save, Eye, EyeOff, Copy,
  ChevronRight, ArrowLeft, User, Lock, Globe, Phone, Mail, Plus, X, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

type SettingsSection = 'main' | 'business' | 'account' | 'password' | 'webhooks' | 'api-keys' | 'bank-accounts' | 'deactivation';

interface SavedBankAccount {
  id: string;
  nickname: string | null;
  account_holder_name: string;
  institution_number: string;
  transit_number: string;
  account_last4: string;
  currency: string;
  is_default: boolean;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<SettingsSection>('main');

  // Business details
  const [businessName, setBusinessName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [websiteUrls, setWebsiteUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');

  // Account details
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessCurrency, setBusinessCurrency] = useState('USD');

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Deactivation
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: merchant } = useQuery({
    queryKey: ['merchant-settings'],
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', u.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: savedBankAccounts = [] } = useQuery({
    queryKey: ['saved-bank-accounts'],
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Not authenticated');
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', u.id).single();
      if (!m) throw new Error('Merchant not found');
      const { data, error } = await supabase.from('saved_bank_accounts').select('*').eq('merchant_id', m.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data as SavedBankAccount[];
    },
  });

  useEffect(() => {
    if (merchant) {
      setBusinessName(merchant.name || '');
      setContactEmail((merchant as any).contact_email || user?.email || '');
      setContactName((merchant as any).contact_name || '');
      setWebhookUrl(merchant.webhook_url || '');
      setBusinessCurrency((merchant as any).business_currency || 'USD');
      setPhoneNumber((merchant as any).phone_number || '');
      setWebsiteUrls((merchant as any).website_urls || []);
    }
  }, [merchant, user]);

  const saveBusiness = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('merchants')
        .update({
          name: businessName,
          contact_email: contactEmail,
          contact_name: contactName,
          website_urls: websiteUrls,
        } as any)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Business details saved');
      queryClient.invalidateQueries({ queryKey: ['merchant-settings'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  });

  const saveAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('merchants')
        .update({
          phone_number: phoneNumber,
          business_currency: businessCurrency,
        } as any)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Account details saved');
      queryClient.invalidateQueries({ queryKey: ['merchant-settings'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match');
      if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password updated');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update password'),
  });

  const updateWebhook = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase.from('merchants').update({ webhook_url: url }).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Webhook URL updated');
      queryClient.invalidateQueries({ queryKey: ['merchant-settings'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update webhook'),
  });

  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_bank_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bank account removed');
      queryClient.invalidateQueries({ queryKey: ['saved-bank-accounts'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete'),
  });

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      // Delete profile and merchant data (payment data like transactions stays via RLS)
      // The edge function handles the actual auth user deletion
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      toast.success('Your account has been deactivated. Payment records are preserved for compliance.');
      await signOut();
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const addUrl = () => {
    if (!newUrl.trim()) return;
    setWebsiteUrls([...websiteUrls, newUrl.trim()]);
    setNewUrl('');
  };

  const removeUrl = (index: number) => {
    setWebsiteUrls(websiteUrls.filter((_, i) => i !== index));
  };

  const generateApiKey = () => {
    const newKey = `mzz_live_${crypto.randomUUID().replace(/-/g, '')}`;
    navigator.clipboard.writeText(newKey);
    toast.success('New API key generated and copied to clipboard');
  };

  const menuItems: { key: SettingsSection; label: string; icon: React.ElementType; destructive?: boolean }[] = [
    { key: 'business', label: 'Business Details', icon: Building2 },
    { key: 'account', label: 'Account Details', icon: User },
    { key: 'password', label: 'Password', icon: Lock },
    { key: 'webhooks', label: 'Webhooks', icon: Webhook },
    { key: 'api-keys', label: 'API Keys', icon: Key },
    { key: 'bank-accounts', label: 'Bank Accounts', icon: Building2 },
    { key: 'deactivation', label: 'Account Deactivation', icon: AlertTriangle, destructive: true },
  ];

  if (section === 'main') {
    return (
      <AppLayout>
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit your business information and adjust your settings.</p>
        </div>
        <Card>
          <CardContent className="p-0">
            {menuItems.map((item, i) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-muted/50 transition-colors ${
                  item.destructive ? 'text-destructive' : 'text-foreground'
                } ${i < menuItems.length - 1 ? 'border-b border-border' : ''}`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <button onClick={() => setSection('main')} className="flex items-center gap-1 text-sm text-primary hover:underline mb-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {section === 'business' && (
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>Update your business details to ensure all information remains current.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="pl-9" placeholder="Your business name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="pl-9" placeholder="contact@business.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="pl-9" placeholder="Your full name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website URLs</Label>
              <div className="space-y-2">
                {websiteUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={url} readOnly className="pl-9 bg-muted" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeUrl(i)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="pl-9"
                      placeholder="https://example.com"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={addUrl}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <Button onClick={() => saveBusiness.mutate()} disabled={saveBusiness.isPending}>
              <Save className="h-4 w-4 mr-2" /> {saveBusiness.isPending ? 'Saving...' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      )}

      {section === 'account' && (
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Update your account details to ensure all information remains current.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="pl-9" placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={businessCurrency} onValueChange={setBusinessCurrency}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD – United States Dollar</SelectItem>
                  <SelectItem value="CAD">CAD – Canadian Dollar</SelectItem>
                  <SelectItem value="EUR">EUR – Euro</SelectItem>
                  <SelectItem value="GBP">GBP – British Pound</SelectItem>
                  <SelectItem value="BRL">BRL – Brazilian Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => saveAccount.mutate()} disabled={saveAccount.isPending}>
              <Save className="h-4 w-4 mr-2" /> {saveAccount.isPending ? 'Saving...' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      )}

      {section === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-9" placeholder="New password" minLength={6} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-9" placeholder="Confirm password" minLength={6} />
              </div>
            </div>
            <Button onClick={() => changePassword.mutate()} disabled={changePassword.isPending}>
              <Save className="h-4 w-4 mr-2" /> {changePassword.isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>
      )}

      {section === 'webhooks' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" /> Webhook Configuration</CardTitle>
            <CardDescription>Configure your webhook URL to receive payment notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input type="url" placeholder="https://your-domain.com/api/webhooks" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="flex-1" />
                <Button onClick={() => updateWebhook.mutate(webhookUrl)} disabled={updateWebhook.isPending}>
                  <Save className="h-4 w-4 mr-2" /> {updateWebhook.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <h4 className="font-medium text-sm mb-2">Webhook Events</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">payment_link.completed</Badge>
                <Badge variant="outline">payment_link.failed</Badge>
                <Badge variant="outline">payment_link.expired</Badge>
                <Badge variant="outline">moneto.payment.succeeded</Badge>
                <Badge variant="outline">moneto.payout.completed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'api-keys' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</CardTitle>
            <CardDescription>Manage your API keys for programmatic access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Live API Key</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input type={showApiKey ? 'text' : 'password'} value={merchant?.api_key_hash ? 'mzz_live_••••••••••••••••' : 'No API key generated'} readOnly className="pr-10" />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(merchant?.api_key_hash || ''); toast.success('Copied'); }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="secondary" onClick={generateApiKey}>Generate New</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'bank-accounts' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Saved Bank Accounts</CardTitle>
            <CardDescription>Manage your saved bank accounts for quick payouts.</CardDescription>
          </CardHeader>
          <CardContent>
            {savedBankAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No saved bank accounts</p>
                <p className="text-sm">Bank accounts are saved automatically when you make a payout</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedBankAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted"><Building2 className="h-5 w-5 text-muted-foreground" /></div>
                      <div>
                        <p className="font-medium">
                          {account.nickname || account.account_holder_name}
                          {account.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                        </p>
                        <p className="text-sm text-muted-foreground">•••• {account.account_last4} • {account.currency}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteBankAccount.mutate(account.id)} disabled={deleteBankAccount.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {section === 'deactivation' && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Account Deactivation
            </CardTitle>
            <CardDescription>
              Permanently delete your account. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <h4 className="font-medium text-sm">What happens when you delete your account:</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Your login credentials and profile will be permanently removed</li>
                <li>Your merchant profile and business settings will be deleted</li>
                <li>You will lose access to the dashboard immediately</li>
              </ul>
              <h4 className="font-medium text-sm mt-3">What is preserved for compliance:</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Transaction records and payment history</li>
                <li>Invoice records</li>
                <li>Dispute and chargeback records</li>
                <li>Ledger entries</li>
              </ul>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete My Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-destructive">Confirm Account Deletion</DialogTitle>
                  <DialogDescription>
                    This will permanently delete your account. Your payment data will be preserved for regulatory compliance. Type <strong>DELETE</strong> to confirm.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="mt-2"
                />
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
