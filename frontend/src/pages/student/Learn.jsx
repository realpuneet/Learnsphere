import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Award, Check, CheckCircle2, Circle, ExternalLink, FileText, HelpCircle, ListVideo, PlayCircle, Undo2 } from 'lucide-react';
import { get, post, put } from '../../lib/api.js';
import { safeHref } from '../../lib/markdown.js';
import { Button } from '../../components/ui/Button.jsx';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Input, Textarea } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { ConfirmDialog, Drawer } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Markdown } from '../../components/common/Markdown.jsx';
import { ProgressBar } from '../../components/common/CourseCard.jsx';
import { QuizRunner } from '../../components/common/QuizRunner.jsx';
import { RatingInput } from '../../components/common/Rating.jsx';
import { ThreadCard } from '../../components/common/Threads.jsx';
import { VideoPlayer } from '../../components/common/VideoPlayer.jsx';
import { LoadMore } from '../../components/common/LoadMore.jsx';
import { useCursorList } from '../../hooks/useCursorList.js';
import { clock, inr } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const TYPE_ICON = { video: PlayCircle, article: FileText, quiz: HelpCircle };

function Outline({ data, activeId, onPick }) {
  return (
    <div className="space-y-4">
      {data.curriculum.map((s, i) => {
        const done = s.lessons.filter((l) => l.completed).length;
        return (
          <section key={s.id} aria-label={s.title}>
            <h3 className="flex items-baseline justify-between gap-2 px-1 text-sm font-bold text-ink-900"><span className="truncate">{i + 1}. {s.title}</span><span className="shrink-0 text-xs font-medium text-ink-400">{done}/{s.lessons.length}</span></h3>
            <ul className="mt-1.5 space-y-0.5">
              {s.lessons.map((l) => {
                const Icon = TYPE_ICON[l.type] || PlayCircle;
                const active = String(l.id) === String(activeId);
                return (
                  <li key={l.id}>
                    <button onClick={() => onPick(l.id)} aria-current={active ? 'true' : undefined} className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition', active ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-700 hover:bg-ink-50')}>
                      {l.completed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Completed" /> : <Circle className="h-4 w-4 shrink-0 text-ink-300" />}
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                      <Icon className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                      {l.durationSec > 0 && <span className="w-10 shrink-0 text-right text-xs text-ink-400">{clock(l.durationSec)}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function QA({ courseId, lessonId }) {
  const qc = useQueryClient();
  const [scope, setScope] = useState('lesson');
  const [form, setForm] = useState({ title: '', body: '' });
  const params = { limit: 10, ...(scope === 'lesson' ? { lesson: lessonId } : scope === 'mine' ? { mine: 'true' } : {}) };
  const q = useCursorList('threads', `/learn/${courseId}/threads`, params);
  const ask = useMutation({
    mutationFn: () => post(`/learn/${courseId}/threads`, { lesson: lessonId, title: form.title.trim(), body: form.body.trim() || undefined }),
    onSuccess: () => { setForm({ title: '', body: '' }); toast.success('Question posted'); qc.invalidateQueries({ queryKey: ['threads'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="font-display font-bold text-ink-900">Ask about this lesson</h3>
        <Input aria-label="Question title" placeholder="What's your question?" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Textarea aria-label="Details" rows={3} placeholder="Add details (optional, Markdown supported)" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
        <Button size="sm" disabled={form.title.trim().length < 5} loading={ask.isPending} onClick={() => ask.mutate()}>Post question</Button>
      </Card>
      <Tabs tabs={[{ value: 'lesson', label: 'This lesson' }, { value: 'all', label: 'All lessons' }, { value: 'mine', label: 'My questions' }]} value={scope} onChange={setScope} />
      {q.isLoading && <CardSkeletons count={2} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.items.length && <Empty icon={HelpCircle} title="No questions yet" text="Be the first to ask." />}
      <div className="space-y-2">{q.items.map((t) => <ThreadCard key={t._id} thread={t} invalidate={[['threads']]} />)}</div>
      <LoadMore query={q} />
    </div>
  );
}

function ReviewBox({ courseId, enabled }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const save = useMutation({
    mutationFn: () => put(`/courses/${courseId}/review`, { rating, comment: comment.trim() || undefined }),
    onSuccess: () => { toast.success('Thanks for your review'); qc.invalidateQueries({ queryKey: ['reviews'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  if (!enabled) return <p className="text-sm text-ink-500">Complete at least one lesson to leave a review.</p>;
  return (
    <div className="space-y-3">
      <RatingInput value={rating} onChange={setRating} />
      <Textarea aria-label="Your review" rows={3} placeholder="What did you think? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button size="sm" disabled={!rating} loading={save.isPending} onClick={() => save.mutate()}>Submit review</Button>
    </div>
  );
}

function Overview({ courseId, data, lesson }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const p = data.progress;
  const refund = useMutation({
    mutationFn: () => post(`/learn/${courseId}/refund`),
    onSuccess: () => { toast.success('Refund initiated'); qc.invalidateQueries({ queryKey: ['my-learning'] }); nav('/my-learning'); },
    onError: (e) => { toast.error(errMsg(e)); setConfirm(false); },
  });
  const paid = p.source === 'paid' && p.amountPaid > 0 && !p.certificate;
  return (
    <div className="space-y-8">
      {lesson.content && lesson.type !== 'article' && <Markdown source={lesson.content} />}
      {lesson.resources?.length > 0 && (
        <section>
          <h3 className="mb-2 font-display font-bold text-ink-900">Resources</h3>
          <ul className="space-y-1.5">
            {lesson.resources.map((r, i) => { const href = safeHref(r.url); return href ? <li key={i}><a className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline" href={href} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink className="h-4 w-4" />{r.name}</a></li> : null; })}
          </ul>
        </section>
      )}
      {!data.preview && (
        <>
          <section><h3 className="mb-2 font-display font-bold text-ink-900">Rate this course</h3><ReviewBox courseId={courseId} enabled={p.completed.length > 0} /></section>
          {paid && (
            <section>
              <h3 className="mb-1 font-display font-bold text-ink-900">Not for you?</h3>
              <p className="mb-2 text-sm text-ink-600">Refunds are available shortly after purchase if you have barely started.</p>
              <Button variant="secondary" size="sm" onClick={() => setConfirm(true)}><Undo2 className="h-4 w-4" /> Request refund ({inr(p.amountPaid)})</Button>
            </section>
          )}
        </>
      )}
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => refund.mutate()} loading={refund.isPending} danger title="Refund this course?" confirmLabel="Yes, refund" message="You will lose access to the course. The amount returns to your original payment method." />
    </div>
  );
}

export default function Learn() {
  const { courseId, lessonId } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [drawer, setDrawer] = useState(false);

  const learn = useQuery({ queryKey: ['learn', courseId], queryFn: () => get(`/learn/${courseId}`), retry: false });
  const data = learn.data?.data;
  const firstId = data?.curriculum[0]?.lessons[0]?.id;
  const activeId = lessonId || data?.resumeLessonId || firstId;

  const lq = useQuery({ queryKey: ['lesson', courseId, activeId], queryFn: () => get(`/learn/${courseId}/lessons/${activeId}`), enabled: !!activeId, retry: false });
  const lesson = lq.data?.data;

  const go = useCallback((id) => { setDrawer(false); nav(`/learn/${courseId}/${id}`); }, [nav, courseId]);

  const complete = useMutation({
    mutationFn: ({ id, done }) => post(`/learn/${courseId}/lessons/${id}/complete`, { done }),
    onSuccess: (r, { done }) => {
      qc.invalidateQueries({ queryKey: ['learn', courseId] });
      qc.invalidateQueries({ queryKey: ['lesson', courseId] });
      qc.invalidateQueries({ queryKey: ['my-learning'] });
      if (done && r.data.certificateId) toast.success('Course complete – certificate issued!');
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  // throttle position saves – the player already limits to every 10s, this guards against duplicates
  const lastSaved = useRef(0);
  const savePos = useCallback((sec) => {
    if (!data || data.preview || !activeId) return;
    if (Math.abs(sec - lastSaved.current) < 5) return;
    lastSaved.current = sec;
    put(`/learn/${courseId}/position`, { lessonId: activeId, sec }).catch(() => {});
  }, [data, courseId, activeId]);

  useEffect(() => { lastSaved.current = 0; setTab('overview'); }, [activeId]);

  if (learn.isLoading) return <div className="container py-8"><CardSkeletons count={2} className="h-56" /></div>;
  if (learn.isError) {
    if (learn.error.apiCode === 'NOT_ENROLLED') return <Navigate to="/my-learning" replace />;
    return <div className="container py-8"><ErrorState error={learn.error} onRetry={learn.refetch} /></div>;
  }
  const cert = data.progress.certificate;
  const isDone = lesson?.completed;

  return (
    <div className="container py-4 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/my-learning" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> My learning</Link>
          <h1 className="truncate font-display text-xl font-extrabold text-ink-900 sm:text-2xl">{data.course.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {data.preview ? <Badge tone="amber">Preview mode</Badge> : <div className="hidden w-40 sm:block"><p className="mb-1 text-right text-xs font-semibold text-ink-600">{data.progress.percent}% complete</p><ProgressBar value={data.progress.percent} /></div>}
          {cert && <Button size="sm" to={`/certificates/${cert._id || cert}`} variant="soft"><Award className="h-4 w-4" /> Certificate</Button>}
          <Button size="sm" variant="secondary" className="lg:hidden" onClick={() => setDrawer(true)}><ListVideo className="h-4 w-4" /> Content</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {lq.isLoading && <CardSkeletons count={1} className="h-72" />}
          {lq.isError && <ErrorState error={lq.error} onRetry={lq.refetch} />}
          {lesson && (
            <div className="space-y-5">
              {lesson.type === 'video' && (
                <VideoPlayer key={lesson.id} url={lesson.videoUrl} provider={lesson.videoProvider} title={lesson.title} startAt={lesson.resumeSec} onProgress={savePos}
                  onEnded={() => { if (!data.preview && !isDone) complete.mutate({ id: lesson.id, done: true }); }} />
              )}
              {lesson.type === 'article' && <Card className="p-5 sm:p-8"><Markdown source={lesson.content || ''} /></Card>}
              {lesson.type === 'quiz' && <QuizRunner key={lesson.id} courseId={courseId} lessonId={lesson.id} onPassed={() => qc.invalidateQueries({ queryKey: ['lesson', courseId] })} />}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-ink-900">{lesson.title}</h2>
                <div className="flex flex-wrap gap-2">
                  {!data.preview && lesson.type !== 'quiz' && (
                    <Button size="sm" variant={isDone ? 'secondary' : 'primary'} loading={complete.isPending} onClick={() => complete.mutate({ id: lesson.id, done: !isDone })}>
                      {isDone ? <><Check className="h-4 w-4" /> Completed</> : 'Mark complete'}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" disabled={!lesson.prevId} onClick={() => go(lesson.prevId)} aria-label="Previous lesson"><ArrowLeft className="h-4 w-4" /></Button>
                  <Button size="sm" variant="secondary" disabled={!lesson.nextId} onClick={() => go(lesson.nextId)} aria-label="Next lesson"><ArrowRight className="h-4 w-4" /></Button>
                </div>
              </div>

              <Tabs tabs={[{ value: 'overview', label: 'Overview' }, ...(data.preview ? [] : [{ value: 'qa', label: 'Q&A' }])]} value={tab} onChange={setTab} />
              {tab === 'overview' ? <Overview courseId={courseId} data={data} lesson={lesson} /> : <QA courseId={courseId} lessonId={lesson.id} />}
            </div>
          )}
          {!activeId && <Empty title="No lessons yet" text="This course has no lessons." />}
        </div>

        <aside className="hidden lg:block" aria-label="Course content">
          <Card className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-3"><Outline data={data} activeId={activeId} onPick={go} /></Card>
        </aside>
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} side="right">
        <div className="p-4"><h2 className="mb-3 font-display text-lg font-bold">Course content</h2><Outline data={data} activeId={activeId} onPick={go} /></div>
      </Drawer>
    </div>
  );
}
