import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, FileText, HelpCircle, ListChecks, Pencil, Plus, PlayCircle, Trash2 } from 'lucide-react';
import { del, patch, post, put } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Input, Select, Switch, Textarea } from '../../components/ui/Form.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay.jsx';
import { errMsg, toast } from '../../components/ui/Feedback.jsx';
import { QuizEditor } from './QuizEditor.jsx';
import { clock } from '../../lib/format.js';

const ICON = { video: PlayCircle, article: FileText, quiz: HelpCircle };
const blank = { title: '', type: 'video', videoUrl: '', durationSec: 0, content: '', resources: [], isPreview: false };
const move = (arr, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

function LessonModal({ courseId, sections, initial, sectionId, onClose }) {
  const qc = useQueryClient();
  const editing = Boolean(initial?.id);
  const [f, setF] = useState(() => ({ ...blank, ...initial, videoUrl: initial?.videoUrl || '', resources: initial?.resources || [], section: initial?.section || sectionId }));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = useMutation({
    mutationFn: () => {
      const body = { title: f.title.trim(), type: f.type, videoUrl: f.type === 'video' ? f.videoUrl.trim() : '', durationSec: Math.max(0, Math.round(Number(f.durationSec) || 0)), content: f.type === 'article' ? f.content : '', isPreview: f.isPreview, resources: f.resources.filter((r) => r.name.trim() && r.url.trim()).map((r) => ({ name: r.name.trim(), url: r.url.trim() })) };
      return editing ? patch(`/instructor/lessons/${initial.id}`, { ...body, ...(f.section !== initial.section ? { section: f.section } : {}) }) : post(`/instructor/courses/${courseId}/sections/${sectionId}/lessons`, body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['instructor-course', courseId] }); toast.success(editing ? 'Lesson updated' : 'Lesson added'); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal open onClose={onClose} size="lg" title={editing ? 'Edit lesson' : 'Add lesson'} footer={<Button className="w-full" disabled={!f.title.trim()} loading={save.isPending} onClick={() => save.mutate()}>{editing ? 'Save lesson' : 'Add lesson'}</Button>}>
      <div className="space-y-4">
        <Input label="Title" required value={f.title} onChange={set('title')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Type" value={f.type} onChange={set('type')}><option value="video">Video</option><option value="article">Article</option><option value="quiz">Quiz</option></Select>
          {editing && <Select label="Section" value={f.section} onChange={set('section')}>{sections.map((s) => <option key={s._id} value={s._id}>{s.title}</option>)}</Select>}
        </div>
        {f.type === 'video' && (
          <>
            <Input label="Video link" placeholder="https://youtu.be/… or a .mp4 / .m3u8 link" hint="YouTube, Vimeo or a direct file/stream link" value={f.videoUrl} onChange={set('videoUrl')} />
            <Input label="Duration (seconds)" type="number" min={0} hint={f.durationSec ? `= ${clock(Number(f.durationSec))}` : undefined} value={f.durationSec} onChange={set('durationSec')} />
          </>
        )}
        {f.type === 'article' && <Textarea label="Content (Markdown)" rows={10} value={f.content} onChange={set('content')} hint="Supports headings, lists, code blocks, quotes, bold, italic and links" />}
        {f.type === 'quiz' && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">Save the lesson, then use “Edit quiz” to add questions.</p>}
        <Switch checked={f.isPreview} onChange={(v) => setF((s) => ({ ...s, isPreview: v }))} label="Free preview" description="Anyone can watch this lesson before enrolling" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink-700">Resources</p>
          {f.resources.map((r, i) => (
            <div key={i} className="flex gap-2">
              <Input aria-label="Resource name" placeholder="Name" wrapperClass="w-2/5" value={r.name} onChange={(e) => setF((s) => ({ ...s, resources: s.resources.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))} />
              <Input aria-label="Resource link" placeholder="https://" wrapperClass="flex-1" value={r.url} onChange={(e) => setF((s) => ({ ...s, resources: s.resources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) }))} />
              <Button variant="ghost" size="sm" aria-label="Remove resource" onClick={() => setF((s) => ({ ...s, resources: s.resources.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {f.resources.length < 15 && <Button variant="ghost" size="sm" onClick={() => setF((s) => ({ ...s, resources: [...s.resources, { name: '', url: '' }] }))}><Plus className="h-4 w-4" /> Add resource</Button>}
        </div>
      </div>
    </Modal>
  );
}

export function CurriculumEditor({ course, lessons, locked }) {
  const qc = useQueryClient();
  const courseId = course._id;
  const refresh = () => qc.invalidateQueries({ queryKey: ['instructor-course', courseId] });
  const onError = (e) => toast.error(errMsg(e));
  const [newSection, setNewSection] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [lessonForm, setLessonForm] = useState(null); // { sectionId, initial }
  const [quizFor, setQuizFor] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind, id, label }

  const sections = [...(course.sections || [])].sort((a, b) => a.order - b.order);
  const inSection = (sid) => lessons.filter((l) => String(l.section) === String(sid)).sort((a, b) => a.order - b.order);

  const addSection = useMutation({ mutationFn: () => post(`/instructor/courses/${courseId}/sections`, { title: newSection.trim() }), onSuccess: () => { setNewSection(''); refresh(); }, onError });
  const renameSection = useMutation({ mutationFn: ({ id, title }) => patch(`/instructor/courses/${courseId}/sections/${id}`, { title }), onSuccess: () => { setRenaming(null); refresh(); }, onError });
  const orderSections = useMutation({ mutationFn: (ids) => put(`/instructor/courses/${courseId}/sections/order`, { ids }), onSuccess: refresh, onError });
  const orderLessons = useMutation({ mutationFn: ({ sid, ids }) => put(`/instructor/courses/${courseId}/sections/${sid}/lessons/order`, { ids }), onSuccess: refresh, onError });
  const remove = useMutation({
    mutationFn: ({ kind, id }) => (kind === 'section' ? del(`/instructor/courses/${courseId}/sections/${id}`) : del(`/instructor/lessons/${id}`)),
    onSuccess: () => { setConfirm(null); refresh(); },
    onError: (e) => { setConfirm(null); onError(e); },
  });

  return (
    <div className="space-y-4">
      {locked && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This course is in review. Changes you make here go live as soon as it is published.</p>}
      {sections.map((s, si) => {
        const ls = inSection(s._id);
        return (
          <Card key={s._id} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-2.5">
              {renaming?.id === s._id ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (renaming.title.trim()) renameSection.mutate(renaming); }}>
                  <Input aria-label="Section title" autoFocus wrapperClass="flex-1" value={renaming.title} onChange={(e) => setRenaming({ ...renaming, title: e.target.value })} />
                  <Button type="submit" size="sm" loading={renameSection.isPending}>Save</Button><Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <p className="min-w-0 flex-1 truncate font-display font-bold text-ink-900">Section {si + 1}: {s.title}</p>
                  <Button variant="ghost" size="sm" aria-label="Move section up" disabled={si === 0} onClick={() => orderSections.mutate(move(sections, si, -1).map((x) => x._id))}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" aria-label="Move section down" disabled={si === sections.length - 1} onClick={() => orderSections.mutate(move(sections, si, 1).map((x) => x._id))}><ArrowDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" aria-label="Rename section" onClick={() => setRenaming({ id: s._id, title: s.title })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" aria-label="Delete section" onClick={() => setConfirm({ kind: 'section', id: s._id, label: `section “${s.title}” and its ${ls.length} lesson(s)` })}><Trash2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
            <ul className="divide-y divide-ink-50">
              {ls.map((l, li) => {
                const Icon = ICON[l.type] || PlayCircle;
                return (
                  <li key={l._id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-ink-400" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{l.title}</span>
                    {l.isPreview && <Badge tone="brand"><Eye className="h-3 w-3" /> Preview</Badge>}
                    {l.type === 'quiz' && (l.hasQuiz ? <Badge tone="green">Quiz ready</Badge> : <Badge tone="amber">No questions</Badge>)}
                    {l.durationSec > 0 && <span className="text-xs text-ink-400">{clock(l.durationSec)}</span>}
                    {l.type === 'quiz' && l._id && <Button variant="soft" size="sm" onClick={() => setQuizFor({ id: l._id, title: l.title })}><ListChecks className="h-4 w-4" /> Edit quiz</Button>}
                    <Button variant="ghost" size="sm" aria-label="Move lesson up" disabled={li === 0} onClick={() => orderLessons.mutate({ sid: s._id, ids: move(ls, li, -1).map((x) => x._id) })}><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label="Move lesson down" disabled={li === ls.length - 1} onClick={() => orderLessons.mutate({ sid: s._id, ids: move(ls, li, 1).map((x) => x._id) })}><ArrowDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label="Edit lesson" onClick={() => setLessonForm({ sectionId: s._id, initial: { ...l, id: l._id } })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label="Delete lesson" onClick={() => setConfirm({ kind: 'lesson', id: l._id, label: `lesson “${l.title}”` })}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                );
              })}
            </ul>
            <div className="px-4 py-2.5"><Button variant="ghost" size="sm" onClick={() => setLessonForm({ sectionId: s._id })}><Plus className="h-4 w-4" /> Add lesson</Button></div>
          </Card>
        );
      })}

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newSection.trim()) addSection.mutate(); }}>
        <Input aria-label="New section title" placeholder="New section title" wrapperClass="flex-1" value={newSection} onChange={(e) => setNewSection(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={!newSection.trim()} loading={addSection.isPending}><Plus className="h-4 w-4" /> Add section</Button>
      </form>

      {lessonForm && <LessonModal key={lessonForm.initial?.id || `new-${lessonForm.sectionId}`} courseId={courseId} sections={sections} sectionId={lessonForm.sectionId} initial={lessonForm.initial} onClose={() => setLessonForm(null)} />}
      {quizFor && <QuizEditor lesson={quizFor} onClose={() => setQuizFor(null)} />}
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} danger loading={remove.isPending} title="Delete this?" message={confirm ? `This permanently deletes ${confirm.label}.` : ''} confirmLabel="Delete" onConfirm={() => remove.mutate(confirm)} />
    </div>
  );
}
