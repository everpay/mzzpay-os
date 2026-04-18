import { useUserRole } from './useUserRole';

/**
 * Centralized access-control hook for fine-grained UI gating.
 *
 * Rules:
 *  - super_admin / admin: full access
 *  - reseller: own portal only (gated separately)
 *  - support: VIEW-ONLY on transactions & customers; cannot create/edit anywhere,
 *    no access to Treasury/Insights/Company sections
 */
export function useAccessControl() {
  const { data: userRole, isLoading } = useUserRole();

  const roles: string[] = (userRole as any)?.roles || [];
  const isSuperAdmin = !!userRole?.isSuperAdmin;
  const isAdmin = !!userRole?.isAdmin;
  const isReseller = !!userRole?.isReseller;
  const isSupport = !!userRole?.isSupport && !isAdmin && !isSuperAdmin;

  // Support is read-only — no mutations anywhere.
  const canMutate = !isSupport;

  // Support cannot access these sections at all.
  const canAccessTreasury = !isSupport;
  const canAccessInsights = !isSupport;
  const canAccessCompany = !isSupport;
  const canCreatePayments = !isSupport;
  const canManageProducts = !isSupport;
  const canManageSubscriptions = !isSupport;

  return {
    isLoading,
    roles,
    isSuperAdmin,
    isAdmin,
    isReseller,
    isSupport,
    canMutate,
    canAccessTreasury,
    canAccessInsights,
    canAccessCompany,
    canCreatePayments,
    canManageProducts,
    canManageSubscriptions,
  };
}
