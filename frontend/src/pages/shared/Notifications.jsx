import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Bell, BookOpen, CheckCheck, MessageSquare, Star, Wallet, ClipboardCheck } from 'lucide-react';
import { post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { useCursorList } from '../../hooks/useCursorList.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';
import { timeAgo } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const iconFor = (t = '') =>
  t === 'course.enrolled' || t === 'instructor.new_student' || t.startsWith('learning') ? BookOpen
  : t.startsWith('certificate') ? Award
  : t.startsWith('thread') ? MessageSquare
  : t.startsWith('review') ? Star
  : t.startsWith('payment') ? Wallet
  : t.startsWith('course') ? ClipboardCheck
  : Bell;

function linkFor(n, role) {
  const d = n.data || {};
  if (d.certificateId) return role === 'student' ? `/certificates/${d.certificateId}` : null;
  if (d.threadId && d.courseId) return role === 'student' ? `/learn/${d.courseId}` : '/instructor/qa';
  if (d.courseId) {
    if (role === 'student') return `/learn/${d.courseId}`;
    if (role === 'instructor') return `/instructor/courses/${d.courseId}`;
    return '/admin/courses';
  }
  return null;
}

export default function Notifications() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const role = useAuth((s) => s.user.role);
  const q = useCursorList('notifications', '/me/notifications');
  const unread = q.data?.pages[0]?.meta?.unread || 0;
  const readAll = useMutation({ mutationFn: () => post('/me/notifications/all/read'), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const readOne = useMutation({ mutationFn: (id) => post(`/me/notifications/${id}/read`), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });

  return (
    <div className="container max-w-2xl py-6 sm:py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Notifications</h1>
        {unread > 0 && <Button size="sm" variant="secondary" loading={readAll.isPending} onClick={() => readAll.mutate()}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      </div>
      <div className="mt-5 space-y-2">
        {q.isLoading && <CardSkeletons count={4} className="h-16" />}
        {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
        {!q.isLoading && !q.isError && q.items.length === 0 && <Empty icon={Bell} title="You're all caught up" text="Enrolments, answers, certificates and course updates show up here." />}
        {q.items.map((n) => {
          const Icon = iconFor(n.type);
          const to = linkFor(n, role);
          const isNew = !n.readAt;
          return (
            <button key={n._id} onClick={() => { if (isNew) readOne.mutate(n._id); if (to) nav(to); }} className="block w-full text-left">
              <Card className={cn('flex items-start gap-3 p-4 transition hover:shadow-pop', isNew && 'border-brand-200 bg-brand-50/50')}>
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', isNew ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500')}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><p className="font-semibold text-ink-900">{n.title}</p>{n.body && <p className="text-sm text-ink-600">{n.body}</p>}<p className="mt-0.5 text-xs text-ink-400">{timeAgo(n.createdAt)}</p></div>
                {isNew && <span className="mt-2 h-2.5 w-2.5 rounded-full bg-coral-500" aria-label="Unread" />}
              </Card>
            </button>
          );
        })}
        <LoadMore query={q} />
      </div>
    </div>
  );
}
