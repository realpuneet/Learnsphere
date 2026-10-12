import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshSession } from '../../lib/api.js';
import { homeFor, useAuth } from '../../lib/authStore.js';
import { PageLoader } from '../../components/ui/Feedback.jsx';

/** Landing page after the LinkedIn redirect: the API already set the refresh cookie, so just open the session. */
export default function AuthCallback() {
  const nav = useNavigate();
  useEffect(() => {
    refreshSession()
      .then(() => nav(homeFor(useAuth.getState().user?.role), { replace: true }))
      .catch(() => nav('/login?error=social_failed', { replace: true }));
  }, [nav]);
  return <PageLoader />;
}
