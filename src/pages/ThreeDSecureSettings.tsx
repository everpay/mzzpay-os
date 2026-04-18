import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ThreeDSecureSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ enabled: true, mode: 'auto', threshold_amount: 50 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) return;
      const { data } = await supabase.from('three_ds_settings').select('*').eq('merchant_id', m.id).maybeSingle();
      if (data) setSettings({ enabled: data.enabled, mode: data.mode, threshold_amount: Number(data.threshold_amount) });
    })();
  }, [user]);

  const save = async () => {
    if (!user) return; setSaving(true);
    const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
    if (!m) { setSaving(false); return; }
    const { error } = await supabase.from('three_ds_settings').upsert({ merchant_id: m.id, ...settings }, { onConflict: 'merchant_id' });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success('Saved');
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div><h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />3D Secure Settings</h1><p className="text-sm text-muted-foreground mt-1">Configure when 3DS authentication is required</p></div>
        <Card>
          <CardHeader><CardTitle>Authentication</CardTitle><CardDescription>3DS shifts liability for fraud chargebacks to the issuer</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between"><div><Label>Enable 3D Secure</Label><p className="text-xs text-muted-foreground mt-1">Require challenge for high-risk payments</p></div><Switch checked={settings.enabled} onCheckedChange={v => setSettings({...settings, enabled: v})} /></div>
            <div className="space-y-2"><Label>Mode</Label>
              <Select value={settings.mode} onValueChange={v => setSettings({...settings, mode: v})}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (recommended)</SelectItem>
                  <SelectItem value="always">Always require</SelectItem>
                  <SelectItem value="threshold">Above threshold only</SelectItem>
                  <SelectItem value="never">Never (not recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {settings.mode === 'threshold' && (
              <div className="space-y-2"><Label>Threshold Amount (USD)</Label><Input className="rounded-2xl" type="number" value={settings.threshold_amount} onChange={e => setSettings({...settings, threshold_amount: parseFloat(e.target.value) || 0})} /></div>
            )}
            <Button className="rounded-full" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
