import { NotificationLog } from '../models/NotificationLog.js';
import { sendEmail } from '../integrations/email.js';
import { renderTemplate } from '../integrations/templates.js';
import { logger } from '../utils/logger.js';

/** Deliver one email and record the outcome. Throws on failure so BullMQ retries with backoff. */
async function deliver({ logId, to, type, vars }) {
  const log = await NotificationLog.findById(logId);
  if (!log) return;
  if (log.status === 'sent' || log.status === 'dry_run') return; // idempotent on retry
  const tpl = renderTemplate(type, vars);
  try {
    log.attempts += 1;
    const res = await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
    log.status = res.status;
    log.provider = res.provider;
    log.providerId = res.providerId;
    log.error = undefined;
    await log.save();
  } catch (e) {
    log.status = 'failed';
    log.error = String(e.message).slice(0, 300);
    await log.save();
    logger.warn({ err: e.message }, 'email delivery failed');
    throw e;
  }
}

/** Minute tick (safe on many workers): inactivity nudges. */
async function tick() {
  const { sendInactivityNudges } = await import('../services/enrollment.service.js');
  const results = await Promise.allSettled([sendInactivityNudges()]);
  results.filter((r) => r.status === 'rejected').forEach((r) => logger.error({ err: r.reason?.message }, 'tick task failed'));
}

export const handlers = { deliver, tick };
