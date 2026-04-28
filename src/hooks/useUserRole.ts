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
      const [rolesResult, merchantResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id),
        supabase
          .from('merchants')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const roles = rolesResult.data?.map(r => r.role) ?? [];
      if (merchantResult.data?.id && !roles.includes('merchant' as any)) {
        roles.push('merchant' as any);
      }
      return {
        roles,
        isMerchant: roles.includes('merchant' as any),
        isAdmin: roles.includes('super_admin') || roles.includes('admin'),
        isSuperAdmin: roles.includes('super_admin'),
        isReseller: roles.includes('reseller'),
        isDeveloper: roles.includes('developer'),
        isComplianceOfficer: roles.includes('compliance_officer'),
        isSupport: roles.includes('support'),
        isAgent: roles.includes('agent'),
        isEmployee: roles.includes('employee'),
      };
    },
  });
}
