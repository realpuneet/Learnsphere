import { Router } from 'express';
import auth from './auth.routes.js';
import users from './user.routes.js';
import catalog from './catalog.routes.js';
import learning from './learning.routes.js';
import instructor from './instructor.routes.js';
import admin from './admin.routes.js';
import payments from './payment.routes.js';

const r = Router();
r.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } }));
r.use('/auth', auth);
r.use('/me', users);
r.use('/instructor', instructor);
r.use('/admin', admin);
r.use('/payments', payments);
r.use('/', catalog); // public – must precede the authenticated learning router
r.use('/', learning);
export default r;
