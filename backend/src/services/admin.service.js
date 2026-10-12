import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Category } from '../models/Category.js';
import { Payment } from '../models/Payment.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { Enrollment } from '../models/Enrollment.js';
import { ApiError } from '../utils/ApiError.js';
import { NOTIFY_TYPE as T, ROLES } from '../utils/constants.js';
import { escapeRegex, slugify } from '../utils/helpers.js';
import { invalidateNamespace } from '../utils/cache.js';
import { pageMeta, pageParams } from '../utils/pagination.js';
import { hashPassword } from './auth.service.js';
import { notifyUser } from './notification.service.js';
import { revokeAllForUser } from './token.service.js';

export async function listUsers(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.pending === 'true') Object.assign(filter, { role: ROLES.INSTRUCTOR, 'instructor.approved': false });
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (query.isActive === 'true' || query.isActive === 'false') filter.isActive = query.isActive === 'true';
  const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), User.countDocuments(filter)]);
  return { items, meta: pageMeta(total, page, limit) };
}

export async function createUser({ name, email, password, role }) {
  if (await User.exists({ email })) throw ApiError.conflict('Email already in use', 'ACCOUNT_EXISTS');
  return User.create({ name, email, role, passwordHash: await hashPassword(password), instructor: role === ROLES.INSTRUCTOR ? { approved: true, approvedAt: new Date() } : undefined });
}

export async function setUserActive(adminId, id, isActive) {
  if (String(adminId) === String(id) && !isActive) throw ApiError.badRequest('You cannot deactivate yourself');
  const u = await User.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!u) throw ApiError.notFound('User not found');
  if (!isActive) await revokeAllForUser(u._id);
  return u;
}

export async function approveInstructor(id, approved) {
  const u = await User.findOneAndUpdate({ _id: id, role: ROLES.INSTRUCTOR }, { $set: { 'instructor.approved': approved, 'instructor.approvedAt': approved ? new Date() : null } }, { new: true });
  if (!u) throw ApiError.notFound('Instructor not found');
  if (approved) await notifyUser({ user: u, type: T.INSTRUCTOR_APPROVED, title: 'Instructor account approved', body: 'You can now submit courses for review.', kind: 'updates', vars: { link: '/instructor/courses' } });
  return u;
}

export async function listCourses(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) filter.title = new RegExp(escapeRegex(query.q), 'i');
  const [items, total] = await Promise.all([
    Course.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('instructor', 'name email').populate('category', 'name').lean(),
    Course.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

/* ------------------------------- categories ------------------------------- */
export const listAllCategories = () => Category.find().sort({ sortOrder: 1, name: 1 }).lean();
export async function createCategory(data) {
  try {
    const c = await Category.create({ ...data, slug: slugify(data.name) });
    await invalidateNamespace('catalog');
    return c;
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Category already exists', 'DUPLICATE');
    throw e;
  }
}
export async function updateCategory(id, data) {
  const patch = { ...data };
  if (data.name) patch.slug = slugify(data.name);
  const c = await Category.findByIdAndUpdate(id, patch, { new: true });
  if (!c) throw ApiError.notFound('Category not found');
  await invalidateNamespace('catalog');
  return c;
}
export async function deleteCategory(id) {
  if (await Course.exists({ category: id })) throw ApiError.conflict('Courses use this category – hide it instead', 'IN_USE');
  await Category.deleteOne({ _id: id });
  await invalidateNamespace('catalog');
}

/* ----------------------------------- logs ----------------------------------- */
export async function listPayments(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email').lean(),
    Payment.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

export async function notificationLogs(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    NotificationLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name').lean(),
    NotificationLog.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

export async function listEnrollments(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.course) filter.course = query.course;
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    Enrollment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email').populate('course', 'title slug').lean(),
    Enrollment.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}
