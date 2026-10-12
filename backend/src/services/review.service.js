import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Course } from '../models/Course.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';
import { invalidateNamespace } from '../utils/cache.js';
import { getEnrollment } from './enrollment.service.js';

export async function refreshRating(courseId) {
  const [agg] = await Review.aggregate([{ $match: { course: new mongoose.Types.ObjectId(String(courseId)) } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await Course.updateOne({ _id: courseId }, { $set: { 'stats.ratingAvg': agg ? Math.round(agg.avg * 10) / 10 : 0, 'stats.ratingCount': agg?.n || 0 } });
  await invalidateNamespace('catalog');
}

/** One review per student; must have started the course (at least one lesson done) to prevent drive-by ratings. */
export async function upsert(user, courseId, { rating, comment }) {
  const enr = await getEnrollment(user._id, courseId);
  if (!enr) throw ApiError.forbidden('Only enrolled students can review', 'NOT_ENROLLED');
  if (enr.completed.length < 1) throw ApiError.badRequest('Complete at least one lesson before reviewing', 'TOO_EARLY');
  const r = await Review.findOneAndUpdate({ user: user._id, course: courseId }, { $set: { rating, comment } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  await refreshRating(courseId);
  return r;
}

export async function remove(user, reviewId) {
  const r = await Review.findById(reviewId);
  if (!r) throw ApiError.notFound('Review not found');
  if (user.role !== ROLES.ADMIN && String(r.user) !== String(user._id)) throw ApiError.forbidden('Not your review');
  await r.deleteOne();
  await refreshRating(r.course);
}

export async function reply(user, reviewId, body) {
  const r = await Review.findById(reviewId);
  if (!r) throw ApiError.notFound('Review not found');
  const course = await Course.findById(r.course).select('instructor').lean();
  if (user.role !== ROLES.ADMIN && String(course.instructor) !== String(user._id)) throw ApiError.forbidden('Only the course instructor can reply');
  r.reply = { body, at: new Date() };
  await r.save();
  return r;
}
