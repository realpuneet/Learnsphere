import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api.js';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { dateTimeFull } from '../../lib/format.js';

const TABS = [{ value: '', label: 'All' }, { value: 'sent', label: 'Sent' }, { value: 'dry_run', label: 'Dry run' }, { value: 'failed', label: 'Failed' }, { value: 'queued', label: 'Queued' }];
const TONE = { sent: 'green', dry_run: 'amber', failed: 'red', queued: 'gray' };

export default function AdminLogs() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const params = { page, limit: 25, status: status || undefined };
  const q = useQuery({ queryKey: ['admin-logs', params], queryFn: () => get('/admin/notification-logs', params), placeholderData: keepPreviousData });
  const rows = q.data?.data || [];
  return (
    <div className="space-y-4">
      <div><h1 className="font-display text-2xl font-extrabold text-ink-900">Email log</h1><p className="text-sm text-ink-500">Every email attempt. “Dry run” means SMTP isn&apos;t configured, so nothing was actually sent.</p></div>
      <Tabs tabs={TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
      {q.isLoading && <CardSkeletons count={5} className="h-14" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No emails yet" />}
      <div className="space-y-2">
        {rows.map((l) => (
          <Card key={l._id} className="flex flex-wrap items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink-900">{l.type}</p><p className="truncate text-xs text-ink-500">to {l.to || l.user?.name} · {dateTimeFull(l.createdAt)}</p>{l.error && <p className="truncate text-xs text-red-600">{l.error}</p>}</div>
            <Badge tone={TONE[l.status] || 'gray'}>{l.status.replace('_', ' ')}</Badge>
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />
    </div>
  );
}
