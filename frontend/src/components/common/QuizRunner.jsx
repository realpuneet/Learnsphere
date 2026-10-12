import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { get, post } from '../../lib/api.js';
import { Button } from '../ui/Button.jsx';
import { Card, Badge } from '../ui/Card.jsx';
import { ErrorState, Skeleton, errMsg, toast } from '../ui/Feedback.jsx';
import { cn } from '../../lib/cn.js';

export function QuizRunner({ courseId, lessonId, onPassed }) {
  const qc = useQueryClient();
  const [picked, setPicked] = useState({}); // questionId -> [optionId]
  const [result, setResult] = useState(null);
  const q = useQuery({ queryKey: ['quiz', lessonId], queryFn: () => get(`/learn/${courseId}/lessons/${lessonId}/quiz`), staleTime: 0, gcTime: 0, refetchOnMount: 'always' });
  const quiz = q.data?.data;

  useEffect(() => { setPicked({}); setResult(null); }, [lessonId]);

  const submit = useMutation({
    mutationFn: () => post(`/learn/${courseId}/lessons/${lessonId}/quiz/attempts`, { answers: quiz.questions.map((qu) => ({ question: qu.id, selected: picked[qu.id] || [] })) }),
    onSuccess: (r) => {
      setResult(r.data);
      qc.invalidateQueries({ queryKey: ['learn', courseId] });
      qc.invalidateQueries({ queryKey: ['my-learning'] });
      if (r.data.passed) { toast.success('Quiz passed!'); onPassed?.(r.data); }
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const review = useMemo(() => Object.fromEntries((result?.review || []).map((r) => [r.question, r])), [result]);

  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;

  const toggle = (qu, optId) => {
    if (result) return;
    setPicked((p) => {
      const cur = p[qu.id] || [];
      if (qu.type === 'multiple') return { ...p, [qu.id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
      return { ...p, [qu.id]: [optId] };
    });
  };
  const retry = async () => { setPicked({}); setResult(null); await q.refetch(); };
  const answered = quiz.questions.filter((qu) => (picked[qu.id] || []).length).length;
  const noAttempts = quiz.attemptsLeft === 0 && !result;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
        <Badge tone="brand">Pass mark {quiz.passPercent}%</Badge>
        <span>{quiz.questions.length} questions</span>
        {quiz.attemptsLeft != null && <span>· {quiz.attemptsLeft} attempt{quiz.attemptsLeft === 1 ? '' : 's'} left</span>}
        {quiz.attempts.best > 0 && <span>· Best score {quiz.attempts.best}%</span>}
        {quiz.attempts.passed && <Badge tone="green">Passed before</Badge>}
      </div>

      {result && (
        <Card className={cn('p-5', result.passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50')} role="status">
          <p className="flex items-center gap-2 font-display text-xl font-extrabold">
            {result.passed ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <XCircle className="h-6 w-6 text-red-600" />}
            {result.scorePct}% — {result.passed ? 'You passed!' : `Not yet (need ${result.passPercent}%)`}
          </p>
          <p className="mt-1 text-sm text-ink-600">{result.passed ? 'Great work. This lesson is marked complete.' : 'Questions you missed are marked below. Review the lessons and try again.'}</p>
          {!result.passed && result.attemptsLeft !== 0 && <Button className="mt-3" variant="secondary" onClick={retry}><RotateCcw className="h-4 w-4" /> Try again</Button>}
        </Card>
      )}

      {noAttempts && <Card className="p-4 text-sm text-ink-600">You have used all attempts for this quiz.</Card>}

      {quiz.questions.map((qu, idx) => {
        const r = review[qu.id];
        const correctSet = new Set(r?.correctOptions || []);
        return (
          <Card key={qu.id} className={cn('p-5', r && (r.correct ? 'border-emerald-200' : 'border-red-200'))}>
            <fieldset>
              <legend className="font-semibold text-ink-900"><span className="mr-2 text-brand-600">{idx + 1}.</span>{qu.text}</legend>
              <p className="mt-0.5 text-xs text-ink-400">{qu.type === 'multiple' ? 'Select all that apply' : 'Select one'}</p>
              <div className="mt-3 space-y-2">
                {qu.options.map((o) => {
                  const on = (picked[qu.id] || []).includes(o.id);
                  const isRight = correctSet.has(o.id);
                  return (
                    <label key={o.id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition', on ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:bg-ink-50', result && 'cursor-default', result?.passed && isRight && 'border-emerald-400 bg-emerald-50')}>
                      <input type={qu.type === 'multiple' ? 'checkbox' : 'radio'} name={qu.id} checked={on} disabled={Boolean(result) || noAttempts} onChange={() => toggle(qu, o.id)} className="h-4 w-4 accent-brand-600" />
                      <span>{o.text}</span>
                    </label>
                  );
                })}
              </div>
              {r && !r.correct && !result.passed && <p className="mt-2 text-sm font-semibold text-red-600">Not quite right</p>}
              {r?.explanation && <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-600"><b>Why: </b>{r.explanation}</p>}
            </fieldset>
          </Card>
        );
      })}

      {!result && !noAttempts && (
        <div className="sticky bottom-20 md:bottom-4">
          <Button size="lg" className="w-full shadow-pop" disabled={answered < quiz.questions.length} loading={submit.isPending} onClick={() => submit.mutate()}>
            Submit answers ({answered}/{quiz.questions.length})
          </Button>
        </div>
      )}
    </div>
  );
}
