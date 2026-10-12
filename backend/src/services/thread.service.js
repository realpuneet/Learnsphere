import mongoose from 'mongoose';
import { Thread } from '../models/Thread.js';
import { Lesson } from '../models/Lesson.js';
import { Course } from '../models/Course.js';
import { ApiError } from '../utils/ApiError.js';
import { NOTIFY_TYPE as T, ROLES } from '../utils/constants.js';
import { cursorPaginate } from '../utils/pagination.js';
import { emitToCourse } from '../sockets/index.js';
import { notifyUser } from './notification.service.js';
import { getEnrollment } from './enrollment.service.js';

async function access(user, courseId) {
  if (!mongoose.isValidObjectId(courseId)) throw ApiError.notFound('Course not found');
  const course = await Course.findById(courseId).select('title instructor').lean();
  if (!course) throw ApiError.notFound('Course not found');
  const isInstructor = user.role === ROLES.ADMIN || String(course.instructor) === String(user._id);
  if (!isInstructor && !(await getEnrollment(user._id, courseId))) throw ApiError.forbidden('Enrol to join the discussion', 'NOT_ENROLLED');
  return { course, isInstructor };
}

export async function list(user, courseId, { lesson, resolved, mine, cursor, limit }) {
  await access(user, courseId);
  const filter = { course: courseId };
  if (lesson && mongoose.isValidObjectId(lesson)) filter.lesson = lesson;
  if (resolved === 'true' || resolved === 'false') filter.resolved = resolved === 'true';
  if (mine === 'true') filter.author = user._id;
  const r = await cursorPaginate(Thread, filter, { cursor, limit, populate: [{ path: 'author', select: 'name avatar role' }, { path: 'answers.author', select: 'name avatar role' }] });
  return r;
}

export async function create(user, courseId, { lesson, title, body }) {
  const { course } = await access(user, courseId);
  if (lesson && !(await Lesson.exists({ _id: lesson, course: courseId }))) throw ApiError.badRequest('Unknown lesson');
  const t = await Thread.create({ course: courseId, lesson, author: user._id, title, body });
  emitToCourse(courseId, 'thread:new', { id: t._id, lesson });
  if (String(course.instructor) !== String(user._id)) {
    await notifyUser({ userId: course.instructor, type: T.NEW_QUESTION, title: `New question in ${course.title}`, body: title, kind: 'qa', data: { courseId, threadId: t._id }, vars: { courseTitle: course.title, title, body, link: `/instructor/courses/${courseId}/qa` } });
  }
  return t;
}

export async function answer(user, threadId, body) {
  const thread = await Thread.findById(threadId);
  if (!thread) throw ApiError.notFound('Question not found');
  const { course, isInstructor } = await access(user, thread.course);
  thread.answers.push({ author: user._id, body, isInstructor });
  thread.lastActivityAt = new Date();
  if (isInstructor) thread.resolved = true;
  await thread.save();
  emitToCourse(thread.course, 'thread:updated', { id: thread._id });
  if (String(thread.author) !== String(user._id)) {
    await notifyUser({ userId: thread.author, type: T.NEW_ANSWER, title: `New answer: ${thread.title}`, body, kind: 'qa', data: { courseId: thread.course, threadId }, vars: { title: thread.title, body, link: `/learn/${course._id}` } });
  }
  return thread;
}

export async function setResolved(user, threadId, resolved) {
  const thread = await Thread.findById(threadId);
  if (!thread) throw ApiError.notFound('Question not found');
  const { isInstructor } = await access(user, thread.course);
  if (!isInstructor && String(thread.author) !== String(user._id)) throw ApiError.forbidden('Only the author or instructor can do that');
  thread.resolved = resolved;
  await thread.save();
  emitToCourse(thread.course, 'thread:updated', { id: thread._id });
  return thread;
}

export async function remove(user, threadId) {
  const thread = await Thread.findById(threadId);
  if (!thread) throw ApiError.notFound('Question not found');
  const { isInstructor } = await access(user, thread.course);
  if (!isInstructor && String(thread.author) !== String(user._id)) throw ApiError.forbidden('Not allowed');
  await thread.deleteOne();
}

/** Instructor / admin inbox across their courses. */
export async function inbox(user, { unanswered, cursor, limit }) {
  const courseFilter = user.role === ROLES.ADMIN ? {} : { instructor: user._id };
  const ids = (await Course.find(courseFilter).select('_id').lean()).map((c) => c._id);
  const filter = { course: { $in: ids } };
  if (unanswered === 'true') Object.assign(filter, { 'answers.0': { $exists: false } });
  return cursorPaginate(Thread, filter, { cursor, limit, populate: [{ path: 'author', select: 'name avatar' }, { path: 'course', select: 'title slug' }] });
}
