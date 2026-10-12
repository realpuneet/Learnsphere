import { env } from './env.js';

const allowed = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);

export const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowed.includes(origin) || allowed.includes('*')) return cb(null, true);
    return cb(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  maxAge: 86400,
};
export const allowedOrigins = allowed;
