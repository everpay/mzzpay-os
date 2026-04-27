import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Sign the user out after this many ms of inactivity (no mouse / key / touch / scroll).
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const IDLE_WARNING_MS = 60 * 1000; // warn 60s before sign-out

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Track which user IDs we've already attempted a welcome send for in this
    // tab — avoids hammering the edge function on every TOKEN_REFRESHED tick.
    // The real source of truth for "send only once ever" is the server-side
    // idempotency check inside send-transactional-email.
    const welcomeAttemptedThisSession = new Set<string>();

    const maybeSendWelcomeEmail = async (
      session: Session | null,
      reason: string,
    ) => {
      try {
        const user = session?.user;
        if (!user || !user.email) return;

        // Only send once the user's email is actually confirmed by Supabase.
        // SIGNED_IN can fire for unconfirmed users in some flows, so we gate
        // strictly on email_confirmed_at.
        const confirmedAt =
          (user.email_confirmed_at as string | null | undefined) ||
          ((user as any).confirmed_at as string | null | undefined);
        if (!confirmedAt) return;

        if (welcomeAttemptedThisSession.has(user.id)) return;
        welcomeAttemptedThisSession.add(user.id);

        const recipient = user.email.trim().toLowerCase();
        const displayName =
          (user.user_metadata as any)?.display_name ||
          recipient.split('@')[0];
        const merchantName =
          (user.user_metadata as any)?.business_name ||
          `${displayName}'s Business`;

        const { error: welcomeError } = await supabase.functions.invoke(
          'send-transactional-email',
          {
            body: {
              templateName: 'customer-welcome',
              recipientEmail: recipient,
              // Stable per-user key. The edge function persists this in
              // email_idempotency_keys, so even if localStorage is cleared
              // or the user signs in on another device, only one welcome
              // email will ever be enqueued.
              idempotencyKey: `customer-welcome-${user.id}`,
              templateData: {
                name: displayName,
                merchantName,
                dashboardUrl: `${window.location.origin}/dashboard`,
              },
            },
          },
        );
        if (welcomeError) {
          console.warn('Welcome email could not be queued', { reason, welcomeError });
          // Allow a retry next event since this attempt failed before the
          // server-side idempotency reservation.
          welcomeAttemptedThisSession.delete(user.id);
        }
      } catch (err) {
        console.warn('welcome email skipped:', err);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);

      // Auto-provision Elektropay store + USDC/USDT wallet on first sign-in
      // Silently skipped if crypto tables aren't provisioned in this environment.
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(async () => {
          try {
            const { data: m } = await supabase.from('merchants')
              .select('id, name')
              .eq('user_id', session.user.id)
              .maybeSingle();
            if (!m) return;

            const { data: existing, error: existingErr } = await supabase
              .from('crypto_stores' as any)
              .select('id')
              .eq('merchant_id', m.id)
              .limit(1)
              .maybeSingle();
            // If the table doesn't exist (PGRST205) or any other lookup error, skip provisioning entirely.
            if (existingErr) return;
            if (existing) return;

            const { data: profile } = await supabase
              .from('merchant_profiles' as any)
              .select('country')
              .eq('merchant_id', m.id)
              .maybeSingle();
            await supabase.functions.invoke('elektropay-wallet', {
              body: {
                action: 'auto_provision_merchant',
                payload: {
                  merchant_id: m.id,
                  business_name: m.name,
                  country: (profile as any)?.country || null,
                },
              },
            });
          } catch (err) {
            console.warn('auto-provision skipped:', err);
          }
        }, 0);
      }

      // Welcome email: fire on any event whose session may carry a freshly
      // confirmed user. USER_UPDATED is the canonical event Supabase emits
      // when the confirmation link is clicked and the auth user record
      // changes. SIGNED_IN covers the case where the user lands back in the
      // app already confirmed. INITIAL_SESSION covers a reload right after
      // confirmation. Server-side idempotency guarantees only one send.
      if (
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION'
      ) {
        setTimeout(() => maybeSendWelcomeEmail(session, event), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // ----- Idle timeout auto sign-out (persisted across refresh) -----
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LAST_ACTIVITY_KEY = 'mzz.lastActivity';
  const IDLE_STATE_KEY = 'mzz.idleState';

  useEffect(() => {
    if (!session) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      try {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        localStorage.removeItem(IDLE_STATE_KEY);
      } catch {}
      return;
    }

    const readLastActivity = (): number => {
      try {
        const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
        const n = raw ? parseInt(raw, 10) : NaN;
        return Number.isFinite(n) ? n : Date.now();
      } catch {
        return Date.now();
      }
    };

    const writeLastActivity = (ts: number) => {
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
      } catch {}
    };

    const writeIdleState = (state: 'active' | 'warning' | 'expired') => {
      try {
        localStorage.setItem(IDLE_STATE_KEY, state);
      } catch {}
    };

    const scheduleFromLastActivity = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);

      const last = readLastActivity();
      const elapsed = Date.now() - last;
      const remaining = IDLE_TIMEOUT_MS - elapsed;

      // Already expired -> sign out immediately.
      if (remaining <= 0) {
        writeIdleState('expired');
        supabase.auth.signOut().then(() => {
          toast({
            title: 'Signed out',
            description: 'You were signed out due to inactivity.',
          });
        });
        return;
      }

      const warnIn = remaining - IDLE_WARNING_MS;
      if (warnIn > 0) {
        warnTimerRef.current = setTimeout(() => {
          writeIdleState('warning');
          toast({
            title: 'You will be signed out soon',
            description: 'You\'ve been inactive. Move your mouse or press a key to stay signed in.',
          });
        }, warnIn);
      } else {
        // Past warning threshold but not expired — warn now.
        writeIdleState('warning');
        toast({
          title: 'You will be signed out soon',
          description: 'You\'ve been inactive. Move your mouse or press a key to stay signed in.',
        });
      }

      idleTimerRef.current = setTimeout(async () => {
        writeIdleState('expired');
        await supabase.auth.signOut();
        toast({
          title: 'Signed out',
          description: 'You were signed out due to inactivity.',
        });
      }, remaining);
    };

    const onActivity = () => {
      writeLastActivity(Date.now());
      writeIdleState('active');
      scheduleFromLastActivity();
    };

    // Sync across tabs: if another tab updates activity, reschedule here too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) scheduleFromLastActivity();
    };

    // Seed last-activity if missing (fresh sign-in).
    try {
      if (!localStorage.getItem(LAST_ACTIVITY_KEY)) writeLastActivity(Date.now());
    } catch {}

    const events: string[] = [
      'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'visibilitychange',
    ];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true } as AddEventListenerOptions)
    );
    window.addEventListener('storage', onStorage);

    scheduleFromLastActivity();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener('storage', onStorage);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    };
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
