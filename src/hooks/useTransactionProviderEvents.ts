import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProviderEvent } from '@/lib/types';

/**
 * Stream provider_events for a single transaction so the detail drawer's
 * timeline updates live as new lifecycle steps land:
 *   - payment.created
 *   - three_ds.step_up_required / three_ds.fallback_2d
 *   - matrix.h2h.attempt / matrix.h2h.completed
 *   - settlement.confirmed
 *
 * Loads the existing rows on mount, then opens a Realtime subscription
 * filtered server-side by `transaction_id` and merges new INSERTs into
 * state. Always returns events sorted oldest → newest.
 */
export function useTransactionProviderEvents(transactionId: string | null | undefined) {
  const [events, setEvents] = useState<ProviderEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!transactionId) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    // Initial fetch
    (async () => {
      const { data, error } = await supabase
        .from('provider_events')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (error) {
        console.warn('[useTransactionProviderEvents] initial fetch failed', error);
        setEvents([]);
      } else {
        setEvents((data ?? []) as unknown as ProviderEvent[]);
      }
      setIsLoading(false);
    })();

    // Realtime subscription — server-side filter on transaction_id keeps
    // payload volume tiny and removes the need for client-side filtering.
    const channel = supabase
      .channel(`provider-events-tx-${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'provider_events',
          filter: `transaction_id=eq.${transactionId}`,
        },
        (payload) => {
          const newEvent = payload.new as unknown as ProviderEvent;
          setEvents((prev) => {
            // Dedupe in case the initial fetch + realtime overlap.
            if (prev.some((e) => e.id === newEvent.id)) return prev;
            const next = [...prev, newEvent];
            next.sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [transactionId]);

  return { events, isLoading };
}
