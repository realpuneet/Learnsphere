import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { Quiz } from '../models/Quiz.js';
import { Category } from '../models/Category.js';
import { Enrollment } from '../models/Enrollment.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { COURSE_STATUS as CS, ROLES, canMoveCourse, NOTIFY_TYPE } from '../utils/constants.js';
import { slugWithSuffix, slugify } from '../utils/helpers.js';
import { courseReadiness, validateQuestions } from '../utils/readiness.js';
import { invalidateNamespace } from '../utils/cache.js';
import { pageMeta, pageParams } from '../utils/pagination.js';
import { getSettings } from './settings.service.js';
import { notifyUser } from './notification.service.js';
import { emitToRole } from '../sockets/index.js';

const isAdmin = (u) => u.role === ROLES.ADMIN;

/** Load a course the caller may edit (owner or admin). */
export async function loadOwned(user, courseId) {
  if (!mongoose.isValidObjectId(courseId)) throw ApiError.notFound('Course not found');
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  if (!isAdmin(user) && String(course.instructor) !== String(user._id)) throw ApiError.forbidden('This is not your course');
  return course;
}

/** Keep denormalised lesson/duration counters correct after any curriculum change. */
export async function recalcStats(courseId) {
  const [agg] = await Lesson.aggregate([{ $match: { course: new mongoose.Types.ObjectId(String(courseId)) } }, { $group: { _id: null, n: { $sum: 1 }, d: { $sum: '$durationSec' } } }]);
  await Course.updateOne({ _id: courseId }, { $set: { 'stats.lessons': agg?.n || 0, 'stats.durationSec': agg?.d || 0 } });
}

const bust = () => invalidateNamespace('catalog');

async function uniqueSlug(title) {
  const base = slugify(title) || 'course';
  return (await Course.exists({ slug: base })) ? slugWithSuffix(title) : base;
}

/* -------------------------------- courses -------------------------------- */
export async function listMine(user, query) {
  const { page, limit, skip } = pageParams(query, { defaultLimit: 20 });
  const filter = isAdmin(user) && query.all === 'true' ? {} : { instructor: user._id };
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    Course.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('category', 'name').lean(),
    Course.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

export async function create(user, body) {
  if (body.category && !(await Category.exists({ _id: body.category }))) throw ApiError.badRequest('Unknown category');
  const course = await Course.create({
    ...body,
    instructor: user._id,
    slug: await uniqueSlug(body.title),
    sections: [{ title: 'Introduction', order: 0 }],
  });
  return course;
}

export async function getForEdit(user, courseId) {
  const course = await loadOwned(user, courseId);
  const [lessons, quizzes] = await Promise.all([
    Lesson.find({ course: course._id }).sort({ order: 1 }).lean(),
    Quiz.find({ course: course._id }).select('lesson questions.length passPercent').lean(),
  ]);
  const quizSet = new Set(quizzes.map((q) => String(q.lesson)));
  return {
    course: course.toJSON(),
    lessons: lessons.map((l) => ({ ...l, id: l._id, hasQuiz: quizSet.has(String(l._id)) })),
    readiness: courseReadiness(course.toObject(), lessons, quizSet),
  };
}

const EDITABLE = ['title', 'subtitle', 'description', 'category', 'level', 'language', 'tags', 'thumbnail', 'previewVideo', 'outcomes', 'requirements', 'price', 'mrp', 'certificate'];
export async function update(user, courseId, body) {
  const course = await loadOwned(user, courseId);
  if (body.category && !(await Category.exists({ _id: body.category }))) throw ApiError.badRequest('Unknown category');
  const next = { ...course.toObject(), ...body };
  if (next.mrp && next.mrp < next.price) throw ApiError.badRequest('MRP cannot be lower than the price');
  for (const k of EDITABLE) if (body[k] !== undefined) course.set(k, body[k]);
  // editing a rejected course sends it back to draft so it can be resubmitted
  if (course.status === CS.REJECTED) course.status = CS.DRAFT;
  await course.save();
  if (course.status === CS.PUBLISHED) await bust();
  return course;
}

export async function remove(user, courseId) {
  const course = await loadOwned(user, courseId);
  if (![CS.DRAFT, CS.REJECTED].includes(course.status)) throw ApiError.conflict('Only draft or rejected courses can be deleted — archive it instead', 'NOT_DELETABLE');
  if (await Enrollment.exists({ course: course._id })) throw ApiError.conflict('This course has enrolments and cannot be deleted', 'HAS_ENROLLMENTS');
  await Promise.all([Lesson.deleteMany({ course: course._id }), Quiz.deleteMany({ course: course._id }), course.deleteOne()]);
}

/* ------------------------------ status moves ------------------------------ */
async function move(course, to, extra = {}) {
  if (!canMoveCourse(course.status, to)) throw ApiError.conflict(`Cannot move a ${course.status.replace('_', ' ')} course to ${to.replace('_', ' ')}`, 'BAD_TRANSITION');
  const res = await Course.findOneAndUpdate({ _id: course._id, status: course.status }, { $set: { status: to, ...extra } }, { new: true }); // compare-and-set
  if (!res) throw ApiError.conflict('Course status changed, please refresh', 'STATUS_CHANGED');
  await bust();
  return res;
}

export async function submit(user, courseId) {
  const course = await loadOwned(user, courseId);
  const me = await User.findById(user._id).select('instructor role').lean();
  if (!isAdmin(user) && !me.instructor?.approved) throw ApiError.forbidden('Your instructor account is awaiting approval', 'INSTRUCTOR_PENDING');
  const [lessons, quizzes] = await Promise.all([Lesson.find({ course: course._id }).lean(), Quiz.find({ course: course._id }).select('lesson').lean()]);
  const missing = courseReadiness(course.toObject(), lessons, new Set(quizzes.map((q) => String(q.lesson))));
  if (missing.length) throw ApiError.unprocessable('Course is not ready to submit', 'NOT_READY', missing);

  const { requireCourseApproval } = await getSettings();
  if (!requireCourseApproval || isAdmin(user)) {
    const inReview = await move(course, CS.IN_REVIEW, { submittedAt: new Date(), rejectionReason: null });
    return move(inReview, CS.PUBLISHED, { publishedAt: course.publishedAt || new Date() });
  }
  const res = await move(course, CS.IN_REVIEW, { submittedAt: new Date(), rejectionReason: null });
  emitToRole(ROLES.ADMIN, 'course:submitted', { id: res._id, title: res.title });
  return res;
}

export async function archive(user, courseId) {
  const course = await loadOwned(user, courseId);
  return move(course, CS.ARCHIVED);
}

/** Admin moderation. */
export async function review(admin, courseId, { decision, reason }) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  const link = (id) => `/instructor/courses/${id}`;
  if (decision === 'approve') {
    const res = await move(course, CS.PUBLISHED, { publishedAt: course.publishedAt || new Date(), rejectionReason: null });
    await notifyUser({ userId: course.instructor, type: NOTIFY_TYPE.COURSE_APPROVED, title: 'Your course is live', body: course.title, kind: 'updates', vars: { courseTitle: course.title, link: `/courses/${course.slug}` }, data: { courseId: course._id } });
    return res;
  }
  const res = await move(course, CS.REJECTED, { rejectionReason: reason });
  await notifyUser({ userId: course.instructor, type: NOTIFY_TYPE.COURSE_REJECTED, title: 'Course needs changes', body: reason, kind: 'updates', vars: { courseTitle: course.title, reason, link: link(course._id) }, data: { courseId: course._id } });
  return res;
}

export async function adminSetStatus(courseId, to) {
  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  return move(course, to, to === CS.PUBLISHED ? { publishedAt: course.publishedAt || new Date() } : {});
}

export async function setFeatured(courseId, featured) {
  const c = await Course.findByIdAndUpdate(courseId, { featured }, { new: true });
  if (!c) throw ApiError.notFound('Course not found');
  await bust();
  return c;
}

/* -------------------------------- sections -------------------------------- */
export async function addSection(user, courseId, { title }) {
  const course = await loadOwned(user, courseId);
  if (course.sections.length >= 50) throw ApiError.badRequest('Maximum 50 sections');
  course.sections.push({ title, order: course.sections.length });
  await course.save();
  return course.sections[course.sections.length - 1];
}
export async function updateSection(user, courseId, sectionId, { title }) {
  const course = await loadOwned(user, courseId);
  const s = course.sections.id(sectionId);
  if (!s) throw ApiError.notFound('Section not found');
  s.title = title;
  await course.save();
  return s;
}
export async function deleteSection(user, courseId, sectionId) {
  const course = await loadOwned(user, courseId);
  const s = course.sections.id(sectionId);
  if (!s) throw ApiError.notFound('Section not found');
  if (course.status === CS.PUBLISHED && (await Enrollment.exists({ course: course._id }))) {
    throw ApiError.conflict('Published courses with students cannot lose sections — archive or edit lessons instead', 'HAS_ENROLLMENTS');
  }
  const lessons = await Lesson.find({ course: course._id, section: s._id }).select('_id').lean();
  await Quiz.deleteMany({ lesson: { $in: lessons.map((l) => l._id) } });
  await Lesson.deleteMany({ course: course._id, section: s._id });
  s.deleteOne();
  course.sections.forEach((x, i) => (x.order = i));
  await course.save();
  await recalcStats(course._id);
}
export async function reorderSections(user, courseId, ids) {
  const course = await loadOwned(user, courseId);
  const current = course.sections.map((s) => String(s._id));
  if (ids.length !== current.length || !ids.every((id) => current.includes(String(id)))) throw ApiError.badRequest('Provide every section id exactly once');
  ids.forEach((id, i) => (course.sections.id(id).order = i));
  await course.save();
  return course.sections;
}

/* --------------------------------- lessons -------------------------------- */
const LESSON_FIELDS = ['title', 'type', 'videoUrl', 'durationSec', 'content', 'resources', 'isPreview'];

export async function addLesson(user, courseId, sectionId, body) {
  const course = await loadOwned(user, courseId);
  if (!course.sections.id(sectionId)) throw ApiError.notFound('Section not found');
  const count = await Lesson.countDocuments({ course: course._id, section: sectionId });
  if (count >= 200) throw ApiError.badRequest('Maximum 200 lessons per section');
  const lesson = await Lesson.create({ ...body, course: course._id, section: sectionId, order: count });
  await recalcStats(course._id);
  if (course.status === CS.PUBLISHED) await bust();
  return lesson;
}

export async function loadLesson(user, lessonId) {
  if (!mongoose.isValidObjectId(lessonId)) throw ApiError.notFound('Lesson not found');
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw ApiError.notFound('Lesson not found');
  const course = await loadOwned(user, lesson.course);
  return { lesson, course };
}

export async function updateLesson(user, lessonId, body) {
  const { lesson, course } = await loadLesson(user, lessonId);
  if (body.section && String(body.section) !== String(lesson.section)) {
    if (!course.sections.id(body.section)) throw ApiError.badRequest('Unknown section');
    lesson.section = body.section;
    lesson.order = await Lesson.countDocuments({ course: course._id, section: body.section });
  }
  if (body.type && body.type !== lesson.type && lesson.type === 'quiz') await Quiz.deleteOne({ lesson: lesson._id });
  for (const k of LESSON_FIELDS) if (body[k] !== undefined) lesson.set(k, body[k]);
  await lesson.save();
  await recalcStats(course._id);
  if (course.status === CS.PUBLISHED) await bust();
  return lesson;
}

export async function deleteLesson(user, lessonId) {
  const { lesson, course } = await loadLesson(user, lessonId);
  await Promise.all([Quiz.deleteOne({ lesson: lesson._id }), lesson.deleteOne()]);
  await recalcStats(course._id);
  if (course.status === CS.PUBLISHED) await bust();
}

export async function reorderLessons(user, courseId, sectionId, ids) {
  const course = await loadOwned(user, courseId);
  const lessons = await Lesson.find({ course: course._id, section: sectionId }).select('_id').lean();
  const current = lessons.map((l) => String(l._id));
  if (ids.length !== current.length || !ids.every((id) => current.includes(String(id)))) throw ApiError.badRequest('Provide every lesson id of the section exactly once');
  await Lesson.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: i } } } })));
}

/* ---------------------------------- quiz ---------------------------------- */
export async function getQuizForEdit(user, lessonId) {
  const { lesson } = await loadLesson(user, lessonId);
  if (lesson.type !== 'quiz') throw ApiError.badRequest('This is not a quiz lesson');
  return (await Quiz.findOne({ lesson: lesson._id }).lean()) || { lesson: lesson._id, passPercent: 60, maxAttempts: 0, shuffle: true, questions: [] };
}

export async function upsertQuiz(user, lessonId, body) {
  const { lesson, course } = await loadLesson(user, lessonId);
  if (lesson.type !== 'quiz') throw ApiError.badRequest('Change the lesson type to "quiz" first');
  const err = validateQuestions(body.questions);
  if (err) throw ApiError.unprocessable(err, 'INVALID_QUIZ');
  const quiz = await Quiz.findOneAndUpdate(
    { lesson: lesson._id },
    { $set: { course: course._id, passPercent: body.passPercent, maxAttempts: body.maxAttempts, shuffle: body.shuffle, questions: body.questions } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return quiz;
}
