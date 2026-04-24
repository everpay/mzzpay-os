import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

import { notifyError, notifySuccess } from '@/lib/error-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationId: string;
  integrationName: string;
  merchantId?: string;
  isConnected: boolean;
}

export function IntegrationConfigureModal({ open, onOpenChange, integrationId, integrationName, merchantId, isConnected }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [label, setLabel] = useState('');
  const [sandbox, setSandbox] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!merchantId) {
      notifyError('Merchant context not loaded');
      return;
    }
    if (!apiKey.trim()) {
      notifyError('API key is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('gateway_credentials').insert({
        merchant_id: merchantId,
        gateway_name: integrationId,
        gateway_type: 'processor',
        environment: sandbox ? 'sandbox' : 'production',
        label: label || integrationName,
        credentials: { api_key: apiKey, api_secret: apiSecret },
        is_active: true,
      });
      if (error) throw error;
      notifySuccess(`${integrationName} connected`);
      onOpenChange(false);
      setApiKey('');
      setApiSecret('');
      setLabel('');
    } catch (e: any) {
      notifyError(e.message || 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isConnected ? 'Configure' : 'Connect'} {integrationName}</DialogTitle>
          <DialogDescription>
            Enter your {integrationName} API credentials. They will be stored securely.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input id="label" placeholder="Production account" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input id="api-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-secret">API Secret</Label>
            <Input id="api-secret" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="sandbox" className="cursor-pointer">Sandbox mode</Label>
              <p className="text-xs text-muted-foreground">Use test credentials</p>
            </div>
            <Switch id="sandbox" checked={sandbox} onCheckedChange={setSandbox} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
