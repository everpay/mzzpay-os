import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<'admin' | 'reseller'>;
}

export function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
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

  const hasAccess =
    userRole.isSuperAdmin ||
    userRole.isAdmin ||
    allowedRoles.some(role => {
      if (role === 'reseller') return userRole.isReseller;
      if (role === 'admin') return userRole.isAdmin;
      return false;
    });

  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
