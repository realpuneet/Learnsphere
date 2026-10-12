/** Pure helpers shared by the progress service and unit tests. */

/** Percent complete (0-100, integer) from completed lesson ids against the course's lesson ids. */
export function percentComplete(lessonIds = [], completedIds = []) {
  const all = new Set(lessonIds.map(String));
  if (all.size === 0) return 0;
  const done = new Set(completedIds.map(String).filter((id) => all.has(id)));
  return Math.floor((done.size / all.size) * 100);
}

/**
 * Grade a quiz. questions: [{ _id, type, options:[{_id, correct}], points }]
 * answers: [{ question, selected:[optionId] }] -> { points, total, scorePct, perQuestion }
 * 'multiple' questions are all-or-nothing (exact set match) to avoid guess-all gaming.
 */
export function gradeQuiz(questions = [], answers = []) {
  const byQ = new Map(answers.map((a) => [String(a.question), new Set((a.selected || []).map(String))]));
  let points = 0;
  let total = 0;
  const perQuestion = questions.map((q) => {
    const pts = q.points || 1;
    total += pts;
    const picked = byQ.get(String(q._id)) || new Set();
    const correct = new Set(q.options.filter((o) => o.correct).map((o) => String(o._id)));
    const right = picked.size === correct.size && [...picked].every((id) => correct.has(id));
    if (right) points += pts;
    return { question: String(q._id), correct: right, correctOptions: [...correct] };
  });
  return { points, total, scorePct: total ? Math.round((points / total) * 100) : 0, perQuestion };
}

/** Next lesson to resume: first incomplete lesson in curriculum order, else the first lesson. */
export function nextLessonId(orderedLessonIds = [], completedIds = []) {
  const done = new Set(completedIds.map(String));
  return orderedLessonIds.find((id) => !done.has(String(id))) || orderedLessonIds[0] || null;
}
