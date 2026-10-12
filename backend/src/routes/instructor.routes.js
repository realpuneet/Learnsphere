import { Router } from 'express';
import * as c from '../controllers/instructor.controller.js';
import * as coupons from '../controllers/coupon.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { idParam, pageQuery } from '../validators/common.js';
import * as v from '../validators/course.validator.js';
import * as av from '../validators/admin.validator.js';
import { ROLES } from '../utils/constants.js';

const r = Router();
r.use(requireAuth, requireRole(ROLES.INSTRUCTOR, ROLES.ADMIN));

r.get('/dashboard', c.dashboard);
r.get('/courses', validate({ query: v.myCourses }), c.list);
r.post('/courses', validate({ body: v.createCourse }), c.create);
r.get('/courses/:id', validate({ params: idParam }), c.get);
r.patch('/courses/:id', validate({ params: idParam, body: v.updateCourse }), c.update);
r.delete('/courses/:id', validate({ params: idParam }), c.remove);
r.post('/courses/:id/submit', validate({ params: idParam }), c.submit);
r.post('/courses/:id/archive', validate({ params: idParam }), c.archive);
r.get('/courses/:id/students', validate({ params: idParam, query: pageQuery }), c.students);

r.post('/courses/:id/sections', validate({ params: idParam, body: v.sectionBody }), c.addSection);
r.put('/courses/:id/sections/order', validate({ params: idParam, body: v.orderIds }), c.reorderSections);
r.patch('/courses/:id/sections/:sectionId', validate({ params: v.sectionParams, body: v.sectionBody }), c.updateSection);
r.delete('/courses/:id/sections/:sectionId', validate({ params: v.sectionParams }), c.deleteSection);
r.post('/courses/:id/sections/:sectionId/lessons', validate({ params: v.sectionParams, body: v.createLesson }), c.addLesson);
r.put('/courses/:id/sections/:sectionId/lessons/order', validate({ params: v.sectionParams, body: v.orderIds }), c.reorderLessons);

r.patch('/lessons/:lessonId', validate({ params: v.lessonParam, body: v.updateLesson }), c.updateLesson);
r.delete('/lessons/:lessonId', validate({ params: v.lessonParam }), c.deleteLesson);
r.get('/lessons/:lessonId/quiz', validate({ params: v.lessonParam }), c.getQuiz);
r.put('/lessons/:lessonId/quiz', validate({ params: v.lessonParam, body: v.quizBody }), c.putQuiz);

r.get('/coupons', coupons.list);
r.post('/coupons', validate({ body: av.couponBody }), coupons.create);
r.patch('/coupons/:id', validate({ params: idParam, body: av.couponUpdate }), coupons.update);
r.delete('/coupons/:id', validate({ params: idParam }), coupons.remove);
export default r;
