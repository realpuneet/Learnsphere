import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useCursorList } from '../../hooks/useCursorList.js';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';
import { ThreadCard } from '../../components/common/Threads.jsx';
import { useSocketEvent } from '../../hooks/useSocketEvent.js';

export default function InstructorQA() {
  const [scope, setScope] = useState('unanswered');
  const q = useCursorList('inbox', '/inbox/threads', { limit: 15, ...(scope === 'unanswered' ? { unanswered: 'true' } : {}) });
  useSocketEvent('thread:new', () => q.refetch());
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Student Q&A</h1>
      <Tabs tabs={[{ value: 'unanswered', label: 'Unanswered' }, { value: 'all', label: 'All questions' }]} value={scope} onChange={setScope} />
      {q.isLoading && <CardSkeletons count={3} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && q.items.length === 0 && <Empty icon={MessageSquare} title={scope === 'unanswered' ? 'Inbox zero' : 'No questions yet'} text="Student questions on your courses appear here." />}
      <div className="space-y-2">{q.items.map((t) => <ThreadCard key={t._id} thread={t} showCourse invalidate={[['inbox']]} />)}</div>
      <LoadMore query={q} />
    </div>
  );
}
