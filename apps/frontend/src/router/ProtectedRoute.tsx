import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { ProfileType } from '@ecocoop/shared';

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.profileType === ProfileType.BUYER) return <Navigate to="/portal" replace />;

  return <Outlet />;
}

export function BuyerRoute() {
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.profileType !== ProfileType.BUYER) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
