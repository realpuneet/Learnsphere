import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { User } from '../models/User.js';
import { Thread } from '../models/Thread.js';
import { Review } from '../models/Review.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { COURSE_STATUS as CS } from '../utils/constants.js';
import { cacheGetOrSet } from '../utils/cache.js';
import { splitRevenue } from '../utils/pricing.js';
import { getSettings } from './settings.service.js';

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.n]));
const daysAgo = (n) => new Date(Date.now() - n * 86400_000);
const PAID = { status: { $in: ['active', 'completed'] }, amountPaid: { $gt: 0 } };

/** gross GST-inclusive rupees -> revenue split (linear, so we can sum first) */
const split = (gross, s) => splitRevenue({ total: gross, gstPercent: s.gstPercent, feePercent: s.platformFeePercent });

export const adminDashboard = () =>
  cacheGetOrSet('analytics', 'admin', 60, async () => {
    const s = await getSettings();
    const since30 = daysAgo(30);
    const since14 = daysAgo(13);
    const [users, courses, trend, rev30, revAll, top, pendingReview, pendingInstructors, newUsers, mail] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
      Course.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Enrollment.aggregate([
        { $match: { createdAt: { $gte: since14 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, enrolments: { $sum: 1 }, revenue: { $sum: '$amountPaid' } } },
        { $sort: { _id: 1 } },
      ]),
      Enrollment.aggregate([{ $match: { ...PAID, createdAt: { $gte: since30 } } }, { $group: { _id: null, gross: { $sum: '$amountPaid' }, n: { $sum: 1 } } }]),
      Enrollment.aggregate([{ $match: PAID }, { $group: { _id: null, gross: { $sum: '$amountPaid' }, n: { $sum: 1 } } }]),
      Course.find({ status: CS.PUBLISHED }).sort({ 'stats.enrolled': -1 }).limit(5).select('title slug stats price').lean(),
      Course.countDocuments({ status: CS.IN_REVIEW }),
      User.countDocuments({ role: 'instructor', 'instructor.approved': false, isActive: true }),
      User.countDocuments({ createdAt: { $gte: since30 } }),
      NotificationLog.aggregate([{ $match: { createdAt: { $gte: since30 } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const g30 = rev30[0]?.gross || 0;
    const gAll = revAll[0]?.gross || 0;
    return {
      users: countBy(users),
      courses: countBy(courses),
      trend: trend.map((t) => ({ date: t._id, enrolments: t.enrolments, revenue: t.revenue })),
      revenue30d: { gross: g30, orders: rev30[0]?.n || 0, ...split(g30, s) },
      revenueAll: { gross: gAll, orders: revAll[0]?.n || 0, ...split(gAll, s) },
      topCourses: top,
      pendingReview,
      pendingInstructors,
      newUsers30d: newUsers,
      email30d: countBy(mail),
    };
  });

export async function instructorDashboard(userId) {
  const s = await getSettings();
  const id = new mongoose.Types.ObjectId(String(userId));
  const since30 = daysAgo(30);
  const since14 = daysAgo(13);
  const myCourses = await Course.find({ instructor: id }).select('title slug status stats price thumbnail').lean();
  const courseIds = myCourses.map((c) => c._id);
  const [trend, rev30, revAll, perCourse, unanswered, recentReviews, students] = await Promise.all([
    Enrollment.aggregate([
      { $match: { instructor: id, createdAt: { $gte: since14 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, enrolments: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Enrollment.aggregate([{ $match: { ...PAID, instructor: id, createdAt: { $gte: since30 } } }, { $group: { _id: null, gross: { $sum: '$amountPaid' } } }]),
    Enrollment.aggregate([{ $match: { ...PAID, instructor: id } }, { $group: { _id: null, gross: { $sum: '$amountPaid' } } }]),
    Enrollment.aggregate([{ $match: { instructor: id, status: { $in: ['active', 'completed'] } } }, { $group: { _id: '$course', students: { $sum: 1 }, gross: { $sum: '$amountPaid' }, avgProgress: { $avg: '$percent' }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }]),
    Thread.countDocuments({ course: { $in: courseIds }, resolved: false, 'answers.0': { $exists: false } }),
    Review.find({ course: { $in: courseIds } }).sort({ _id: -1 }).limit(5).populate('user', 'name avatar').populate('course', 'title slug').lean(),
    Enrollment.distinct('user', { instructor: id, status: { $in: ['active', 'completed'] } }),
  ]);
  const map = Object.fromEntries(perCourse.map((p) => [String(p._id), p]));
  return {
    totals: { courses: myCourses.length, published: myCourses.filter((c) => c.status === CS.PUBLISHED).length, students: students.length, unanswered },
    earnings30d: split(rev30[0]?.gross || 0, s),
    earningsAll: split(revAll[0]?.gross || 0, s),
    trend: trend.map((t) => ({ date: t._id, enrolments: t.enrolments })),
    courses: myCourses.map((c) => {
      const p = map[String(c._id)] || {};
      return { ...c, students: p.students || 0, avgProgress: Math.round(p.avgProgress || 0), completionRate: p.students ? Math.round((p.completed / p.students) * 100) : 0, earnings: split(p.gross || 0, s).instructor };
    }),
    recentReviews,
  };
}

