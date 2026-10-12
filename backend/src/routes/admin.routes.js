import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import * as coupons from '../controllers/coupon.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { idParam } from '../validators/common.js';
import * as v from '../validators/admin.validator.js';
import * as cv from '../validators/course.validator.js';
import { ROLES } from '../utils/constants.js';

const r = Router();
// signed uploads are available to any authenticated instructor/admin/student (scoped folder)
r.get('/upload-auth', requireAuth, c.uploadAuth);

r.use(requireAuth, requireRole(ROLES.ADMIN));
r.get('/dashboard', c.dashboard);

r.get('/users', validate({ query: v.userList }), c.users);
r.post('/users', validate({ body: v.createUser }), c.createUser);
r.patch('/users/:id/active', validate({ params: idParam, body: v.setActive }), c.setActive);
r.patch('/users/:id/instructor', validate({ params: idParam, body: v.approve }), c.approveInstructor);

r.get('/courses', validate({ query: v.courseList }), c.courseList);
r.post('/courses/:id/review', validate({ params: idParam, body: cv.review }), c.courseReview);
r.patch('/courses/:id/status', validate({ params: idParam, body: v.setStatus }), c.courseStatus);
r.patch('/courses/:id/featured', validate({ params: idParam, body: v.setFeatured }), c.courseFeature);

r.get('/categories', c.categoryList);
r.post('/categories', validate({ body: v.category }), c.categoryCreate);
r.patch('/categories/:id', validate({ params: idParam, body: v.categoryUpdate }), c.categoryUpdate);
r.delete('/categories/:id', validate({ params: idParam }), c.categoryDelete);

r.get('/coupons', coupons.list);
r.post('/coupons', validate({ body: v.couponBody }), coupons.create);
r.patch('/coupons/:id', validate({ params: idParam, body: v.couponUpdate }), coupons.update);
r.delete('/coupons/:id', validate({ params: idParam }), coupons.remove);

r.get('/payments', validate({ query: v.paymentList }), c.payments);
r.get('/notification-logs', validate({ query: v.logList }), c.logs);
r.get('/enrollments', validate({ query: v.enrollmentList }), c.enrollments);
r.post('/enrollments', validate({ body: v.grant }), c.grant);
r.post('/enrollments/:id/revoke', validate({ params: idParam }), c.revoke);
r.post('/enrollments/:id/refund', validate({ params: idParam }), c.refund);

r.get('/settings', c.settingsGet);
r.put('/settings', validate({ body: v.settings }), c.settingsUpdate);
export default r;
