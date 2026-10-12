import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { Lesson } from '../models/Lesson.js';
import { ApiError } from '../utils/ApiError.js';
import { gradeQuiz } from '../utils/progress.js';
import { getEnrollment, markLessonPassed } from './enrollment.service.js';

const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

async function loadForStudent(user, courseId, lessonId) {
  if (!mongoose.isValidObjectId(lessonId)) throw ApiError.notFound('Quiz not found');
  const enrollment = await getEnrollment(user._id, courseId);
  if (!enrollment) throw ApiError.forbidden('Enrol in this course to take the quiz', 'NOT_ENROLLED');
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId, type: 'quiz' }).select('_id').lean();
  const quiz = lesson && (await Quiz.findOne({ lesson: lesson._id }).lean());
  if (!quiz) throw ApiError.notFound('Quiz not found');
  return { enrollment, quiz };
}

/** Questions with all answer keys stripped. */
export async function getQuiz(user, courseId, lessonId) {
  const { quiz } = await loadForStudent(user, courseId, lessonId);
  const attempts = await QuizAttempt.find({ user: user._id, quiz: quiz._id }).sort({ createdAt: -1 }).select('scorePct passed createdAt').lean();
  const questions = quiz.questions.map((q) => ({
    id: q._id,
    text: q.text,
    type: q.type,
    points: q.points,
    options: (quiz.shuffle ? shuffle(q.options) : q.options).map((o) => ({ id: o._id, text: o.text })),
  }));
  return {
    id: quiz._id,
    passPercent: quiz.passPercent,
    maxAttempts: quiz.maxAttempts,
    questions: quiz.shuffle ? shuffle(questions) : questions,
    attempts: { count: attempts.length, best: attempts.reduce((m, a) => Math.max(m, a.scorePct), 0), passed: attempts.some((a) => a.passed), history: attempts.slice(0, 10) },
    attemptsLeft: quiz.maxAttempts ? Math.max(0, quiz.maxAttempts - attempts.length) : null,
  };
}

export async function submit(user, courseId, lessonId, answers) {
  const { enrollment, quiz } = await loadForStudent(user, courseId, lessonId);
  const used = await QuizAttempt.countDocuments({ user: user._id, quiz: quiz._id });
  if (quiz.maxAttempts && used >= quiz.maxAttempts) throw ApiError.forbidden('No attempts left for this quiz', 'NO_ATTEMPTS');

  // answers must reference real questions/options of THIS quiz
  const qMap = new Map(quiz.questions.map((q) => [String(q._id), new Set(q.options.map((o) => String(o._id)))]));
  const seen = new Set();
  for (const a of answers) {
    const opts = qMap.get(String(a.question));
    if (!opts || seen.has(String(a.question))) throw ApiError.badRequest('Invalid answers', 'BAD_ANSWERS');
    seen.add(String(a.question));
    if (!a.selected.every((id) => opts.has(String(id)))) throw ApiError.badRequest('Invalid answer option', 'BAD_ANSWERS');
    const type = quiz.questions.find((q) => String(q._id) === String(a.question)).type;
    if (type !== 'multiple' && a.selected.length > 1) throw ApiError.badRequest('Only one option allowed', 'BAD_ANSWERS');
  }

  const g = gradeQuiz(quiz.questions, answers);
  const passed = g.scorePct >= quiz.passPercent;
  await QuizAttempt.create({ user: user._id, quiz: quiz._id, course: courseId, lesson: lessonId, answers, points: g.points, total: g.total, scorePct: g.scorePct, passed });

  let progress = null;
  if (passed) progress = await markLessonPassed(enrollment, lessonId);
  const attemptsLeft = quiz.maxAttempts ? Math.max(0, quiz.maxAttempts - used - 1) : null;

  const base = { scorePct: g.scorePct, points: g.points, total: g.total, passed, passPercent: quiz.passPercent, attemptsLeft, progress };
  if (!passed) {
    // don't leak the answer key on a failed attempt – only which questions were wrong
    return { ...base, review: g.perQuestion.map((p) => ({ question: p.question, correct: p.correct })) };
  }
  const byQ = new Map(quiz.questions.map((q) => [String(q._id), q]));
  return { ...base, review: g.perQuestion.map((p) => ({ question: p.question, correct: p.correct, correctOptions: p.correctOptions, explanation: byQ.get(p.question)?.explanation })) };
}
