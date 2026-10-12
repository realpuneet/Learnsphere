import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Check, ChevronDown, Clock, FileText, Globe, HelpCircle, Lock, PlayCircle, Tag, Users } from 'lucide-react';
import { get, idemKey, post } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { runPayment } from '../../lib/payFlow.js';
import { Button } from '../../components/ui/Button.jsx';
import { Avatar, Badge, Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Markdown } from '../../components/common/Markdown.jsx';
import { Price, ProgressBar, Thumb, CourseGrid } from '../../components/common/CourseCard.jsx';
import { RatingSummary, Stars } from '../../components/common/Rating.jsx';
import { ReviewList } from '../../components/common/Reviews.jsx';
import { VideoPlayer } from '../../components/common/VideoPlayer.jsx';
import { clock, compact, dateLong, duration, inr, LEVEL_LABEL, STATUS_META } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const TYPE_ICON = { video: PlayCircle, article: FileText, quiz: HelpCircle };

function Curriculum({ sections, onPreview }) {
  const [open, setOpen] = useState(() => new Set(sections.slice(0, 1).map((s) => s.id)));
  const toggle = (id) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
      {sections.map((s) => {
        const isOpen = open.has(s.id);
        const total = s.lessons.reduce((a, l) => a + (l.durationSec || 0), 0);
        return (
          <div key={s.id}>
            <button className="flex w-full items-center justify-between gap-3 bg-ink-50 px-4 py-3 text-left" aria-expanded={isOpen} onClick={() => toggle(s.id)}>
              <span className="font-semibold text-ink-900">{s.title}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-ink-500">{s.lessons.length} lessons · {duration(total)}<ChevronDown className={cn('h-4 w-4 transition', isOpen && 'rotate-180')} /></span>
            </button>
            {isOpen && (
              <ul className="divide-y divide-ink-50">
                {s.lessons.map((l) => {
                  const Icon = TYPE_ICON[l.type] || PlayCircle;
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <Icon className="h-4 w-4 shrink-0 text-ink-400" />
                      <span className="min-w-0 flex-1 truncate text-ink-700">{l.title}</span>
                      {l.isPreview && l.videoUrl
                        ? <button className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => onPreview(l)}>Preview</button>
                        : l.isPreview ? <Badge tone="brand">Free</Badge> : <Lock className="h-3.5 w-3.5 text-ink-300" aria-label="Locked" />}
                      {l.durationSec > 0 && <span className="w-12 shrink-0 text-right text-xs text-ink-400">{clock(l.durationSec)}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BuyBox({ course }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState('');
  const own = user && String(course.instructor?._id) === String(user.id || user._id);

  const quote = useQuery({
    queryKey: ['quote', course._id, applied],
    queryFn: () => post(`/courses/${course._id}/quote`, { coupon: applied || undefined }),
    enabled: course.price > 0 && course.status !== 'draft',
    retry: false,
  });
  const totals = quote.data?.data;

  const buy = useMutation({
    mutationFn: async () => {
      if (!user) { nav('/login', { state: { from: `/courses/${course.slug}` } }); return null; }
      const { data } = await post(`/courses/${course._id}/checkout`, { coupon: applied || undefined }, { headers: { 'Idempotency-Key': idemKey() } });
      if (data.enrolled) return true;
      return runPayment(data.payment, { description: course.title, prefill: { name: user.name, email: user.email } });
    },
    onSuccess: (ok) => {
      if (!ok) return;
      toast.success('You are enrolled!');
      qc.invalidateQueries({ queryKey: ['course', course.slug] });
      qc.invalidateQueries({ queryKey: ['my-learning'] });
      nav(`/learn/${course._id}`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const enrolled = course.enrollment;
  const published = course.status === undefined || course.status === 'published';

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-ink-100"><Thumb course={course} width={720} /></div>
      <div className="space-y-4 p-5">
        {enrolled ? (
          <>
            <div><p className="mb-1 text-sm font-semibold text-ink-700">{enrolled.status === 'completed' ? 'Completed 🎉' : `${enrolled.percent}% complete`}</p><ProgressBar value={enrolled.percent} /></div>
            <Button className="w-full" size="lg" to={`/learn/${course._id}`}>{enrolled.percent > 0 ? 'Continue learning' : 'Start learning'}</Button>
          </>
        ) : own ? (
          <Button className="w-full" to={`/instructor/courses/${course._id}`} variant="secondary">Edit your course</Button>
        ) : !published ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This course is not published yet.</p>
        ) : (
          <>
            <Price price={totals?.total ?? course.price} mrp={course.mrp} size="lg" />
            {course.price > 0 && totals && (
              <dl className="space-y-1 rounded-xl bg-ink-50 p-3 text-sm">
                <div className="flex justify-between"><dt className="text-ink-500">Course price</dt><dd>{inr(totals.price)}</dd></div>
                {totals.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon {totals.coupon?.code}</dt><dd>− {inr(totals.discount)}</dd></div>}
                <div className="flex justify-between text-xs text-ink-500"><dt>Includes GST</dt><dd>{inr(totals.gst)}</dd></div>
                <div className="flex justify-between border-t border-ink-200 pt-1 font-bold text-ink-900"><dt>Total</dt><dd>{inr(totals.total)}</dd></div>
              </dl>
            )}
            <Button className="w-full" size="lg" loading={buy.isPending} onClick={() => buy.mutate()}>{course.price > 0 ? (totals?.total === 0 ? 'Enrol for free' : 'Buy now') : 'Enrol for free'}</Button>
            {course.price > 0 && (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(code.trim().toUpperCase()); }}>
                <Input aria-label="Coupon code" placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} wrapperClass="flex-1" />
                <Button type="submit" variant="secondary" disabled={!code.trim()}><Tag className="h-4 w-4" /></Button>
              </form>
            )}
            {quote.isError && applied && <p role="alert" className="text-sm text-red-600">{errMsg(quote.error)}</p>}
          </>
        )}
        <ul className="space-y-2 text-sm text-ink-600">
          <li className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-ink-400" />{course.stats?.lessons || 0} lessons · {duration(course.stats?.durationSec)}</li>
          <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-ink-400" />Learn at your own pace, lifetime access</li>
          {course.certificate && <li className="flex items-center gap-2"><Award className="h-4 w-4 text-ink-400" />Certificate of completion</li>}
        </ul>
      </div>
    </Card>
  );
}

export default function CourseDetail() {
  const { slug } = useParams();
  const [preview, setPreview] = useState(null);
  const q = useQuery({ queryKey: ['course', slug], queryFn: () => get(`/courses/${slug}`) });
  const rel = useQuery({ queryKey: ['related', slug], queryFn: () => get(`/courses/${slug}/related`), enabled: !!q.data });

  if (q.isLoading) return <div className="container py-8"><CardSkeletons count={2} className="h-48" /></div>;
  if (q.isError) return <div className="container py-8"><ErrorState error={q.error} onRetry={q.refetch} /></div>;
  const c = q.data.data;
  const st = c.status && c.status !== 'published' ? STATUS_META[c.status] : null;
  const maxBucket = Math.max(1, ...Object.values(c.ratingBuckets || {}));

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="container grid gap-8 py-8 sm:py-12 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0">
            {st && <Badge tone={st.tone} className="mb-3">{st.label}</Badge>}
            {c.status === 'rejected' && c.rejectionReason && <p className="mb-3 rounded-xl bg-red-500/15 p-3 text-sm text-red-100">Changes requested: {c.rejectionReason}</p>}
            <p className="text-sm font-semibold text-brand-200">{c.category?.name}</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{c.title}</h1>
            {c.subtitle && <p className="mt-3 text-lg text-ink-200">{c.subtitle}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-200">
              <RatingSummary avg={c.stats?.ratingAvg} count={c.stats?.ratingCount} className="[&_b]:text-amber-300 [&_span]:text-ink-300" />
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{compact(c.stats?.enrolled)} learners</span>
              <span className="inline-flex items-center gap-1"><Globe className="h-4 w-4" />{c.language}</span>
              <span>{LEVEL_LABEL[c.level]}</span>
            </div>
            <Link to={`/instructors/${c.instructor?._id}`} className="mt-4 inline-flex items-center gap-2 text-sm text-ink-100 hover:underline"><Avatar name={c.instructor?.name} src={c.instructor?.avatar} size={28} /> By {c.instructor?.name}</Link>
            {c.publishedAt && <p className="mt-2 text-xs text-ink-300">Published {dateLong(c.publishedAt)}</p>}
          </div>
          <div className="lg:row-span-2 lg:-mb-40"><BuyBox course={c} /></div>
        </div>
      </section>

      <div className="container grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          {c.outcomes?.length > 0 && (
            <section>
              <SectionTitle title="What you'll learn" />
              <ul className="mt-4 grid gap-2 rounded-2xl border border-ink-100 bg-white p-5 sm:grid-cols-2">
                {c.outcomes.map((o, i) => <li key={i} className="flex gap-2 text-sm text-ink-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{o}</li>)}
              </ul>
            </section>
          )}
          <section>
            <SectionTitle title="Course content" subtitle={`${c.curriculum.length} sections · ${c.stats?.lessons || 0} lessons · ${duration(c.stats?.durationSec)}`} />
            <div className="mt-4">{c.curriculum.length ? <Curriculum sections={c.curriculum} onPreview={setPreview} /> : <p className="text-sm text-ink-500">Content is being prepared.</p>}</div>
          </section>
          {c.requirements?.length > 0 && (
            <section><SectionTitle title="Requirements" /><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">{c.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul></section>
          )}
          {c.description && <section><SectionTitle title="About this course" /><Markdown source={c.description} className="mt-3" /></section>}
          <section>
            <SectionTitle title="Your instructor" />
            <Card className="mt-4 flex gap-4 p-5">
              <Avatar name={c.instructor?.name} src={c.instructor?.avatar} size={64} />
              <div className="min-w-0">
                <Link to={`/instructors/${c.instructor?._id}`} className="font-display text-lg font-bold text-brand-700 hover:underline">{c.instructor?.name}</Link>
                {c.instructor?.headline && <p className="text-sm text-ink-500">{c.instructor.headline}</p>}
                <p className="mt-1 text-xs text-ink-500">{c.instructorStats?.courses} courses · {compact(c.instructorStats?.students)} students</p>
                {c.instructor?.bio && <Markdown source={c.instructor.bio} className="mt-2 text-sm" />}
              </div>
            </Card>
          </section>
          <section>
            <SectionTitle title="Learner reviews" />
            {c.stats?.ratingCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <div className="text-center"><div className="font-display text-5xl font-extrabold text-ink-900">{c.stats.ratingAvg.toFixed(1)}</div><Stars value={c.stats.ratingAvg} size={16} /><p className="mt-1 text-xs text-ink-500">{c.stats.ratingCount} ratings</p></div>
                <div className="min-w-[200px] flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((r) => (
                    <div key={r} className="flex items-center gap-2 text-xs text-ink-500"><span className="w-3">{r}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${((c.ratingBuckets?.[r] || 0) / maxBucket) * 100}%` }} /></div>
                      <span className="w-8 text-right">{c.ratingBuckets?.[r] || 0}</span></div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4"><ReviewList courseId={c._id} /></div>
          </section>
          {rel.data?.data?.length > 0 && <section><SectionTitle title="Related courses" /><CourseGrid className="mt-4 xl:grid-cols-2" courses={rel.data.data} /></section>}
        </div>
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title} size="lg">
        {preview && <VideoPlayer url={preview.videoUrl} provider={preview.videoProvider} title={preview.title} />}
      </Modal>
    </>
  );
}
