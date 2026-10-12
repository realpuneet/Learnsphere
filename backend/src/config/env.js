import 'dotenv/config';
import { z } from 'zod';

const bool = (def) =>
  z
    .enum(['true', 'false', '1', '0'])
    .default(def ? 'true' : 'false')
    .transform((v) => v === 'true' || v === '1');
const num = (def) => z.coerce.number().default(def);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: num(5000),
  APP_NAME: z.string().default('LearnSphere'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TZ: z.string().default('Asia/Kolkata'),
  LOG_LEVEL: z.string().default('info'),
  START_WORKER: bool(true),

  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/learnsphere?replicaSet=rs0'),
  // optional: override resolvers when the OS DNS cannot answer SRV lookups (mongodb+srv URIs)
  DNS_SERVERS: z.string().optional().default(''),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DAYS: num(30),
  COOKIE_SECURE: bool(false),
  COOKIE_DOMAIN: z.string().optional().default(''),

  // commerce / policy
  PLATFORM_FEE_PERCENT: num(20), // share kept by the platform from paid courses
  GST_PERCENT: num(18),
  REFUND_WINDOW_DAYS: num(7),
  REFUND_MAX_PROGRESS: num(20), // % of course completed above which self-service refunds are blocked
  CERTIFICATE_SECRET: z.string().default('change-me-certificate-secret'),
  INACTIVITY_NUDGE_DAYS: num(7),

  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),

  IMAGEKIT_PUBLIC_KEY: z.string().optional().default(''),
  IMAGEKIT_PRIVATE_KEY: z.string().optional().default(''),
  IMAGEKIT_URL_ENDPOINT: z.string().optional().default(''),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  LINKEDIN_CLIENT_ID: z.string().optional().default(''),
  LINKEDIN_CLIENT_SECRET: z.string().optional().default(''),
  // must be registered in the LinkedIn app; in dev point it at the Vite proxy so the cookie stays same-origin
  LINKEDIN_REDIRECT_URI: z.string().default('http://localhost:5173/api/v1/auth/linkedin/callback'),
  RESET_TOKEN_TTL_MIN: num(30),

  EMAIL_ENABLED: bool(true),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: num(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('LearnSphere <no-reply@learnsphere.example>'),

  SEED_ADMIN_EMAIL: z.string().default('admin@learnsphere.local'),
  SEED_ADMIN_PASSWORD: z.string().default('Admin@12345'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const features = {
  razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  imagekit: Boolean(env.IMAGEKIT_PUBLIC_KEY && env.IMAGEKIT_PRIVATE_KEY && env.IMAGEKIT_URL_ENDPOINT),
  smtp: Boolean(env.SMTP_HOST),
  google: Boolean(env.GOOGLE_CLIENT_ID),
  linkedin: Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET),
};
