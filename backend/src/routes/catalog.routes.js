import { Router } from 'express';
import * as c from '../controllers/catalog.controller.js';
import { validate } from '../middlewares/validate.js';
import { optionalAuth } from '../middlewares/auth.js';
import { idParam } from '../validators/common.js';
import * as v from '../validators/catalog.validator.js';

const r = Router();
r.get('/settings', c.settingsPublic);
r.get('/categories', c.categories);
r.get('/home', c.home);
r.get('/courses', validate({ query: v.courseList }), c.courses);
r.get('/courses/:slug', optionalAuth, validate({ params: v.slugParam }), c.course);
r.get('/courses/:slug/related', validate({ params: v.slugParam }), c.related);
r.get('/courses/:id/reviews', validate({ params: idParam, query: v.reviewList }), c.reviews);
r.get('/instructors/:id', validate({ params: idParam, query: v.courseList }), c.instructor);
r.get('/certificates/verify/:code', c.verifyCertificate);
export default r;
