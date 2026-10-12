import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { get, put } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Input, Select, Switch, Textarea } from '../../components/ui/Form.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { Spinner, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { validateQuestions } from '../../lib/quiz.js';

const blankQ = () => ({ text: '', type: 'single', explanation: '', points: 1, options: [{ text: '', correct: true }, { text: '', correct: false }] });
const strip = (q) => ({ text: q.text, type: q.type, explanation: q.explanation || '', points: q.points || 1, options: q.options.map((o) => ({ text: o.text, correct: !!o.correct })) });

export function QuizEditor({ lesson, onClose }) {
  const qc = useQueryClient();
  const load = useQuery({ queryKey: ['quiz-edit', lesson.id], queryFn: () => get(`/instructor/lessons/${lesson.id}/quiz`), gcTime: 0 });
  const [quiz, setQuiz] = useState(null);
  useEffect(() => {
    if (!load.data) return;
    const d = load.data.data;
    setQuiz({ passPercent: d.passPercent ?? 60, maxAttempts: d.maxAttempts ?? 0, shuffle: d.shuffle ?? true, questions: d.questions?.length ? d.questions.map(strip) : [blankQ()] });
  }, [load.data]);

  const save = useMutation({
    mutationFn: () => put(`/instructor/lessons/${lesson.id}/quiz`, quiz),
    onSuccess: () => { toast.success('Quiz saved'); qc.invalidateQueries({ queryKey: ['instructor-course'] }); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const problem = quiz && (quiz.questions.some((q) => q.text.trim().length < 3 || q.options.some((o) => !o.text.trim())) ? 'Fill in every question and option' : validateQuestions(quiz.questions));

  const setQ = (i, patch) => setQuiz((z) => ({ ...z, questions: z.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) }));
  const setType = (i, type) => setQ(i, {
    type,
    options: type === 'truefalse' ? [{ text: 'True', correct: true }, { text: 'False', correct: false }]
      : quiz.questions[i].options.map((o, k) => ({ ...o, correct: type === 'single' ? k === quiz.questions[i].options.findIndex((x) => x.correct) : o.correct })),
  });
  const setOpt = (i, k, patch) => setQuiz((z) => ({
    ...z,
    questions: z.questions.map((q, j) => {
      if (j !== i) return q;
      return { ...q, options: q.options.map((o, m) => (m === k ? { ...o, ...patch } : patch.correct && q.type !== 'multiple' ? { ...o, correct: false } : o)) };
    }),
  }));

  return (
    <Modal open onClose={onClose} size="xl" title={`Quiz: ${lesson.title}`}
      footer={<div className="flex items-center justify-between gap-3"><p role="alert" className="text-sm text-red-600">{problem}</p><Button disabled={!quiz || !!problem} loading={save.isPending} onClick={() => save.mutate()}>Save quiz</Button></div>}>
      {!quiz ? <div className="grid place-items-center py-10"><Spinner /></div> : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Pass mark (%)" type="number" min={1} max={100} value={quiz.passPercent} onChange={(e) => setQuiz((z) => ({ ...z, passPercent: Number(e.target.value) }))} />
            <Input label="Max attempts" type="number" min={0} max={50} hint="0 = unlimited" value={quiz.maxAttempts} onChange={(e) => setQuiz((z) => ({ ...z, maxAttempts: Number(e.target.value) }))} />
            <div className="flex items-end pb-2"><Switch checked={quiz.shuffle} onChange={(v) => setQuiz((z) => ({ ...z, shuffle: v }))} label="Shuffle order" /></div>
          </div>
          {quiz.questions.map((q, i) => (
            <Card key={i} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ink-800">Question {i + 1}</p>
                <Button variant="ghost" size="sm" disabled={quiz.questions.length === 1} aria-label={`Delete question ${i + 1}`} onClick={() => setQuiz((z) => ({ ...z, questions: z.questions.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Textarea aria-label="Question" rows={2} placeholder="Question text" value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Type" value={q.type} onChange={(e) => setType(i, e.target.value)}><option value="single">Single answer</option><option value="multiple">Multiple answers</option><option value="truefalse">True / False</option></Select>
                <Input label="Points" type="number" min={1} max={20} value={q.points} onChange={(e) => setQ(i, { points: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                {q.options.map((o, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <input type={q.type === 'multiple' ? 'checkbox' : 'radio'} name={`q${i}`} checked={o.correct} onChange={(e) => setOpt(i, k, { correct: q.type === 'multiple' ? e.target.checked : true })} aria-label="Correct answer" className="h-4 w-4 accent-brand-600" />
                    <Input aria-label={`Option ${k + 1}`} wrapperClass="flex-1" placeholder={`Option ${k + 1}`} value={o.text} disabled={q.type === 'truefalse'} onChange={(e) => setOpt(i, k, { text: e.target.value })} />
                    {q.type !== 'truefalse' && <Button variant="ghost" size="sm" disabled={q.options.length <= 2} aria-label="Remove option" onClick={() => setQ(i, { options: q.options.filter((_, m) => m !== k) })}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                ))}
                {q.type !== 'truefalse' && q.options.length < 8 && <Button variant="ghost" size="sm" onClick={() => setQ(i, { options: [...q.options, { text: '', correct: false }] })}><Plus className="h-4 w-4" /> Add option</Button>}
              </div>
              <Input label="Explanation (shown after answering)" value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} />
            </Card>
          ))}
          <Button variant="secondary" disabled={quiz.questions.length >= 100} onClick={() => setQuiz((z) => ({ ...z, questions: [...z.questions, blankQ()] }))}><Plus className="h-4 w-4" /> Add question</Button>
        </div>
      )}
    </Modal>
  );
}
