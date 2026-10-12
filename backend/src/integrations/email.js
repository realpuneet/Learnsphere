import { env, features } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter;
async function getTransporter() {
  if (transporter) return transporter;
  const nodemailer = (await import('nodemailer')).default;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    pool: true,
    maxConnections: 5,
  });
  return transporter;
}

/** Returns { status: 'sent' | 'dry_run', provider, providerId } or throws. */
export async function sendEmail({ to, subject, html, text }) {
  if (!env.EMAIL_ENABLED) return { status: 'dry_run', provider: 'disabled' };
  if (!features.smtp) {
    logger.info({ to, subject }, '[email:dry-run]');
    return { status: 'dry_run', provider: 'dryrun' };
  }
  const t = await getTransporter();
  const info = await t.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
  return { status: 'sent', provider: 'smtp', providerId: info.messageId };
}
