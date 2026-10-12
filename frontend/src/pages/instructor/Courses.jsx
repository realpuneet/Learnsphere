import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { get, post } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card, StatusBadge } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { Thumb } from '../../components/common/CourseCard.jsx';
import { inr, num, timeAgo } from '../../lib/format.js';

const TABS = [{ value: '', label: 'All' }, { value: 'draft', label: 'Drafts' }, { value: 'in_review', label: 'In review' }, { value: 'published', label: 'Published' }, { value: 'rejected', label: 'Changes needed' }, { value: 'archived', label: 'Archived' }];

export default function InstructorCourses() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  useEffect(() => { if (sp.get('new')) { setCreating(true); setSp({}, { replace: true }); } }, [sp, setSp]);

  const params = { page, limit: 20, status: status || undefined };
  const q = useQuery({ queryKey: ['instructor-courses', params], queryFn: () => get('/instructor/courses', params), placeholderData: keepPreviousData });
  const create = useMutation({
    mutationFn: () => post('/instructor/courses', { title: title.trim() }),
    onSuccess: (r) => { toast.success('Draft created'); nav(`/instructor/courses/${r.data._id}`); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const rows = q.data?.data || [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">My courses</h1>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New course</Button>
      </div>
      <Tabs tabs={TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
      {q.isLoading && <CardSkeletons count={4} className="h-24" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No courses here" text="Create your first course and share what you know." action={<Button onClick={() => setCreating(true)}>Create a course</Button>} />}
      <div className="space-y-2">
        {rows.map((c) => (
          <Link key={c._id} to={`/instructor/courses/${c._id}`}>
            <Card className="flex items-center gap-3 p-3 transition hover:shadow-pop">
              <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-ink-100"><Thumb course={c} width={240} /></div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-semibold text-ink-900">{c.title}</p>
                <p className="text-xs text-ink-500">{c.category?.name || 'No category'} · {c.stats?.lessons || 0} lessons · {num(c.stats?.enrolled)} students · {c.price ? inr(c.price) : 'Free'}</p>
                <p className="text-xs text-ink-400">Updated {timeAgo(c.updatedAt)}</p>
              </div>
              <StatusBadge status={c.status} />
            </Card>
          </Link>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />
      <Modal open={creating} onClose={() => setCreating(false)} title="New course" footer={<Button className="w-full" disabled={title.trim().length < 5} loading={create.isPending} onClick={() => create.mutate()}>Create draft</Button>}>
        <Input label="Course title" required autoFocus placeholder="e.g. Complete Web Development Bootcamp" hint="At least 5 characters. You can change it later." value={title} onChange={(e) => setTitle(e.target.value)} />
      </Modal>
    </div>
  );
}
