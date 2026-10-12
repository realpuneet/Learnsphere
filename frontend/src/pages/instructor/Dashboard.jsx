import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, MessageSquare, Plus, Users, Wallet } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { Card, SectionTitle, Stat, StatusBadge, Avatar } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletons, ErrorState } from '../../components/ui/Feedback.jsx';
import { Stars } from '../../components/common/Rating.jsx';
import { inr, num } from '../../lib/format.js';

function Trend({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.enrolments));
  if (!rows.length) return <p className="text-sm text-ink-500">No enrolments in the last 14 days.</p>;
  return (
    <div className="flex h-32 items-end gap-1.5" role="img" aria-label="Enrolments in the last 14 days">
      {rows.map((r) => (
        <div key={r.date} className="group relative flex-1">
          <div className="rounded-t-md bg-brand-400 transition group-hover:bg-brand-600" style={{ height: `${Math.max(6, (r.enrolments / max) * 100)}%` }} />
          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">{r.date.slice(5)}: {r.enrolments}</span>
        </div>
      ))}
    </div>
  );
}

export default function InstructorDashboard() {
  const user = useAuth((s) => s.user);
  const q = useQuery({ queryKey: ['instructor-dashboard'], queryFn: () => get('/instructor/dashboard') });
  if (q.isLoading) return <CardSkeletons count={4} className="h-28" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const d = q.data.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Hello, {user.name.split(' ')[0]}</h1>
        <Button to="/instructor/courses?new=1"><Plus className="h-4 w-4" /> New course</Button>
      </div>
      {user.role === 'instructor' && !user.instructor?.approved && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Your instructor account is awaiting approval. You can build courses now; submitting for review unlocks after approval.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Students" value={num(d.totals.students)} icon={Users} />
        <Stat label="Courses live" value={`${d.totals.published}/${d.totals.courses}`} icon={BookOpen} />
        <Stat label="Earnings (30d)" value={inr(d.earnings30d.instructor)} icon={Wallet} tone="green" hint={`All time ${inr(d.earningsAll.instructor)}`} />
        <Stat label="Unanswered Q&A" value={num(d.totals.unanswered)} icon={MessageSquare} tone="coral" />
      </div>
      <Card className="p-5"><SectionTitle title="New enrolments" subtitle="Last 14 days" /><div className="mt-5"><Trend rows={d.trend} /></div></Card>
      <section>
        <SectionTitle title="Your courses" action={<Button to="/instructor/courses" variant="ghost" size="sm">Manage</Button>} />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {d.courses.map((c) => (
            <Link key={c._id} to={`/instructor/courses/${c._id}`}>
              <Card className="p-4 transition hover:shadow-pop">
                <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 font-semibold text-ink-900">{c.title}</p><StatusBadge status={c.status} /></div>
                <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <div><dt className="text-ink-400">Students</dt><dd className="font-bold text-ink-900">{num(c.students)}</dd></div>
                  <div><dt className="text-ink-400">Progress</dt><dd className="font-bold text-ink-900">{c.avgProgress}%</dd></div>
                  <div><dt className="text-ink-400">Completed</dt><dd className="font-bold text-ink-900">{c.completionRate}%</dd></div>
                  <div><dt className="text-ink-400">Earned</dt><dd className="font-bold text-emerald-700">{inr(c.earnings)}</dd></div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      {d.recentReviews.length > 0 && (
        <section>
          <SectionTitle title="Recent reviews" />
          <div className="mt-3 space-y-2">
            {d.recentReviews.map((r) => (
              <Card key={r._id} className="flex gap-3 p-4">
                <Avatar name={r.user?.name} src={r.user?.avatar} size={36} />
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-sm"><b>{r.user?.name}</b><Stars value={r.rating} size={12} /><span className="text-xs text-ink-400">on {r.course?.title}</span></div>{r.comment && <p className="mt-1 text-sm text-ink-600">{r.comment}</p>}</div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
