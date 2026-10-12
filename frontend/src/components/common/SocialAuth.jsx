import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Linkedin } from 'lucide-react';
import { get, post } from '../../lib/api.js';
import { useAuth, homeFor } from '../../lib/authStore.js';
import { errMsg, toast } from '../ui/Feedback.jsx';

const GIS = 'https://accounts.google.com/gsi/client';
let gisPromise;
const loadGis = () =>
  (gisPromise ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = GIS;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      gisPromise = undefined;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(s);
  }));

function GoogleButton({ clientId, onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    let dead = false;
    loadGis()
      .then(() => {
        if (dead || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              const { data } = await post('/auth/google', { credential });
              onDone(data);
            } catch (e) {
              toast.error(errMsg(e));
            }
          },
        });
        window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', text: 'continue_with', width: Math.min(ref.current.offsetWidth || 320, 400) });
      })
      .catch((e) => toast.error(e.message));
    return () => {
      dead = true;
    };
  }, [clientId, onDone]);
  return <div ref={ref} className="flex min-h-[44px] w-full justify-center" />;
}

/** "Continue with Google / LinkedIn" – renders only the providers the server has configured. */
export function SocialAuth({ from }) {
  const nav = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const { data } = useQuery({ queryKey: ['auth-providers'], queryFn: () => get('/auth/providers').then((r) => r.data), staleTime: Infinity, retry: false });
  if (!data || (!data.google && !data.linkedin)) return null;

  const done = (session) => {
    setSession(session);
    const to = typeof from === 'string' && from.startsWith('/') && session.user.role === 'student' ? from : homeFor(session.user.role);
    nav(to, { replace: true });
  };
  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center gap-3 text-xs text-ink-400"><span className="h-px flex-1 bg-ink-100" />or<span className="h-px flex-1 bg-ink-100" /></div>
      <div className="space-y-3">
        {data.google && <GoogleButton clientId={data.google} onDone={done} />}
        {data.linkedin && (
          <a href="/api/v1/auth/linkedin" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white text-sm font-semibold text-ink-800 transition hover:bg-ink-50">
            <Linkedin className="h-5 w-5 text-[#0a66c2]" /> Continue with LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
