import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { Enrollment } from '../models/Enrollment.js';
import { Review } from '../models/Review.js';
import { ApiError } from '../utils/ApiError.js';
import { COURSE_STATUS as CS, ROLES } from '../utils/constants.js';
import { escapeRegex } from '../utils/helpers.js';
import { detectVideoProvider } from '../utils/video.js';
import { cacheGetOrSet } from '../utils/cache.js';
import { cursorPaginate, pageMeta, pageParams } from '../utils/pagination.js';

export const CARD_FIELDS = 'title slug subtitle thumbnail instructor category level language price mrp stats tags featured publishedAt certificate';

export const listCategories = () =>
  cacheGetOrSet('catalog', 'categories', 300, async () => {
    const [cats, counts] = await Promise.all([
      Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
      Course.aggregate([{ $match: { status: CS.PUBLISHED } }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
    ]);
    const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    return cats.map((c) => ({ ...c, courseCount: map[String(c._id)] || 0 }));
  });

const SORTS = {
  popular: { 'stats.enrolled': -1, _id: -1 },
  newest: { publishedAt: -1, _id: -1 },
  rating: { 'stats.ratingAvg': -1, 'stats.ratingCount': -1, _id: -1 },
  price_asc: { price: 1, _id: -1 },
  price_desc: { price: -1, _id: -1 },
};

async function buildFilter(q) {
  const f = { status: CS.PUBLISHED };
  if (q.category) {
    const cat = mongoose.isValidObjectId(q.category) ? { _id: q.category } : { slug: q.category };
    const c = await Category.findOne(cat).select('_id').lean();
    f.category = c?._id || new mongoose.Types.ObjectId();
  }
  if (q.level) f.level = q.level;
  if (q.language) f.language = q.language;
  if (q.price === 'free') f.price = 0;
  if (q.price === 'paid') f.price = { $gt: 0 };
  if (q.minRating) f['stats.ratingAvg'] = { $gte: Number(q.minRating) };
  if (q.instructor && mongoose.isValidObjectId(q.instructor)) f.instructor = q.instructor;
  if (q.featured === 'true') f.featured = true;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    f.$or = [{ title: rx }, { subtitle: rx }, { tags: rx }];
  }
  return f;
}

export async function listCourses(query) {
  const { page, limit, skip } = pageParams(query, { defaultLimit: 12, maxLimit: 48 });
  const key = JSON.stringify({ ...query, page, limit });
  return cacheGetOrSet('catalog', `list:${key}`, 60, async () => {
    const filter = await buildFilter(query);
    const sort = SORTS[query.sort] || SORTS.popular;
    const [items, total] = await Promise.all([
      Course.find(filter).select(CARD_FIELDS).sort(sort).skip(skip).limit(limit).populate('instructor', 'name avatar headline').populate('category', 'name slug').lean(),
      Course.countDocuments(filter),
    ]);
    return { items, meta: pageMeta(total, page, limit) };
  });
}

export const homeFeed = () =>
  cacheGetOrSet('catalog', 'home', 120, async () => {
    const base = { status: CS.PUBLISHED };
    const pop = (f, sort, n = 8) => Course.find(f).select(CARD_FIELDS).sort(sort).limit(n).populate('instructor', 'name avatar headline').populate('category', 'name slug').lean();
    const [featured, popular, newest, categories] = await Promise.all([
      pop({ ...base, featured: true }, SORTS.popular, 6),
      pop(base, SORTS.popular),
      pop(base, SORTS.newest),
      listCategories(),
    ]);
    return { featured, popular, newest, categories };
  });

/** Curriculum without protected fields. Only free previews expose their video. */
export function publicCurriculum(course, lessons, { showAll = false } = {}) {
  return (course.sections || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s._id,
      title: s.title,
      lessons: lessons
        .filter((l) => String(l.section) === String(s._id))
        .sort((a, b) => a.order - b.order)
        .map((l) => ({
          id: l._id,
          title: l.title,
          type: l.type,
          durationSec: l.durationSec,
          isPreview: l.isPreview,
          ...(l.isPreview || showAll ? { videoUrl: l.videoUrl, videoProvider: detectVideoProvider(l.videoUrl) } : {}),
        })),
    }));
}

export async function getCourseBySlug(slug, user) {
  const course = await Course.findOne({ slug }).populate('instructor', 'name avatar headline bio links').populate('category', 'name slug').lean();
  if (!course) throw ApiError.notFound('Course not found');
  const isOwner = user && String(course.instructor._id) === String(user._id);
  const isAdmin = user?.role === ROLES.ADMIN;
  if (course.status !== CS.PUBLISHED && !isOwner && !isAdmin) throw ApiError.notFound('Course not found');

  const [lessons, enrollment, myReview, ratingBuckets, instructorStats] = await Promise.all([
    Lesson.find({ course: course._id }).select('section title type order durationSec isPreview videoUrl').lean(),
    user ? Enrollment.findOne({ user: user._id, course: course._id }).select('status percent lastLesson completedAt').lean() : null,
    user ? Review.findOne({ user: user._id, course: course._id }).lean() : null,
    Review.aggregate([{ $match: { course: course._id } }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
    Course.aggregate([{ $match: { instructor: course.instructor._id, status: CS.PUBLISHED } }, { $group: { _id: null, courses: { $sum: 1 }, students: { $sum: '$stats.enrolled' } } }]),
  ]);
  const { status, rejectionReason, ...rest } = course;
  return {
    ...rest,
    status: isOwner || isAdmin ? status : undefined,
    rejectionReason: isOwner || isAdmin ? rejectionReason : undefined,
    curriculum: publicCurriculum(course, lessons),
    enrollment: enrollment && ['active', 'completed'].includes(enrollment.status) ? enrollment : null,
    myReview,
    ratingBuckets: Object.fromEntries([5, 4, 3, 2, 1].map((r) => [r, ratingBuckets.find((b) => b._id === r)?.n || 0])),
    instructorStats: instructorStats[0] ? { courses: instructorStats[0].courses, students: instructorStats[0].students } : { courses: 0, students: 0 },
  };
}

export async function relatedCourses(slug) {
  const c = await Course.findOne({ slug, status: CS.PUBLISHED }).select('category tags').lean();
  if (!c) return [];
  return Course.find({ status: CS.PUBLISHED, _id: { $ne: c._id }, $or: [{ category: c.category }, { tags: { $in: c.tags || [] } }] })
    .select(CARD_FIELDS).sort(SORTS.popular).limit(4).populate('instructor', 'name avatar headline').lean();
}

export async function listReviews(courseId, { cursor, limit }) {
  const r = await cursorPaginate(Review, { course: courseId }, { cursor, limit, populate: { path: 'user', select: 'name avatar' } });
  return r;
}

export async function publicInstructorCourses(instructorId, query) {
  return listCourses({ ...query, instructor: String(instructorId) });
}
