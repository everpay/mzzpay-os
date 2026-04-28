import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole =
  | 'merchant'
  | 'super_admin'
  | 'admin'
  | 'reseller'
  | 'developer'
  | 'compliance_officer'
  | 'support'
  | 'agent'
  | 'employee';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  /** Roles allowed to view. */
  allowedRoles: AppRole[];
  /**
   * If true, only the explicitly listed roles can view (super_admin/admin do NOT auto-bypass).
   * Defaults to false (admins/super_admins bypass).
   */
  strict?: boolean;
}

export function RoleProtectedRoute({ children, allowedRoles, strict = false }: RoleProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!userRole) return <Navigate to="/dashboard" replace />;

  const roles: string[] = (userRole as any).roles || [];
  const isInAllowedList = allowedRoles.some((r) => roles.includes(r));

  const hasAccess = strict
    ? isInAllowedList
    : userRole.isSuperAdmin || userRole.isAdmin || isInAllowedList;

  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
