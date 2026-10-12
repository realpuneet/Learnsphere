import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardCheck, GraduationCap, UserCheck, Users, Wallet } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';
import { Card, SectionTitle, Stat } from '../../components/ui/Card.jsx';
import { CardSkeletons, ErrorState } from '../../components/ui/Feedback.jsx';
import { inr, num } from '../../lib/format.js';

export default function AdminDashboard() {
  const q = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => get('/admin/dashboard'), refetchInterval: 120_000 });
  useSocketEvent('course:submitted', () => q.refetch());
  if (q.isLoading) return <CardSkeletons count={4} className="h-28" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const d = q.data.data;
  const max = Math.max(1, ...d.trend.map((t) => t.enrolments));
  const mail = d.email30d || {};
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue (30d, gross)" value={inr(d.revenue30d.gross)} icon={Wallet} tone="green" hint={`Platform ${inr(d.revenue30d.platform)} · ${d.revenue30d.orders} orders`} />
        <Stat label="Students" value={num(d.users.student)} icon={Users} hint={`${num(d.newUsers30d)} new in 30 days`} />
        <Stat label="Published courses" value={num(d.courses.published || 0)} icon={BookOpen} />
        <Stat label="Instructors" value={num(d.users.instructor)} icon={GraduationCap} />
      </div>
      {(d.pendingReview > 0 || d.pendingInstructors > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {d.pendingReview > 0 && <Link to="/admin/courses?status=in_review"><Card className="flex items-center gap-3 border-amber-200 bg-amber-50 p-4"><ClipboardCheck className="h-6 w-6 text-amber-600" /><div><p className="font-bold text-amber-900">{d.pendingReview} course{d.pendingReview === 1 ? '' : 's'} awaiting review</p><p className="text-sm text-amber-800">Review now →</p></div></Card></Link>}
          {d.pendingInstructors > 0 && <Link to="/admin/users?pending=1"><Card className="flex items-center gap-3 border-amber-200 bg-amber-50 p-4"><UserCheck className="h-6 w-6 text-amber-600" /><div><p className="font-bold text-amber-900">{d.pendingInstructors} instructor{d.pendingInstructors === 1 ? '' : 's'} awaiting approval</p><p className="text-sm text-amber-800">Review now →</p></div></Card></Link>}
        </div>
      )}
      <Card className="p-5">
        <SectionTitle title="Enrolments" subtitle="Last 14 days" />
        <div className="mt-5 flex h-36 items-end gap-1.5" role="img" aria-label="Enrolments in the last 14 days">
          {d.trend.length === 0 && <p className="text-sm text-ink-500">No activity yet.</p>}
          {d.trend.map((t) => (
            <div key={t.date} className="group relative flex-1">
              <div className="rounded-t-md bg-brand-400 transition group-hover:bg-brand-600" style={{ height: `${Math.max(6, (t.enrolments / max) * 100)}%` }} />
              <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">{t.date.slice(5)}: {t.enrolments} · {inr(t.revenue)}</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Revenue split (all time)" />
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Gross (incl. GST)</dt><dd className="font-semibold">{inr(d.revenueAll.gross)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Net of GST</dt><dd className="font-semibold">{inr(d.revenueAll.net)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Platform fee</dt><dd className="font-semibold text-brand-700">{inr(d.revenueAll.platform)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Instructors</dt><dd className="font-semibold text-emerald-700">{inr(d.revenueAll.instructor)}</dd></div>
          </dl>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Top courses" />
          <ol className="mt-3 space-y-2">
            {d.topCourses.map((c, i) => <li key={c._id} className="flex items-center gap-3 text-sm"><span className="w-5 text-ink-400">{i + 1}</span><Link to={`/courses/${c.slug}`} className="min-w-0 flex-1 truncate font-medium text-ink-800 hover:text-brand-700">{c.title}</Link><span className="text-ink-500">{num(c.stats?.enrolled)} students</span></li>)}
            {d.topCourses.length === 0 && <p className="text-sm text-ink-500">No published courses yet.</p>}
          </ol>
        </Card>
      </div>
      <Card className="p-5">
        <SectionTitle title="Email delivery (30 days)" subtitle="Email is an optional channel; in-app notifications always happen." />
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          {['sent', 'dry_run', 'failed', 'queued'].map((s) => <div key={s}><p className="text-2xl font-extrabold text-ink-900">{num(mail[s] || 0)}</p><p className="text-ink-500">{s.replace('_', ' ')}</p></div>)}
        </div>
      </Card>
    </div>
  );
}
