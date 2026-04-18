import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SmartRetry() {
  const { user } = useAuth();
  const [s, setS] = useState({ enabled: true, max_attempts: 3, backoff_strategy: 'exponential', backoff_seconds: 60 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) return;
      const { data } = await supabase.from('retry_settings').select('*').eq('merchant_id', m.id).maybeSingle();
      if (data) setS({ enabled: data.enabled, max_attempts: data.max_attempts, backoff_strategy: data.backoff_strategy, backoff_seconds: data.backoff_seconds });
    })();
  }, [user]);

  const save = async () => {
    if (!user) return; setSaving(true);
    const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
    if (!m) { setSaving(false); return; }
    const { error } = await supabase.from('retry_settings').upsert({ merchant_id: m.id, ...s }, { onConflict: 'merchant_id' });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success('Saved');
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div><h1 className="font-heading text-2xl font-bold flex items-center gap-2"><RefreshCw className="h-6 w-6 text-primary" />Smart Retry</h1><p className="text-sm text-muted-foreground mt-1">Automatically retry failed payments with intelligent backoff</p></div>
        <Card>
          <CardHeader><CardTitle>Retry Configuration</CardTitle><CardDescription>Recover failed payments automatically</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between"><div><Label>Enable Smart Retry</Label><p className="text-xs text-muted-foreground mt-1">Retry transient failures (insufficient funds, do not honor, etc.)</p></div><Switch checked={s.enabled} onCheckedChange={v => setS({...s, enabled: v})} /></div>
            <div className="space-y-2"><Label>Max Attempts</Label><Input className="rounded-2xl" type="number" min={1} max={10} value={s.max_attempts} onChange={e => setS({...s, max_attempts: parseInt(e.target.value) || 3})} /></div>
            <div className="space-y-2"><Label>Backoff Strategy</Label>
              <Select value={s.backoff_strategy} onValueChange={v => setS({...s, backoff_strategy: v})}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear (fixed interval)</SelectItem>
                  <SelectItem value="exponential">Exponential (recommended)</SelectItem>
                  <SelectItem value="fibonacci">Fibonacci</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Initial Backoff (seconds)</Label><Input className="rounded-2xl" type="number" value={s.backoff_seconds} onChange={e => setS({...s, backoff_seconds: parseInt(e.target.value) || 60})} /></div>
            <Button className="rounded-full" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
