// Mirrors the backend rule set (backend/src/utils/readiness.js) so authors get instant feedback.
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
