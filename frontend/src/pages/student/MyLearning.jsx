import { Link } from 'react-router-dom';
import { Award, BookOpen, PlayCircle } from 'lucide-react';
import { useCursorList } from '../../hooks/useCursorList.js';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';
import { ProgressBar, Thumb } from '../../components/common/CourseCard.jsx';
import { timeAgo } from '../../lib/format.js';

export default function MyLearning() {
  const q = useCursorList('my-learning', '/me/learning', { limit: 12 });
  return (
    <div className="container py-6 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">My learning</h1>
      <div className="mt-5">
        {q.isLoading && <CardSkeletons count={3} className="h-28" />}
        {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
        {!q.isLoading && !q.isError && q.items.length === 0 && <Empty icon={BookOpen} title="You haven't enrolled yet" text="Pick a course and start learning today." action={<Button to="/courses">Browse courses</Button>} />}
        <div className="grid gap-4 md:grid-cols-2">
          {q.items.filter((e) => e.course).map((e) => (
            <Card key={e._id} className="flex gap-4 overflow-hidden p-3">
              <Link to={`/learn/${e.course._id}`} className="aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-ink-100 sm:w-44"><Thumb course={e.course} width={360} /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to={`/learn/${e.course._id}`} className="line-clamp-2 font-display font-bold leading-snug text-ink-900 hover:text-brand-700">{e.course.title}</Link>
                <p className="truncate text-xs text-ink-500">{e.course.instructor?.name}</p>
                <div className="mt-auto space-y-2 pt-2">
                  <ProgressBar value={e.percent} />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
                    <span>{e.status === 'completed' ? <Badge tone="green">Completed</Badge> : `${e.percent}% · ${timeAgo(e.lastActivityAt)}`}</span>
                    <span className="flex gap-1.5">
                      {e.certificate && <Button size="sm" variant="soft" to={`/certificates/${e.certificate}`}><Award className="h-3.5 w-3.5" /></Button>}
                      <Button size="sm" to={`/learn/${e.course._id}`}><PlayCircle className="h-3.5 w-3.5" /> {e.percent > 0 ? 'Resume' : 'Start'}</Button>
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <LoadMore query={q} />
      </div>
    </div>
  );
}
