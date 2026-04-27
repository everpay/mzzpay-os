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

        // Send the welcome email AFTER email confirmation, exactly once per user.
        // Triggering here (instead of at signup) guarantees the address has
        // passed Supabase's confirmation step, so the message is deliverable
        // and won't be suppressed by an unconfirmed/bouncing state.
        setTimeout(async () => {
          try {
            const user = session.user;
            const confirmed = !!(user.email_confirmed_at || (user as any).confirmed_at);
            if (!confirmed || !user.email) return;

            const WELCOME_KEY = `mzz.welcomeEmailSent:${user.id}`;
            try {
              if (localStorage.getItem(WELCOME_KEY)) return;
            } catch {}

            const recipient = user.email.trim().toLowerCase();
            const displayName =
              (user.user_metadata as any)?.display_name ||
              recipient.split('@')[0];
            const merchantName =
              (user.user_metadata as any)?.business_name ||
              `${displayName}'s Business`;

            const { error: welcomeError } = await supabase.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'customer-welcome',
                recipientEmail: recipient,
                // Idempotency key by user id ensures the welcome is sent only once,
                // even across multiple sign-ins or devices.
                idempotencyKey: `customer-welcome-${user.id}`,
                templateData: {
                  name: displayName,
                  merchantName,
                  dashboardUrl: `${window.location.origin}/dashboard`,
                },
              },
            });
            if (welcomeError) {
              console.warn('Welcome email could not be queued', welcomeError);
              return;
            }
            try { localStorage.setItem(WELCOME_KEY, String(Date.now())); } catch {}
          } catch (err) {
            console.warn('welcome email skipped:', err);
          }
        }, 0);
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
