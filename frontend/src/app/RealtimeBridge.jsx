import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import { toast } from '../components/ui/Feedback.jsx';
import { useAuth } from '../lib/authStore.js';

/** Keeps server state fresh from socket events and surfaces live toasts. Renders nothing. */
export function RealtimeBridge() {
  const qc = useQueryClient();
  const onNotification = useCallback((n) => {
    toast.info(n.title + (n.body ? ` — ${n.body}` : ''));
    qc.invalidateQueries({ queryKey: ['notifications'] });
    if (n.type?.startsWith('course.') || n.type === 'certificate.issued') ['my-learning', 'certificates', 'instructor-courses'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }, [qc]);
  const onThread = useCallback(() => ['threads', 'inbox'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })), [qc]);
  const onSubmitted = useCallback(() => ['admin-courses', 'admin-dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })), [qc]);
  const onCompleted = useCallback(() => ['my-learning', 'learn', 'certificates'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })), [qc]);

  const onPasswordChanged = useCallback(() => {
    toast.info('Your password was changed – please log in again');
    useAuth.getState().clear();
    qc.clear();
  }, [qc]);

  useSocketEvent('auth:password-changed', onPasswordChanged);
  useSocketEvent('notification:new', onNotification);
  useSocketEvent('thread:new', onThread);
  useSocketEvent('thread:updated', onThread);
  useSocketEvent('course:submitted', onSubmitted);
  useSocketEvent('course:completed', onCompleted);
  return null;
}
