/**
 * What a course still needs before it can be submitted for review.
 * course: plain object; lessons: [{ type, durationSec, videoUrl, content }]; quizzes: Set of lesson ids that have a quiz.
 */
export function courseReadiness(course, lessons = [], quizLessonIds = new Set()) {
  const missing = [];
  if (!course.title || course.title.trim().length < 5) missing.push('A title of at least 5 characters');
  if (!course.description || course.description.trim().length < 50) missing.push('A description of at least 50 characters');
  if (!course.category) missing.push('A category');
  if (!course.thumbnail) missing.push('A thumbnail image');
  if (!course.outcomes || course.outcomes.length < 1) missing.push('At least one learning outcome');
  if (!course.sections || course.sections.length < 1) missing.push('At least one section');
  if (lessons.length < 1) missing.push('At least one lesson');
  const sectionIds = new Set((course.sections || []).map((s) => String(s._id)));
  const emptySections = [...sectionIds].filter((id) => !lessons.some((l) => String(l.section) === id));
  if (emptySections.length) missing.push('Remove or fill empty sections');
  for (const l of lessons) {
    if (l.type === 'video' && !l.videoUrl) missing.push(`Lesson "${l.title}" needs a video`);
    if (l.type === 'article' && !(l.content || '').trim()) missing.push(`Lesson "${l.title}" needs content`);
    if (l.type === 'quiz' && !quizLessonIds.has(String(l._id))) missing.push(`Quiz lesson "${l.title}" has no questions`);
  }
  return missing;
}

/** Validate quiz questions: right number of correct options per type. Returns an error string or null. */
export function validateQuestions(questions = []) {
  for (const [i, q] of questions.entries()) {
    const correct = q.options.filter((o) => o.correct).length;
    if (correct < 1) return `Question ${i + 1}: mark at least one correct option`;
    if ((q.type === 'single' || q.type === 'truefalse') && correct !== 1) return `Question ${i + 1}: exactly one option must be correct`;
    if (q.type === 'truefalse' && q.options.length !== 2) return `Question ${i + 1}: true/false needs exactly two options`;
    const texts = q.options.map((o) => o.text.trim().toLowerCase());
    if (new Set(texts).size !== texts.length) return `Question ${i + 1}: options must be different`;
  }
  return null;
}
