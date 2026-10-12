import { Router } from 'express';
import * as c from '../controllers/learning.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rateLimiter.js';
import { idempotent } from '../middlewares/idempotency.js';
import { idParam } from '../validators/common.js';
import * as v from '../validators/learning.validator.js';
import { ROLES } from '../utils/constants.js';

const r = Router();
const quizLimit = rateLimit({ windowSec: 60, max: 10, prefix: 'rl:quiz', key: (q) => q.user.id });

/* commerce */
r.post('/courses/:id/quote', validate({ params: idParam, body: v.coupon }), c.quote);
r.post('/courses/:id/checkout', requireAuth, rateLimit({ max: 10, prefix: 'rl:co', key: (q) => q.user.id }), idempotent('checkout'), validate({ params: idParam, body: v.coupon }), c.checkout);

/* learning area (auth applied per path so unknown URLs still 404) */
r.use(['/learn', '/threads', '/reviews', '/inbox'], requireAuth);
r.get('/learn/:courseId', validate({ params: v.courseParam }), c.learn);
r.get('/learn/:courseId/lessons/:lessonId', validate({ params: v.lessonParams }), c.lesson);
r.post('/learn/:courseId/lessons/:lessonId/complete', validate({ params: v.lessonParams, body: v.complete }), c.complete);
r.put('/learn/:courseId/position', rateLimit({ windowSec: 10, max: 10, prefix: 'rl:pos', key: (q) => q.user.id }), validate({ params: v.courseParam, body: v.position }), c.position);
r.get('/learn/:courseId/lessons/:lessonId/quiz', validate({ params: v.lessonParams }), c.getQuiz);
r.post('/learn/:courseId/lessons/:lessonId/quiz/attempts', quizLimit, validate({ params: v.lessonParams, body: v.attempt }), c.submitQuiz);
r.post('/learn/:courseId/refund', validate({ params: v.courseParam }), c.refund);

/* Q&A */
r.get('/learn/:courseId/threads', validate({ params: v.courseParam, query: v.threadList }), c.threadList);
r.post('/learn/:courseId/threads', rateLimit({ max: 10, prefix: 'rl:thr', key: (q) => q.user.id }), validate({ params: v.courseParam, body: v.threadCreate }), c.threadCreate);
r.post('/threads/:id/answers', rateLimit({ max: 20, prefix: 'rl:ans', key: (q) => q.user.id }), validate({ params: idParam, body: v.answerBody }), c.threadAnswer);
r.patch('/threads/:id/resolved', validate({ params: idParam, body: v.resolvedBody }), c.threadResolve);
r.delete('/threads/:id', validate({ params: idParam }), c.threadDelete);

/* reviews */
r.put('/courses/:id/review', requireAuth, validate({ params: idParam, body: v.reviewBody }), c.upsertReview);
r.delete('/reviews/:id', validate({ params: idParam }), c.deleteReview);
r.post('/reviews/:id/reply', requireRole(ROLES.INSTRUCTOR, ROLES.ADMIN), validate({ params: idParam, body: v.replyBody }), c.replyReview);
r.get('/inbox/threads', requireRole(ROLES.INSTRUCTOR, ROLES.ADMIN), validate({ query: v.inbox }), c.inbox);
export default r;
