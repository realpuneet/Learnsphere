import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, Send, Archive, Trash2, Users } from 'lucide-react';
import { del, get, patch, post } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card, SectionTitle, StatusBadge } from '../../components/ui/Card.jsx';
import { Input, Select, Switch, TagInput, Textarea } from '../../components/ui/Form.jsx';
import { ImageUpload } from '../../components/ui/ImageUpload.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { ConfirmDialog } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { CurriculumEditor } from './CurriculumEditor.jsx';
import { LEVEL_LABEL, inr } from '../../lib/format.js';
import { useAuth } from '../../lib/authStore.js';

function Details({ course, onSaved }) {
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => get('/categories'), staleTime: 300_000 });
  const [f, setF] = useState(() => ({
    title: course.title || '', subtitle: course.subtitle || '', description: course.description || '', category: course.category?._id || course.category || '',
    level: course.level || 'beginner', language: course.language || 'English', tags: course.tags || [], thumbnail: course.thumbnail || null, previewVideo: course.previewVideo || '',
    outcomes: course.outcomes || [], requirements: course.requirements || [], price: course.price ?? 0, mrp: course.mrp ?? 0, certificate: course.certificate ?? true,
  }));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: () => patch(`/instructor/courses/${course._id}`, {
      ...f, title: f.title.trim(), subtitle: f.subtitle.trim(), description: f.description.trim(), category: f.category || undefined, language: f.language.trim() || 'English',
      previewVideo: f.previewVideo.trim() || null, price: Number(f.price) || 0, mrp: Number(f.mrp) || 0,
    }),
    onSuccess: () => { toast.success('Saved'); onSaved(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <SectionTitle title="Basics" />
        <Input label="Title" required maxLength={120} value={f.title} onChange={set('title')} />
        <Input label="Subtitle" maxLength={200} value={f.subtitle} onChange={set('subtitle')} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Category" value={f.category} onChange={set('category')}><option value="">Choose…</option>{(cats.data?.data || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</Select>
          <Select label="Level" value={f.level} onChange={set('level')}>{Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Input label="Language" value={f.language} onChange={set('language')} />
        </div>
        <ImageUpload label="Thumbnail" value={f.thumbnail} onChange={(v) => setF((s) => ({ ...s, thumbnail: v }))} />
        <Input label="Promo video link" placeholder="https://" value={f.previewVideo} onChange={set('previewVideo')} />
        <Textarea label="Description (Markdown)" rows={8} hint="At least 50 characters to submit for review" value={f.description} onChange={set('description')} />
      </Card>
      <Card className="space-y-4 p-5">
        <SectionTitle title="Learning outcomes & requirements" />
        <TagInput label="What will students learn?" placeholder="Type an outcome and press Enter" value={f.outcomes} onChange={(v) => setF((s) => ({ ...s, outcomes: v }))} />
        <TagInput label="Requirements" placeholder="Type a prerequisite and press Enter" value={f.requirements} onChange={(v) => setF((s) => ({ ...s, requirements: v }))} />
        <TagInput label="Search tags" max={10} value={f.tags} onChange={(v) => setF((s) => ({ ...s, tags: v.map((t) => t.slice(0, 30)) }))} />
      </Card>
      <Card className="space-y-4 p-5">
        <SectionTitle title="Pricing" subtitle="Prices are GST-inclusive. Set 0 for a free course." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Price (₹)" type="number" min={0} max={100000} value={f.price} onChange={set('price')} />
          <Input label="List price / MRP (₹)" type="number" min={0} max={100000} hint="Shown struck-through" value={f.mrp} onChange={set('mrp')} />
        </div>
        <Switch checked={f.certificate} onChange={(v) => setF((s) => ({ ...s, certificate: v }))} label="Issue certificate on completion" />
      </Card>
      <div className="sticky bottom-20 z-10 md:bottom-4"><Button size="lg" className="w-full shadow-pop sm:w-auto" disabled={f.title.trim().length < 5} loading={save.isPending} onClick={() => save.mutate()}>Save changes</Button></div>
    </div>
  );
}

function Publish({ course, readiness, onChanged }) {
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const [confirm, setConfirm] = useState(null);
  const act = useMutation({
    mutationFn: (kind) => (kind === 'delete' ? del(`/instructor/courses/${course._id}`) : post(`/instructor/courses/${course._id}/${kind}`)),
    onSuccess: (_r, kind) => {
      setConfirm(null);
      if (kind === 'delete') { toast.success('Course deleted'); nav('/instructor/courses'); return; }
      toast.success(kind === 'submit' ? 'Submitted' : 'Archived');
      onChanged();
    },
    onError: (e) => { setConfirm(null); toast.error(errMsg(e)); },
  });
  const pending = user.role === 'instructor' && !user.instructor?.approved;
  const editable = ['draft', 'rejected'].includes(course.status);
  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><SectionTitle title="Status" /><StatusBadge status={course.status} /></div>
        {course.status === 'rejected' && course.rejectionReason && <p className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><b>Changes requested:</b> {course.rejectionReason}</span></p>}
        {course.status === 'in_review' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Our team is reviewing your course. You will be notified once it is approved.</p>}
        {course.status === 'published' && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Your course is live. <Link className="font-semibold underline" to={`/courses/${course.slug}`}>View public page</Link></p>}
      </Card>
      <Card className="space-y-3 p-5">
        <SectionTitle title="Checklist" subtitle={readiness.length ? `${readiness.length} thing${readiness.length === 1 ? '' : 's'} left before you can submit` : 'Everything is in place'} />
        {readiness.length === 0 ? <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Ready to submit</p> : (
          <ul className="space-y-1.5">{readiness.map((m) => <li key={m} className="flex gap-2 text-sm text-ink-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{m}</li>)}</ul>
        )}
        {pending && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Your instructor account must be approved before you can submit courses.</p>}
        {(editable || course.status === 'archived') && (
          <Button disabled={readiness.length > 0 || pending} loading={act.isPending && act.variables === 'submit'} onClick={() => act.mutate('submit')}><Send className="h-4 w-4" /> {course.status === 'archived' ? 'Resubmit for review' : 'Submit for review'}</Button>
        )}
      </Card>
      <Card className="space-y-3 p-5">
        <SectionTitle title="Danger zone" />
        <div className="flex flex-wrap gap-2">
          {course.status === 'published' && <Button variant="secondary" onClick={() => setConfirm('archive')}><Archive className="h-4 w-4" /> Archive course</Button>}
          {editable && <Button variant="danger" onClick={() => setConfirm('delete')}><Trash2 className="h-4 w-4" /> Delete course</Button>}
        </div>
        <p className="text-xs text-ink-500">Archiving hides the course from the catalogue; students keep access. Courses with enrolments cannot be deleted.</p>
      </Card>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} danger loading={act.isPending} title={confirm === 'delete' ? 'Delete this course?' : 'Archive this course?'} message={confirm === 'delete' ? 'This permanently deletes the draft and all of its lessons.' : 'It disappears from the catalogue. Enrolled students keep access.'} confirmLabel={confirm === 'delete' ? 'Delete' : 'Archive'} onConfirm={() => act.mutate(confirm)} />
    </div>
  );
}

export default function CourseEditor() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState('details');
  const q = useQuery({ queryKey: ['instructor-course', id], queryFn: () => get(`/instructor/courses/${id}`) });
  if (q.isLoading) return <CardSkeletons count={3} className="h-40" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const { course, lessons, readiness } = q.data.data;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['instructor-course', id] }); qc.invalidateQueries({ queryKey: ['instructor-courses'] }); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/instructor/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> My courses</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold text-ink-900"><span className="truncate">{course.title}</span><StatusBadge status={course.status} /></h1>
          <p className="text-sm text-ink-500">{course.stats?.lessons || 0} lessons · {course.price ? inr(course.price) : 'Free'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" to={`/instructor/courses/${id}/students`}><Users className="h-4 w-4" /> Students</Button>
          <Button variant="secondary" size="sm" to={`/courses/${course.slug}`}><Eye className="h-4 w-4" /> Preview</Button>
        </div>
      </div>
      <Tabs tabs={[{ value: 'details', label: 'Details & pricing' }, { value: 'curriculum', label: `Curriculum (${lessons.length})` }, { value: 'publish', label: `Publish${readiness.length ? ` · ${readiness.length}` : ''}` }]} value={tab} onChange={setTab} />
      {tab === 'details' && <Details key={course.updatedAt} course={course} onSaved={refresh} />}
      {tab === 'curriculum' && <CurriculumEditor course={course} lessons={lessons} locked={course.status === 'in_review'} />}
      {tab === 'publish' && <Publish course={course} readiness={readiness} onChanged={refresh} />}
    </div>
  );
}
