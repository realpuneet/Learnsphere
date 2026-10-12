import mongoose from 'mongoose';
import { Enrollment } from '../models/Enrollment.js';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { COURSE_STATUS as CS, ENROLL_SOURCE, ENROLL_STATUS as ES, NOTIFY_TYPE as T, PAY_PURPOSE, ROLES } from '../utils/constants.js';
import { computeCheckout } from '../utils/pricing.js';
import { nextLessonId, percentComplete } from '../utils/progress.js';
import { detectVideoProvider } from '../utils/video.js';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { invalidateNamespace } from '../utils/cache.js';
import { pageMeta, pageParams, cursorPaginate } from '../utils/pagination.js';
import { createPaymentOrder, registerPaymentHandler, refundPayment } from './payment.service.js';
import { getSettings } from './settings.service.js';
import { notifyUser } from './notification.service.js';
import { redeem, validateCoupon } from './coupon.service.js';
import { issue as issueCertificate } from './certificate.service.js';
import { publicCurriculum, CARD_FIELDS } from './catalog.service.js';
import { emitToUser } from '../sockets/index.js';

const ACTIVE_STATES = [ES.ACTIVE, ES.COMPLETED];

/* --------------------------------- access --------------------------------- */
export const getEnrollment = (userId, courseId) => Enrollment.findOne({ user: userId, course: courseId, status: { $in: ACTIVE_STATES } });

async function loadPublished(courseId) {
  if (!mongoose.isValidObjectId(courseId)) throw ApiError.notFound('Course not found');
  const course = await Course.findOne({ _id: courseId, status: CS.PUBLISHED });
  if (!course) throw ApiError.notFound('Course not found or not available');
  return course;
}

/** Who may open a course's learning area: enrolled students, its instructor and admins (preview mode). */
async function learningAccess(user, courseId) {
  if (!mongoose.isValidObjectId(courseId)) throw ApiError.notFound('Course not found');
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  const enrollment = await getEnrollment(user._id, course._id);
  const staff = user.role === ROLES.ADMIN || String(course.instructor) === String(user._id);
  if (!enrollment && !staff) throw ApiError.forbidden('Enrol in this course to access it', 'NOT_ENROLLED');
  return { course, enrollment, preview: !enrollment };
}

/* ------------------------------ enrol / checkout ------------------------------ */
/** Create (or reactivate) an enrolment exactly once. Returns { enrollment, created }. */
export async function grantEnrollment({ userId, course, source, payment, amountPaid = 0, coupon }) {
  const base = { instructor: course.instructor, source, payment, amountPaid, coupon, status: ES.ACTIVE, lastActivityAt: new Date() };
  let created = false;
  let enrollment = await Enrollment.findOne({ user: userId, course: course._id });
  if (!enrollment) {
    try {
      enrollment = await Enrollment.create({ user: userId, course: course._id, ...base });
      created = true;
    } catch (e) {
      if (e.code !== 11000) throw e;
      enrollment = await Enrollment.findOne({ user: userId, course: course._id }); // lost the race
    }
  }
  if (!created && [ES.REFUNDED, ES.REVOKED].includes(enrollment.status)) {
    enrollment = await Enrollment.findOneAndUpdate({ _id: enrollment._id, status: { $in: [ES.REFUNDED, ES.REVOKED] } }, { $set: { ...base, refundedAt: null } }, { new: true }) || enrollment;
    created = enrollment.status === ES.ACTIVE;
  }
  if (created) {
    await Course.updateOne({ _id: course._id }, { $inc: { 'stats.enrolled': 1 } });
    await invalidateNamespace('catalog');
    const [student, instructor] = await Promise.all([User.findById(userId).lean(), User.findById(course.instructor).select('name').lean()]);
    await notifyUser({ user: student, type: T.ENROLLED, title: `You're enrolled in ${course.title}`, body: 'Start learning whenever you are ready.', kind: 'updates', data: { courseId: course._id }, vars: { courseTitle: course.title, instructorName: instructor?.name, lessons: course.stats?.lessons, paid: amountPaid ? `₹${amountPaid}` : 'Free', link: `/learn/${course._id}` } });
    await notifyUser({ userId: course.instructor, type: T.NEW_STUDENT, title: 'New student', body: `${student?.name} enrolled in ${course.title}`, kind: 'updates', email: false, data: { courseId: course._id }, vars: { studentName: student?.name, courseTitle: course.title, link: '/instructor' } });
  }
  return { enrollment, created };
}

/**
 * Start checkout. Free courses (or a 100% coupon) enrol immediately;
 * otherwise a payment order is created and the client opens Razorpay.
 */
export async function checkout(user, courseId, couponCode) {
  const course = await loadPublished(courseId);
  if (String(course.instructor) === String(user._id)) throw ApiError.badRequest('You cannot enrol in your own course', 'OWN_COURSE');
  if (await getEnrollment(user._id, course._id)) throw ApiError.conflict('You are already enrolled in this course', 'ALREADY_ENROLLED');

  const { gstPercent } = await getSettings();
  let coupon = null;
  if (couponCode && course.price > 0) coupon = await validateCoupon(couponCode, course);
  const totals = computeCheckout({ price: course.price, coupon, gstPercent });

  if (totals.total === 0) {
    if (coupon) await redeem(coupon._id);
    const { enrollment } = await grantEnrollment({ userId: user._id, course, source: course.price > 0 ? ENROLL_SOURCE.PAID : ENROLL_SOURCE.FREE, amountPaid: 0, coupon: coupon?.code });
    return { enrolled: true, enrollmentId: enrollment._id, totals };
  }
  const payment = await createPaymentOrder({ user, purpose: PAY_PURPOSE.COURSE, refId: course._id, amount: totals.total, receipt: `crs_${String(course._id).slice(-10)}`, meta: { coupon: coupon?.code, couponId: coupon?._id, discount: totals.discount, gst: totals.gst } });
  return { enrolled: false, payment, totals, course: { id: course._id, title: course.title } };
}

/** Quote without side effects (coupon preview on the course page). */
export async function quote(courseId, couponCode) {
  const course = await loadPublished(courseId);
  const { gstPercent } = await getSettings();
  const coupon = couponCode ? await validateCoupon(couponCode, course) : null;
  return { ...computeCheckout({ price: course.price, coupon, gstPercent }), coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value } : null };
}

/** Payment gateway callback (verify endpoint or webhook). */
registerPaymentHandler(PAY_PURPOSE.COURSE, {
  async onPaid(p) {
    const course = await Course.findById(p.refId);
    if (!course) {
      logger.error({ paymentId: p._id }, 'paid for a course that no longer exists – refunding');
      await refundPayment(p._id, { reason: 'Course unavailable' }).catch(() => {});
      return;
    }
    if (p.meta?.couponId) {
      const ok = await redeem(p.meta.couponId);
      if (!ok) logger.warn({ coupon: p.meta.coupon }, 'coupon limit reached while payment was in flight – honouring it');
    }
    await grantEnrollment({ userId: p.user, course, source: ENROLL_SOURCE.PAID, payment: p._id, amountPaid: p.amount, coupon: p.meta?.coupon });
  },
  async onFailed() {},
});

/* -------------------------------- my learning -------------------------------- */
export async function myLearning(user, { cursor, limit }) {
  const r = await cursorPaginate(Enrollment, { user: user._id, status: { $in: ACTIVE_STATES } }, { cursor, limit, select: 'course status percent lastLesson lastActivityAt completedAt certificate createdAt', populate: { path: 'course', select: CARD_FIELDS, populate: { path: 'instructor', select: 'name avatar' } } });
  return r;
}

export async function getLearn(user, courseId) {
  const { course, enrollment, preview } = await learningAccess(user, courseId);
  const [lessons, instructor] = await Promise.all([
    Lesson.find({ course: course._id }).select('section title type order durationSec isPreview').lean(),
    User.findById(course.instructor).select('name avatar headline').lean(),
  ]);
  const curriculum = publicCurriculum(course.toObject(), lessons, { showAll: false });
  const completed = new Set((enrollment?.completed || []).map(String));
  const ordered = curriculum.flatMap((s) => s.lessons.map((l) => String(l.id)));
  return {
    course: { id: course._id, title: course.title, slug: course.slug, thumbnail: course.thumbnail, certificate: course.certificate, status: course.status, stats: course.stats, instructor },
    preview,
    curriculum: curriculum.map((s) => ({ ...s, lessons: s.lessons.map((l) => ({ ...l, videoUrl: undefined, videoProvider: undefined, completed: completed.has(String(l.id)) })) })),
    progress: enrollment ? { percent: enrollment.percent, completed: [...completed], status: enrollment.status, certificate: enrollment.certificate || null, lastPosition: enrollment.lastPosition || null, source: enrollment.source, amountPaid: enrollment.amountPaid, enrolledAt: enrollment.createdAt } : { percent: 0, completed: [], status: 'preview' },
    resumeLessonId: String(enrollment?.lastLesson || '') || nextLessonId(ordered, [...completed]),
  };
}

export async function getLesson(user, courseId, lessonId) {
  const { course, enrollment, preview } = await learningAccess(user, courseId);
  if (!mongoose.isValidObjectId(lessonId)) throw ApiError.notFound('Lesson not found');
  const lesson = await Lesson.findOne({ _id: lessonId, course: course._id }).lean();
  if (!lesson) throw ApiError.notFound('Lesson not found');
  const all = await Lesson.find({ course: course._id }).select('section order').lean();
  const secOrder = new Map(course.sections.map((s) => [String(s._id), s.order]));
  const ordered = all.sort((a, b) => (secOrder.get(String(a.section)) - secOrder.get(String(b.section))) || (a.order - b.order)).map((l) => String(l._id));
  const i = ordered.indexOf(String(lesson._id));
  const hasQuiz = lesson.type === 'quiz' ? await Quiz.exists({ lesson: lesson._id }) : null;
  return {
    ...lesson,
    id: lesson._id,
    videoProvider: detectVideoProvider(lesson.videoUrl),
    completed: Boolean(enrollment?.completed.some((c) => String(c) === String(lesson._id))),
    prevId: ordered[i - 1] || null,
    nextId: ordered[i + 1] || null,
    hasQuiz: Boolean(hasQuiz),
    resumeSec: !preview && String(enrollment?.lastPosition?.lesson) === String(lesson._id) ? enrollment.lastPosition.sec : 0,
    preview,
  };
}

/* --------------------------------- progress --------------------------------- */
/** Recompute percent from the source of truth and finish the course exactly once. */
async function afterProgress(enrollmentId, courseId) {
  const [lessons, enr] = await Promise.all([Lesson.find({ course: courseId }).select('_id').lean(), Enrollment.findById(enrollmentId)]);
  const percent = percentComplete(lessons.map((l) => l._id), enr.completed);
  await Enrollment.updateOne({ _id: enr._id }, { $set: { percent, lastActivityAt: new Date() } });
  let finished = null;
  if (percent === 100 && enr.status === ES.ACTIVE) {
    // compare-and-set: only the request that flips the status issues the certificate
    finished = await Enrollment.findOneAndUpdate({ _id: enr._id, status: ES.ACTIVE }, { $set: { status: ES.COMPLETED, completedAt: new Date() } }, { new: true });
  }
  let certificate = null;
  if (finished) {
    const [course, user] = await Promise.all([Course.findById(courseId), User.findById(enr.user)]);
    if (course.certificate) {
      const instructor = await User.findById(course.instructor).select('name').lean();
      certificate = await issueCertificate({ enrollment: finished, course, user, instructor });
      await Enrollment.updateOne({ _id: enr._id }, { $set: { certificate: certificate._id } });
      await notifyUser({ user, type: T.CERTIFICATE, title: `Certificate earned: ${course.title}`, body: `Certificate ID ${certificate.code}`, kind: 'updates', data: { certificateId: certificate._id, courseId }, vars: { courseTitle: course.title, code: certificate.code, link: `/certificates/${certificate._id}` } });
    } else {
      await notifyUser({ user, type: T.COURSE_COMPLETED, title: `You completed ${course.title}`, body: 'Great work!', kind: 'updates', data: { courseId } });
    }
    emitToUser(enr.user, 'course:completed', { courseId, certificateId: certificate?._id });
  }
  return { percent, completed: finished ? true : enr.status === ES.COMPLETED, certificateId: certificate?._id || enr.certificate || null };
}

export async function setLessonComplete(user, courseId, lessonId, done) {
  const { enrollment, preview } = await learningAccess(user, courseId);
  if (preview) throw ApiError.badRequest('Preview mode does not track progress');
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId }).select('type').lean();
  if (!lesson) throw ApiError.notFound('Lesson not found');
  if (lesson.type === 'quiz') throw ApiError.badRequest('Quiz lessons are completed by passing the quiz', 'QUIZ_REQUIRED');
  await Enrollment.updateOne({ _id: enrollment._id }, done ? { $addToSet: { completed: lesson._id } } : { $pull: { completed: lesson._id } });
  return afterProgress(enrollment._id, courseId);
}

/** Used by quiz grading once a quiz is passed. */
export async function markLessonPassed(enrollment, lessonId) {
  await Enrollment.updateOne({ _id: enrollment._id }, { $addToSet: { completed: lessonId } });
  return afterProgress(enrollment._id, enrollment.course);
}

export async function savePosition(user, courseId, { lessonId, sec }) {
  const { enrollment, preview } = await learningAccess(user, courseId);
  if (preview) return { ok: true };
  if (!(await Lesson.exists({ _id: lessonId, course: courseId }))) throw ApiError.notFound('Lesson not found');
  await Enrollment.updateOne({ _id: enrollment._id }, { $set: { lastLesson: lessonId, lastPosition: { lesson: lessonId, sec: Math.max(0, Math.floor(sec)) }, lastActivityAt: new Date() } });
  return { ok: true };
}

/* ---------------------------------- refunds ---------------------------------- */
export async function requestRefund(user, courseId) {
  const enr = await Enrollment.findOne({ user: user._id, course: courseId, status: { $in: ACTIVE_STATES } });
  if (!enr) throw ApiError.notFound('Enrolment not found');
  if (enr.source !== ENROLL_SOURCE.PAID || !enr.payment || !enr.amountPaid) throw ApiError.badRequest('Only paid enrolments can be refunded', 'NOT_REFUNDABLE');
  if (enr.certificate) throw ApiError.badRequest('A certificate was already issued for this course', 'NOT_REFUNDABLE');
  const { refundWindowDays, refundMaxProgress } = await getSettings();
  const ageDays = (Date.now() - new Date(enr.createdAt).getTime()) / 86400_000;
  if (ageDays > refundWindowDays) throw ApiError.badRequest(`Refunds are available within ${refundWindowDays} days of purchase`, 'REFUND_WINDOW');
  if (enr.percent > refundMaxProgress) throw ApiError.badRequest(`Refunds are not available after ${refundMaxProgress}% of the course is completed`, 'REFUND_PROGRESS');
  return refundEnrollment(enr, 'Student requested refund');
}

export async function refundEnrollment(enr, reason) {
  // claim first so two clicks cannot both refund
  const claimed = await Enrollment.findOneAndUpdate({ _id: enr._id, status: { $in: ACTIVE_STATES } }, { $set: { status: ES.REFUNDED, refundedAt: new Date() } }, { new: true });
  if (!claimed) throw ApiError.conflict('Already refunded', 'ALREADY_REFUNDED');
  try {
    const p = await refundPayment(enr.payment, { reason });
    if (!p) throw ApiError.conflict('Payment is not refundable', 'NOT_REFUNDABLE');
  } catch (e) {
    await Enrollment.updateOne({ _id: enr._id }, { $set: { status: enr.status }, $unset: { refundedAt: '' } }); // roll back the claim
    throw e;
  }
  await Course.updateOne({ _id: enr.course }, { $inc: { 'stats.enrolled': -1 } });
  await invalidateNamespace('catalog');
  const course = await Course.findById(enr.course).select('title').lean();
  await notifyUser({ userId: enr.user, type: T.REFUNDED, title: 'Refund initiated', body: `₹${enr.amountPaid} for ${course?.title}`, kind: 'updates', vars: { courseTitle: course?.title, amount: enr.amountPaid } });
  return { refunded: enr.amountPaid };
}

/* ----------------------------------- admin ----------------------------------- */
export async function adminGrant(admin, { email, courseId }) {
  const [student, course] = await Promise.all([User.findOne({ email: String(email).toLowerCase() }), Course.findById(courseId)]);
  if (!student) throw ApiError.notFound('No user with that email');
  if (!course) throw ApiError.notFound('Course not found');
  const { enrollment, created } = await grantEnrollment({ userId: student._id, course, source: ENROLL_SOURCE.ADMIN });
  return { enrollment, created };
}

export async function adminRevoke(enrollmentId) {
  const enr = await Enrollment.findOneAndUpdate({ _id: enrollmentId, status: { $in: ACTIVE_STATES } }, { $set: { status: ES.REVOKED } }, { new: true });
  if (!enr) throw ApiError.notFound('Active enrolment not found');
  await Course.updateOne({ _id: enr.course }, { $inc: { 'stats.enrolled': -1 } });
  await invalidateNamespace('catalog');
  return enr;
}

/* --------------------------------- instructor --------------------------------- */
export async function studentsOf(user, courseId, query) {
  const course = await Course.findById(courseId).select('instructor').lean();
  if (!course) throw ApiError.notFound('Course not found');
  if (user.role !== ROLES.ADMIN && String(course.instructor) !== String(user._id)) throw ApiError.forbidden('This is not your course');
  const { page, limit, skip } = pageParams(query, { defaultLimit: 20 });
  const filter = { course: courseId, status: { $in: ACTIVE_STATES } };
  const [items, total] = await Promise.all([
    Enrollment.find(filter).sort({ lastActivityAt: -1 }).skip(skip).limit(limit).select('user percent status lastActivityAt completedAt createdAt amountPaid').populate('user', 'name email avatar').lean(),
    Enrollment.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

/* ------------------------------------ jobs ------------------------------------ */
/** "Continue learning" emails for students idle for N days – once per idle period. Runs from the minute tick, throttled to hourly. */
export async function sendInactivityNudges() {
  const { env } = await import('../config/env.js');
  const got = await getRedis().set('lock:nudges', '1', 'EX', 3600, 'NX');
  if (!got) return 0;
  const cutoff = new Date(Date.now() - env.INACTIVITY_NUDGE_DAYS * 86400_000);
  const rows = await Enrollment.find({
    status: ES.ACTIVE, percent: { $gt: 0, $lt: 100 }, lastActivityAt: { $lt: cutoff },
    $or: [{ nudgedAt: { $exists: false } }, { $expr: { $lt: ['$nudgedAt', '$lastActivityAt'] } }],
  }).limit(200).populate('course', 'title').lean();
  for (const e of rows) {
    await Enrollment.updateOne({ _id: e._id }, { $set: { nudgedAt: new Date() } });
    await notifyUser({ userId: e.user, type: T.NUDGE, title: `Keep going with ${e.course?.title}`, body: `You're ${e.percent}% done.`, kind: 'nudge', data: { courseId: e.course?._id }, vars: { courseTitle: e.course?.title, percent: e.percent, link: `/learn/${e.course?._id}` } });
  }
  return rows.length;
}
