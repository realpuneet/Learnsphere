import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api.js';
import { Badge, Card, StatusBadge } from '../../components/ui/Card.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { dateTimeFull, inr } from '../../lib/format.js';

const TABS = [{ value: '', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'created', label: 'Pending' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }];

export default function AdminPayments() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const params = { page, limit: 25, status: status || undefined };
  const q = useQuery({ queryKey: ['admin-payments', params], queryFn: () => get('/admin/payments', params), placeholderData: keepPreviousData });
  const rows = q.data?.data || [];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Payments</h1>
      <Tabs tabs={TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
      {q.isLoading && <CardSkeletons count={5} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No payments" />}
      <div className="space-y-2">
        {rows.map((p) => (
          <Card key={p._id} className="flex flex-wrap items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">{p.user?.name} <span className="font-normal text-ink-500">· {p.user?.email}</span></p>
              <p className="truncate font-mono text-xs text-ink-400">{p.providerPaymentId || p.providerOrderId}</p>
              <p className="text-xs text-ink-500">{dateTimeFull(p.paidAt || p.createdAt)}{p.meta?.coupon ? ` · coupon ${p.meta.coupon}` : ''}</p>
            </div>
            {p.dryRun && <Badge tone="amber">Dry run</Badge>}
            <StatusBadge status={p.status} />
            <span className="w-24 text-right font-bold text-ink-900">{inr(p.amount)}</span>
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />
    </div>
  );
}
