import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { get } from '../../lib/api.js';
import { Avatar, Card, StatusBadge } from '../../components/ui/Card.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { ProgressBar } from '../../components/common/CourseCard.jsx';
import { dateShort, inr, timeAgo } from '../../lib/format.js';

export default function CourseStudents() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['course-students', id, page], queryFn: () => get(`/instructor/courses/${id}/students`, { page, limit: 20 }), placeholderData: keepPreviousData });
  const rows = q.data?.data || [];
  return (
    <div className="space-y-4">
      <Link to={`/instructor/courses/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> Back to course</Link>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Students {q.data?.meta ? `(${q.data.meta.total})` : ''}</h1>
      {q.isLoading && <CardSkeletons count={4} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No students yet" text="Share your course link to get your first learners." />}
      <div className="space-y-2">
        {rows.map((e) => (
          <Card key={e._id} className="flex flex-wrap items-center gap-3 p-3.5">
            <Avatar name={e.user?.name} src={e.user?.avatar} size={40} />
            <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink-900">{e.user?.name}</p><p className="truncate text-xs text-ink-500">{e.user?.email} · joined {dateShort(e.createdAt)} · active {timeAgo(e.lastActivityAt)}</p></div>
            <div className="w-32"><p className="mb-1 text-right text-xs font-semibold text-ink-600">{e.percent}%</p><ProgressBar value={e.percent} /></div>
            <StatusBadge status={e.status} />
            <span className="w-16 text-right text-sm text-ink-600">{e.amountPaid ? inr(e.amountPaid) : 'Free'}</span>
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />
    </div>
  );
}
