import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Star, X } from 'lucide-react';
import { get, patch, post } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Card, StatusBadge } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Textarea } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { Thumb } from '../../components/common/CourseCard.jsx';
import { timeAgo } from '../../lib/format.js';

const TABS = [{ value: 'in_review', label: 'Review queue' }, { value: '', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Drafts' }, { value: 'rejected', label: 'Rejected' }, { value: 'archived', label: 'Archived' }];
const MOVES = ['draft', 'in_review', 'published', 'rejected', 'archived'];

export default function AdminCourses() {
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') ?? 'in_review';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const dq = useDebounce(search);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const params = { page, limit: 20, status: status || undefined, q: dq || undefined };
  const q = useQuery({ queryKey: ['admin-courses', params], queryFn: () => get('/admin/courses', params), placeholderData: keepPreviousData });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-courses'] }); qc.invalidateQueries({ queryKey: ['admin-dashboard'] }); };

  const review = useMutation({
    mutationFn: ({ id, decision, reason: r }) => post(`/admin/courses/${id}/review`, { decision, ...(r ? { reason: r } : {}) }),
    onSuccess: (_r, v) => { toast.success(v.decision === 'approve' ? 'Course published' : 'Sent back to the instructor'); setRejecting(null); setReason(''); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const feature = useMutation({ mutationFn: ({ id, featured }) => patch(`/admin/courses/${id}/featured`, { featured }), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });
  const setStatus = useMutation({ mutationFn: ({ id, to }) => patch(`/admin/courses/${id}/status`, { status: to }), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });
  const rows = q.data?.data || [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Courses & review</h1>
      <Tabs tabs={TABS} value={status} onChange={(v) => { setSp(v ? { status: v } : { status: '' }, { replace: true }); setPage(1); }} />
      <Input aria-label="Search courses" placeholder="Search by title…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      {q.isLoading && <CardSkeletons count={4} className="h-24" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title={status === 'in_review' ? 'Review queue is empty' : 'No courses found'} />}
      <div className="space-y-2">
        {rows.map((c) => (
          <Card key={c._id} className="space-y-3 p-3.5">
            <div className="flex gap-3">
              <div className="aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-ink-100"><Thumb course={c} width={240} /></div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900"><span className="truncate">{c.title}</span><StatusBadge status={c.status} />{c.featured && <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-label="Featured" />}</p>
                <p className="text-xs text-ink-500">{c.instructor?.name} · {c.category?.name || 'No category'} · {c.stats?.lessons || 0} lessons · updated {timeAgo(c.updatedAt)}</p>
                {c.rejectionReason && c.status === 'rejected' && <p className="mt-1 text-xs text-red-700">Reason: {c.rejectionReason}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {c.status === 'in_review' && (
                <>
                  <Button size="sm" loading={review.isPending && review.variables?.id === c._id && review.variables?.decision === 'approve'} onClick={() => review.mutate({ id: c._id, decision: 'approve' })}><Check className="h-4 w-4" /> Approve & publish</Button>
                  <Button size="sm" variant="secondary" onClick={() => setRejecting(c)}><X className="h-4 w-4" /> Request changes</Button>
                </>
              )}
              <Button size="sm" variant="ghost" to={`/courses/${c.slug}`}><ExternalLink className="h-4 w-4" /> Open</Button>
              {c.status === 'published' && <Button size="sm" variant="ghost" onClick={() => feature.mutate({ id: c._id, featured: !c.featured })}><Star className="h-4 w-4" /> {c.featured ? 'Unfeature' : 'Feature'}</Button>}
              <Select aria-label="Change status" wrapperClass="ml-auto w-36" value="" onChange={(e) => e.target.value && setStatus.mutate({ id: c._id, to: e.target.value })}>
                <option value="">Move to…</option>
                {MOVES.filter((m) => m !== c.status).map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </Select>
            </div>
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Request changes" footer={<Button className="w-full" disabled={reason.trim().length < 5} loading={review.isPending} onClick={() => review.mutate({ id: rejecting._id, decision: 'reject', reason: reason.trim() })}>Send to instructor</Button>}>
        <p className="mb-3 text-sm text-ink-600">Tell <b>{rejecting?.instructor?.name}</b> what to fix in “{rejecting?.title}”. They will see this and can resubmit.</p>
        <Textarea label="What needs to change?" rows={5} required value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </div>
  );
}
