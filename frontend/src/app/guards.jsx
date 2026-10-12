import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from '../lib/authStore.js';
import { PageLoader } from '../components/ui/Feedback.jsx';

export function RequireAuth() {
  const { status } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status !== 'authed') return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const { status, user } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status !== 'authed') return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
