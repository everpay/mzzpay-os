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

  // ----- Idle timeout auto sign-out -----
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      return;
    }

    const resetTimers = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);

      warnTimerRef.current = setTimeout(() => {
        toast({
          title: 'You will be signed out soon',
          description: 'You\'ve been inactive. Move your mouse or press a key to stay signed in.',
        });
      }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

      idleTimerRef.current = setTimeout(async () => {
        await supabase.auth.signOut();
        toast({
          title: 'Signed out',
          description: 'You were signed out due to inactivity.',
        });
      }, IDLE_TIMEOUT_MS);
    };

    const events: string[] = [
      'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'visibilitychange',
    ];
    events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true } as AddEventListenerOptions));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimers));
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
