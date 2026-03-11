import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roles = data?.map(r => r.role) ?? [];
      return {
        roles,
        isAdmin: roles.includes('super_admin') || roles.includes('admin'),
        isSuperAdmin: roles.includes('super_admin'),
        isReseller: roles.includes('reseller'),
      };
    },
  });
}
