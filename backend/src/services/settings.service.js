import { Setting } from '../models/Setting.js';
import { env } from '../config/env.js';
import { cacheGetOrSet, invalidateNamespace } from '../utils/cache.js';

/** Defaults come from env; admins can override a safe subset at runtime. */
export const SETTING_DEFAULTS = () => ({
  siteName: env.APP_NAME,
  tagline: 'Learn in-demand skills from expert instructors',
  supportEmail: '',
  platformFeePercent: env.PLATFORM_FEE_PERCENT,
  gstPercent: env.GST_PERCENT,
  refundWindowDays: env.REFUND_WINDOW_DAYS,
  refundMaxProgress: env.REFUND_MAX_PROGRESS,
  requireCourseApproval: true,
  allowInstructorSignup: true,
});

export const getSettings = () =>
  cacheGetOrSet('settings', 'all', 300, async () => {
    const rows = await Setting.find().lean();
    return { ...SETTING_DEFAULTS(), ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  });

export async function updateSettings(patch) {
  const allowed = Object.keys(SETTING_DEFAULTS());
  const ops = Object.entries(patch)
    .filter(([k]) => allowed.includes(k))
    .map(([key, value]) => ({ updateOne: { filter: { key }, update: { $set: { value } }, upsert: true } }));
  if (ops.length) await Setting.bulkWrite(ops);
  await invalidateNamespace('settings');
  return getSettings();
}

export const publicSettings = async () => {
  const s = await getSettings();
  return { siteName: s.siteName, tagline: s.tagline, supportEmail: s.supportEmail, gstPercent: s.gstPercent, refundWindowDays: s.refundWindowDays, allowInstructorSignup: s.allowInstructorSignup };
};
