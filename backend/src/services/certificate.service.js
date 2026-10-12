import { Certificate } from '../models/Certificate.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { genCode, hmac } from '../utils/helpers.js';

const sign = (code, userId, courseId, issuedAt) => hmac(env.CERTIFICATE_SECRET, `${code}|${userId}|${courseId}|${new Date(issuedAt).toISOString()}`);

/** Idempotent: one certificate per enrollment (unique index), returns the existing one on a race. */
export async function issue({ enrollment, course, user, instructor }) {
  const existing = await Certificate.findOne({ enrollment: enrollment._id });
  if (existing) return existing;
  const code = genCode('LS', 10);
  const issuedAt = new Date();
  try {
    return await Certificate.create({
      code,
      user: user._id,
      course: course._id,
      enrollment: enrollment._id,
      studentName: user.name,
      courseTitle: course.title,
      instructorName: instructor?.name || 'Instructor',
      hours: Math.round(((course.stats?.durationSec || 0) / 3600) * 10) / 10,
      issuedAt,
      signature: sign(code, user._id, course._id, issuedAt),
    });
  } catch (e) {
    if (e.code === 11000) return Certificate.findOne({ enrollment: enrollment._id });
    throw e;
  }
}

/** Public verification – no auth. Returns only what a verifier needs. */
export async function verify(code) {
  const c = await Certificate.findOne({ code: String(code).trim().toUpperCase() }).lean();
  if (!c) throw ApiError.notFound('No certificate found with that ID', 'CERT_NOT_FOUND');
  const valid = sign(c.code, c.user, c.course, c.issuedAt) === c.signature;
  return { valid, code: c.code, studentName: c.studentName, courseTitle: c.courseTitle, instructorName: c.instructorName, hours: c.hours, issuedAt: c.issuedAt };
}

export const listMine = (userId) => Certificate.find({ user: userId }).sort({ issuedAt: -1 }).populate('course', 'title slug thumbnail').lean();

export async function getMine(userId, id) {
  const c = await Certificate.findOne({ _id: id, user: userId }).populate('course', 'title slug thumbnail').lean();
  if (!c) throw ApiError.notFound('Certificate not found');
  return c;
}
