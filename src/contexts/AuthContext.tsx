import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(async () => {
          try {
            const { data: m } = await supabase.from('merchants')
              .select('id, name')
              .eq('user_id', session.user.id)
              .maybeSingle();
            if (!m) return;
            const { data: existing } = await supabase
              .from('crypto_stores' as any)
              .select('id')
              .eq('merchant_id', m.id)
              .limit(1)
              .maybeSingle();
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

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
