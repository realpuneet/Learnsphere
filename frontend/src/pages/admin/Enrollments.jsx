import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { get, post } from '../../lib/api.js';
import { Card, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { dateShort, inr } from '../../lib/format.js';

const TABS = [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'refunded', label: 'Refunded' }, { value: 'revoked', label: 'Revoked' }];

export default function AdminEnrollments() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [course, setCourse] = useState('');
  const [page, setPage] = useState(1);
  const [grant, setGrant] = useState(null);
  const [action, setAction] = useState(null); // { kind, row }
  const params = { page, limit: 20, status: status || undefined, course: course || undefined };
  const q = useQuery({ queryKey: ['admin-enrollments', params], queryFn: () => get('/admin/enrollments', params), placeholderData: keepPreviousData });
  const courses = useQuery({ queryKey: ['admin-course-options'], queryFn: () => get('/admin/courses', { status: 'published', limit: 100 }), staleTime: 60_000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-enrollments'] });

  const doGrant = useMutation({
    mutationFn: () => post('/admin/enrollments', { email: grant.email.trim(), courseId: grant.courseId }),
    onSuccess: (r) => { toast.success(r.data.created ? 'Enrolment granted' : 'Already enrolled'); setGrant(null); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const act = useMutation({
    mutationFn: ({ kind, row }) => post(`/admin/enrollments/${row._id}/${kind}`),
    onSuccess: (_r, v) => { toast.success(v.kind === 'refund' ? 'Refund initiated' : 'Access revoked'); setAction(null); refresh(); },
    onError: (e) => { setAction(null); toast.error(errMsg(e)); },
  });
  const rows = q.data?.data || [];
  const opts = courses.data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Enrolments</h1>
        <Button onClick={() => setGrant({ email: '', courseId: '' })}><Gift className="h-4 w-4" /> Grant access</Button>
      </div>
      <Tabs tabs={TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
      <Select aria-label="Filter by course" value={course} onChange={(e) => { setCourse(e.target.value); setPage(1); }}><option value="">All courses</option>{opts.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}</Select>
      {q.isLoading && <CardSkeletons count={5} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No enrolments" />}
      <div className="space-y-2">
        {rows.map((e) => (
          <Card key={e._id} className="flex flex-wrap items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">{e.user?.name} <span className="font-normal text-ink-500">· {e.user?.email}</span></p>
              <p className="truncate text-sm text-ink-600">{e.course?.title}</p>
              <p className="text-xs text-ink-400">{dateShort(e.createdAt)} · {e.source} · {e.percent}% done · {e.amountPaid ? inr(e.amountPaid) : 'Free'}</p>
            </div>
            <StatusBadge status={e.status} />
            {['active', 'completed'].includes(e.status) && (
              <div className="flex gap-1.5">
                {e.amountPaid > 0 && e.payment && <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'refund', row: e })}>Refund</Button>}
                <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'revoke', row: e })}>Revoke</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />

      <Modal open={!!grant} onClose={() => setGrant(null)} title="Grant free access" footer={<Button className="w-full" disabled={!grant?.courseId || !/^\S+@\S+\.\S+$/.test(grant?.email || '')} loading={doGrant.isPending} onClick={() => doGrant.mutate()}>Grant access</Button>}>
        {grant && (
          <div className="space-y-3">
            <Input label="Student email" type="email" required value={grant.email} onChange={(e) => setGrant((g) => ({ ...g, email: e.target.value }))} />
            <Select label="Course" required value={grant.courseId} onChange={(e) => setGrant((g) => ({ ...g, courseId: e.target.value }))}><option value="">Choose…</option>{opts.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}</Select>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!action} onClose={() => setAction(null)} danger loading={act.isPending} onConfirm={() => act.mutate(action)}
        title={action?.kind === 'refund' ? 'Refund this enrolment?' : 'Revoke access?'} confirmLabel={action?.kind === 'refund' ? 'Refund' : 'Revoke'}
        message={action?.kind === 'refund' ? `${inr(action?.row.amountPaid)} goes back to ${action?.row.user?.name}. Access ends immediately.` : `${action?.row.user?.name} will lose access to ${action?.row.course?.title}. No money is returned.`} />
    </div>
  );
}
