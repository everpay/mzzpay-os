import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, X, Plus, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { notifyError, notifySuccess } from '@/lib/error-toast';

const DEFAULT_DECLINE_CODES = ['insufficient_funds', 'do_not_honor', 'try_again_later'];
const SUGGESTED_CODES = [
  'insufficient_funds',
  'do_not_honor',
  'try_again_later',
  'expired_card',
  'processing_error',
  'issuer_unavailable',
  'pickup_card',
  'lost_card',
];

interface RetrySettings {
  enabled: boolean;
  max_attempts: number;
  backoff_strategy: 'linear' | 'exponential' | 'fibonacci';
  backoff_seconds: number;
  retry_decline_codes: string[];
}

export default function SmartRetry() {
  const { user } = useAuth();
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [s, setS] = useState<RetrySettings>({
    enabled: true,
    max_attempts: 3,
    backoff_strategy: 'exponential',
    backoff_seconds: 60,
    retry_decline_codes: DEFAULT_DECLINE_CODES,
  });
  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
      if (!m) { setLoading(false); return; }
      setMerchantId(m.id);
      const { data } = await supabase.from('retry_settings').select('*').eq('merchant_id', m.id).maybeSingle();
      if (data) {
        setS({
          enabled: data.enabled,
          max_attempts: data.max_attempts,
          backoff_strategy: data.backoff_strategy as RetrySettings['backoff_strategy'],
          backoff_seconds: data.backoff_seconds,
          retry_decline_codes: Array.isArray(data.retry_decline_codes)
            ? (data.retry_decline_codes as string[])
            : DEFAULT_DECLINE_CODES,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!merchantId) return;
    setSaving(true);
    const { error } = await supabase
      .from('retry_settings')
      .upsert({ merchant_id: merchantId, ...s }, { onConflict: 'merchant_id' });
    setSaving(false);
    if (error) notifyError(error.message);
    else notifySuccess('Smart Retry settings saved');
  };

  const addCode = (code: string) => {
    const c = code.trim().toLowerCase().replace(/\s+/g, '_');
    if (!c || s.retry_decline_codes.includes(c)) return;
    setS({ ...s, retry_decline_codes: [...s.retry_decline_codes, c] });
    setNewCode('');
  };

  const removeCode = (code: string) => {
    setS({ ...s, retry_decline_codes: s.retry_decline_codes.filter(c => c !== code) });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-primary" />
            Smart Retry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically retry failed payments with intelligent backoff to recover lost revenue.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Retry Configuration</CardTitle>
            <CardDescription>Recover transient payment failures automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Smart Retry</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Retry transient failures (insufficient funds, do not honor, etc.)
                </p>
              </div>
              <Switch
                checked={s.enabled}
                onCheckedChange={v => setS({ ...s, enabled: v })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Attempts</Label>
              <Input
                className="rounded-2xl"
                type="number"
                min={1}
                max={10}
                value={s.max_attempts}
                onChange={e => setS({ ...s, max_attempts: parseInt(e.target.value) || 3 })}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Maximum number of retries per failed payment (1-10)</p>
            </div>

            <div className="space-y-2">
              <Label>Backoff Strategy</Label>
              <Select
                value={s.backoff_strategy}
                onValueChange={(v: RetrySettings['backoff_strategy']) => setS({ ...s, backoff_strategy: v })}
                disabled={loading}
              >
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear (fixed interval)</SelectItem>
                  <SelectItem value="exponential">Exponential (recommended)</SelectItem>
                  <SelectItem value="fibonacci">Fibonacci</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Initial Backoff (seconds)</Label>
              <Input
                className="rounded-2xl"
                type="number"
                min={10}
                value={s.backoff_seconds}
                onChange={e => setS({ ...s, backoff_seconds: parseInt(e.target.value) || 60 })}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Wait time before the first retry. Subsequent retries scale per the strategy above.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Retry on Decline Codes</Label>
              <p className="text-xs text-muted-foreground">
                Only retry payments that fail with these decline codes. Hard declines (lost/stolen card, fraud) are never retried.
              </p>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border bg-muted/30 min-h-[60px]">
                {s.retry_decline_codes.length === 0 && (
                  <span className="text-xs text-muted-foreground">No codes configured</span>
                )}
                {s.retry_decline_codes.map(code => (
                  <Badge key={code} variant="secondary" className="gap-1 pr-1">
                    {code}
                    <button
                      type="button"
                      onClick={() => removeCode(code)}
                      className="hover:bg-destructive/20 rounded-full p-0.5"
                      aria-label={`Remove ${code}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  className="rounded-2xl"
                  placeholder="e.g. expired_card"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCode(newCode);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => addCode(newCode)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground mr-1">Suggested:</span>
                {SUGGESTED_CODES.filter(c => !s.retry_decline_codes.includes(c)).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => addCode(c)}
                    className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-muted/40 border border-border p-3">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Smart Retry runs on past-due subscription payments and failed invoice attempts.
                Each retry is logged and visible in your transaction history.
              </p>
            </div>

            <Button className="rounded-full" onClick={save} disabled={saving || loading || !merchantId}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
