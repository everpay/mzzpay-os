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

export default function SmartRetry({ embedded }: { embedded?: boolean }) {
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

  const contentInner = (
    <div className="space-y-6 max-w-3xl">
