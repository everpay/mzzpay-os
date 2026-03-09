import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Webhook, Key, Building2, Trash2, Save, Eye, EyeOff, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch merchant data
  const { data: merchant } = useQuery({
    queryKey: ['merchant-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('merchants')
        .select('id, name, webhook_url, api_key_hash')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch saved bank accounts
  const { data: savedBankAccounts = [] } = useQuery({
    queryKey: ['saved-bank-accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!merchantData) throw new Error('Merchant not found');

      const { data, error } = await supabase
        .from('saved_bank_accounts')
        .select('*')
        .eq('merchant_id', merchantData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedBankAccount[];
    },
  });

  // Update webhook URL
  const updateWebhook = useMutation({
    mutationFn: async (url: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('merchants')
        .update({ webhook_url: url })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Webhook URL updated');
      queryClient.invalidateQueries({ queryKey: ['merchant-settings'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update webhook');
    },
  });

  // Delete saved bank account
  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bank account removed');
      queryClient.invalidateQueries({ queryKey: ['saved-bank-accounts'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete bank account');
    },
  });

  useEffect(() => {
    if (merchant?.webhook_url) {
      setWebhookUrl(merchant.webhook_url);
    }
  }, [merchant]);

  const handleSaveWebhook = () => {
    updateWebhook.mutate(webhookUrl);
  };

  const generateApiKey = () => {
    // In production, this would call an edge function to generate a secure API key
    const newKey = `evp_live_${crypto.randomUUID().replace(/-/g, '')}`;
    navigator.clipboard.writeText(newKey);
    toast.success('New API key generated and copied to clipboard');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your merchant settings and integrations</p>
      </div>

      <div className="grid gap-6">
        {/* Webhook Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Configuration
            </CardTitle>
            <CardDescription>
              Configure your webhook URL to receive payment notifications. Events like payment.completed, payment.failed, and refund.created will be sent to this URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://your-domain.com/api/webhooks/payments"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveWebhook} disabled={updateWebhook.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateWebhook.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                We'll send POST requests with JSON payloads to this URL
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <h4 className="font-medium text-sm mb-2">Webhook Events</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">payment_link.completed</Badge>
                <Badge variant="outline">payment_link.failed</Badge>
                <Badge variant="outline">payment_link.expired</Badge>
                <Badge variant="outline">payment_link.refunded</Badge>
                <Badge variant="outline">moneto.payment.succeeded</Badge>
                <Badge variant="outline">moneto.payout.completed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage your API keys for programmatic access to the payment APIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Live API Key</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={merchant?.api_key_hash ? 'evp_live_••••••••••••••••••••' : 'No API key generated'}
                    readOnly
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" onClick={() => copyToClipboard(merchant?.api_key_hash || '')}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="secondary" onClick={generateApiKey}>
                  Generate New
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep your API key secret. Never share it in client-side code.
              </p>
            </div>

            <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
              <p className="text-sm text-warning-foreground">
                <strong>Warning:</strong> Generating a new API key will invalidate your existing key. Make sure to update your integrations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Saved Bank Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Saved Bank Accounts
            </CardTitle>
            <CardDescription>
              Manage your saved bank accounts for quick payouts.
            </CardDescription>
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
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {account.nickname || account.account_holder_name}
                          {account.is_default && (
                            <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          •••• {account.account_last4} • {account.currency} • Inst: {account.institution_number} Transit: {account.transit_number}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteBankAccount.mutate(account.id)}
                      disabled={deleteBankAccount.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
