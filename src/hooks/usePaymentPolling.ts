import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface PaymentPollingOptions {
  transactionId: string | null;
  enabled?: boolean;
  intervalMs?: number;
  maxAttempts?: number;
  onComplete?: (status: string) => void;
  onFailed?: (status: string) => void;
}

interface PollingState {
  isPolling: boolean;
  currentStatus: string | null;
  attempts: number;
}

export function usePaymentPolling({
  transactionId,
  enabled = true,
  intervalMs = 3000,
  maxAttempts = 40,
  onComplete,
  onFailed,
}: PaymentPollingOptions): PollingState & { startPolling: (txId: string) => void; stopPolling: () => void } {
  const [isPolling, setIsPolling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const txIdRef = useRef<string | null>(transactionId);
  const queryClient = useQueryClient();

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const checkStatus = useCallback(async (txId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { transaction_id: txId },
      });
      if (error) { console.error('Polling error:', error); return null; }
      const status = data?.status;
      setCurrentStatus(status);
      if (status === 'completed') {
        stopPolling();
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        onComplete?.(status);
      } else if (status === 'failed') {
        stopPolling();
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        onFailed?.(status);
      }
      return status;
    } catch (err) { console.error('Polling check failed:', err); return null; }
  }, [stopPolling, queryClient, onComplete, onFailed]);

  const startPolling = useCallback((txId: string) => {
    txIdRef.current = txId;
    setAttempts(0);
    setIsPolling(true);
    setCurrentStatus('pending');
    checkStatus(txId);
    intervalRef.current = setInterval(() => {
      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= maxAttempts) { stopPolling(); return next; }
        checkStatus(txId);
        return next;
      });
    }, intervalMs);
  }, [checkStatus, intervalMs, maxAttempts, stopPolling]);

  useEffect(() => {
    if (transactionId && enabled && !isPolling) startPolling(transactionId);
  }, [transactionId, enabled]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return { isPolling, currentStatus, attempts, startPolling, stopPolling };
}
