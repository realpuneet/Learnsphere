import mongoose from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { Course } from '../models/Course.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';

/** Validate a coupon for a course. Returns the coupon doc or throws a descriptive 400. */
export async function validateCoupon(code, course) {
  const c = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
  const bad = (m) => ApiError.badRequest(m, 'COUPON_INVALID');
  if (!c || !c.isActive) throw bad('This coupon code is not valid');
  if (c.expiresAt && c.expiresAt < new Date()) throw bad('This coupon has expired');
  if (c.maxUses && c.used >= c.maxUses) throw bad('This coupon has reached its usage limit');
  if (c.course && String(c.course) !== String(course._id)) throw bad('This coupon does not apply to this course');
  // instructor-owned coupons only work on that instructor's courses
  if (c.owner && !c.course && String(course.instructor) !== String(c.owner)) {
    const { User } = await import('../models/User.js');
    const owner = await User.findById(c.owner).select('role').lean();
    if (owner?.role !== ROLES.ADMIN) throw bad('This coupon does not apply to this course');
  }
  return c;
}

/** Atomically count a redemption; returns false if the limit was hit in the meantime. */
export async function redeem(couponId) {
  const r = await Coupon.findOneAndUpdate(
    { _id: couponId, $or: [{ maxUses: 0 }, { $expr: { $lt: ['$used', '$maxUses'] } }] },
    { $inc: { used: 1 } },
  );
  return Boolean(r);
}

export async function list(user, query = {}) {
  const filter = user.role === ROLES.ADMIN ? {} : { owner: user._id };
  if (query.course && mongoose.isValidObjectId(query.course)) filter.course = query.course;
  return Coupon.find(filter).sort({ createdAt: -1 }).limit(200).populate('course', 'title slug').lean();
}

export async function create(user, body) {
  if (user.role !== ROLES.ADMIN) {
    // instructors can only create course-scoped coupons for their own courses
    if (!body.course) throw ApiError.badRequest('Choose one of your courses for this coupon');
    if (!(await Course.exists({ _id: body.course, instructor: user._id }))) throw ApiError.forbidden('This is not your course');
  }
  if (body.type === 'percent' && body.value > 100) throw ApiError.badRequest('Percent cannot exceed 100');
  try {
    return await Coupon.create({ ...body, owner: user._id });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('That coupon code already exists', 'DUPLICATE');
    throw e;
  }
}

async function loadOwned(user, id) {
  const c = await Coupon.findById(id);
  if (!c) throw ApiError.notFound('Coupon not found');
  if (user.role !== ROLES.ADMIN && String(c.owner) !== String(user._id)) throw ApiError.forbidden('Not your coupon');
  return c;
}
export async function update(user, id, body) {
  const c = await loadOwned(user, id);
  const { code, owner, used, ...safe } = body; // code/owner/used are immutable
  c.set(safe);
  await c.save();
  return c;
}
export async function remove(user, id) {
  const c = await loadOwned(user, id);
  await c.deleteOne();
}
