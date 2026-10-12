import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { get } from '../lib/api.js';
import { useAuth } from '../lib/authStore.js';

export function NotificationBell({ to = '/notifications' }) {
  const authed = useAuth((s) => s.status === 'authed');
  const { data } = useQuery({
    queryKey: ['notifications', 'badge'],
    queryFn: () => get('/me/notifications', { limit: 1 }),
    enabled: authed,
    refetchInterval: 120_000,
  });
  const unread = data?.meta?.unread || 0;
  return (
    <Link to={to} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative rounded-xl p-2 text-ink-600 hover:bg-ink-100">
      <Bell className="h-5 w-5" />
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}
