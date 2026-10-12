import { Router } from 'express';
import * as c from '../controllers/payment.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rateLimiter.js';
import * as pv from '../validators/payment.validator.js';

const r = Router();
r.post('/verify', requireAuth, rateLimit({ max: 20, prefix: 'rl:payv', key: (q) => q.user.id }), validate({ body: pv.verify }), c.verifyPayment);
export default r;
