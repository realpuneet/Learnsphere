import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MessageSquare, Trash2 } from 'lucide-react';
import { del, patch, post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { Avatar, Badge, Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Textarea } from '../ui/Form.jsx';
import { errMsg, toast } from '../ui/Feedback.jsx';
import { Markdown } from './Markdown.jsx';
import { timeAgo } from '../../lib/format.js';

/** One Q&A thread with its answers and an answer box. `invalidate` lists query keys to refresh afterwards. */
export function ThreadCard({ thread, invalidate = [['threads']], showCourse = false, defaultOpen = false }) {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const [open, setOpen] = useState(defaultOpen);
  const [body, setBody] = useState('');
  const refresh = () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  const myId = String(me?.id || me?._id);
  const mine = String(thread.author?._id) === myId;
  const canResolve = mine || me?.role !== 'student';

  const answer = useMutation({
    mutationFn: () => post(`/threads/${thread._id}/answers`, { body: body.trim() }),
    onSuccess: () => { setBody(''); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const resolve = useMutation({
    mutationFn: () => patch(`/threads/${thread._id}/resolved`, { resolved: !thread.resolved }),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: () => del(`/threads/${thread._id}`),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Card className="p-4">
      <button className="flex w-full items-start gap-3 text-left" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={thread.author?.name} src={thread.author?.avatar} size={36} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-900">{thread.title}</p>
          <p className="text-xs text-ink-500">{thread.author?.name} · {timeAgo(thread.createdAt)}{showCourse && thread.course?.title ? ` · ${thread.course.title}` : ''}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {thread.resolved && <Badge tone="green">Resolved</Badge>}
          <span className="inline-flex items-center gap-1 text-xs text-ink-500"><MessageSquare className="h-3.5 w-3.5" />{thread.answers?.length || 0}</span>
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
          {thread.body && <Markdown source={thread.body} className="text-sm" />}
          {(thread.answers || []).map((a) => (
            <div key={a._id} className="flex gap-3 rounded-xl bg-ink-50 p-3">
              <Avatar name={a.author?.name} src={a.author?.avatar} size={30} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-800">{a.author?.name}{a.isInstructor && <Badge tone="brand">Instructor</Badge>}<span className="text-xs font-normal text-ink-400">{timeAgo(a.createdAt)}</span></p>
                <Markdown source={a.body} className="mt-1 text-sm" />
              </div>
            </div>
          ))}
          <div className="space-y-2">
            <Textarea aria-label="Your answer" rows={2} placeholder="Write an answer…" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={!body.trim()} loading={answer.isPending} onClick={() => answer.mutate()}>Post answer</Button>
              {canResolve && <Button size="sm" variant="secondary" loading={resolve.isPending} onClick={() => resolve.mutate()}><CheckCircle2 className="h-4 w-4" /> {thread.resolved ? 'Reopen' : 'Mark resolved'}</Button>}
              {(mine || me?.role === 'admin') && <Button size="sm" variant="ghost" loading={remove.isPending} onClick={() => remove.mutate()}><Trash2 className="h-4 w-4" /> Delete</Button>}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
