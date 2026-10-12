import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as enroll from '../services/enrollment.service.js';
import * as quiz from '../services/quiz.service.js';
import * as reviews from '../services/review.service.js';
import * as threads from '../services/thread.service.js';

export const quote = asyncHandler(async (req, res) => ok(res, await enroll.quote(req.params.id, req.body.coupon)));
export const checkout = asyncHandler(async (req, res) => ok(res, await enroll.checkout(req.user, req.params.id, req.body.coupon)));

export const learn = asyncHandler(async (req, res) => ok(res, await enroll.getLearn(req.user, req.params.courseId)));
export const lesson = asyncHandler(async (req, res) => ok(res, await enroll.getLesson(req.user, req.params.courseId, req.params.lessonId)));
export const complete = asyncHandler(async (req, res) => ok(res, await enroll.setLessonComplete(req.user, req.params.courseId, req.params.lessonId, req.body.done)));
export const position = asyncHandler(async (req, res) => ok(res, await enroll.savePosition(req.user, req.params.courseId, req.body)));
export const refund = asyncHandler(async (req, res) => ok(res, await enroll.requestRefund(req.user, req.params.courseId), 'Refund initiated'));

export const getQuiz = asyncHandler(async (req, res) => ok(res, await quiz.getQuiz(req.user, req.params.courseId, req.params.lessonId)));
export const submitQuiz = asyncHandler(async (req, res) => ok(res, await quiz.submit(req.user, req.params.courseId, req.params.lessonId, req.body.answers)));

export const upsertReview = asyncHandler(async (req, res) => ok(res, await reviews.upsert(req.user, req.params.id, req.body), 'Thanks for your review'));
export const deleteReview = asyncHandler(async (req, res) => {
  await reviews.remove(req.user, req.params.id);
  return noContent(res);
});
export const replyReview = asyncHandler(async (req, res) => ok(res, await reviews.reply(req.user, req.params.id, req.body.body)));

export const threadList = asyncHandler(async (req, res) => {
  const r = await threads.list(req.user, req.params.courseId, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore });
});
export const threadCreate = asyncHandler(async (req, res) => created(res, await threads.create(req.user, req.params.courseId, req.body)));
export const threadAnswer = asyncHandler(async (req, res) => ok(res, await threads.answer(req.user, req.params.id, req.body.body)));
export const threadResolve = asyncHandler(async (req, res) => ok(res, await threads.setResolved(req.user, req.params.id, req.body.resolved)));
export const threadDelete = asyncHandler(async (req, res) => {
  await threads.remove(req.user, req.params.id);
  return noContent(res);
});
export const inbox = asyncHandler(async (req, res) => {
  const r = await threads.inbox(req.user, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore });
});
