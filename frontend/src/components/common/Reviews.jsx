import { Avatar } from '../ui/Card.jsx';
import { LoadMore } from './LoadMore.jsx';
import { Stars } from './Rating.jsx';
import { useCursorList } from '../../hooks/useCursorList.js';
import { CardSkeletons } from '../ui/Feedback.jsx';
import { timeAgo } from '../../lib/format.js';

export function ReviewList({ courseId }) {
  const q = useCursorList('reviews', `/courses/${courseId}/reviews`, { limit: 10 });
  if (q.isLoading) return <CardSkeletons count={2} className="h-20" />;
  if (!q.items.length) return <p className="text-sm text-ink-500">No reviews yet.</p>;
  return (
    <div>
      <ul className="divide-y divide-ink-100">
        {q.items.map((r) => (
          <li key={r._id} className="flex gap-3 py-4">
            <Avatar name={r.user?.name} src={r.user?.avatar} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><b className="text-ink-900">{r.user?.name}</b><Stars value={r.rating} size={13} /><span className="text-xs text-ink-400">{timeAgo(r.createdAt)}</span></div>
              {r.comment && <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{r.comment}</p>}
              {r.reply?.body && <div className="mt-2 rounded-xl bg-ink-50 p-3 text-sm"><b className="text-ink-800">Instructor reply</b><p className="mt-0.5 whitespace-pre-line text-ink-600">{r.reply.body}</p></div>}
            </div>
          </li>
        ))}
      </ul>
      <LoadMore query={q} />
    </div>
  );
}
