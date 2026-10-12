import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { get } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { dateLong } from '../../lib/format.js';

export default function Certificates() {
  const q = useQuery({ queryKey: ['certificates'], queryFn: () => get('/me/certificates') });
  const rows = q.data?.data || [];
  return (
    <div className="container py-6 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">My certificates</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {q.isLoading && <CardSkeletons count={3} className="h-36" />}
        {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
        {!q.isLoading && !q.isError && rows.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><Empty icon={Award} title="No certificates yet" text="Finish a course to earn your first one." action={<Button to="/my-learning">Continue learning</Button>} /></div>}
        {rows.map((c) => (
          <Link key={c._id} to={`/certificates/${c._id}`}>
            <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600"><Award className="h-5 w-5" /></span>
              <p className="line-clamp-2 font-display font-bold text-ink-900">{c.courseTitle}</p>
              <p className="mt-1 text-xs text-ink-500">Issued {dateLong(c.issuedAt)}</p>
              <p className="mt-2 font-mono text-xs text-ink-400">{c.code}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
