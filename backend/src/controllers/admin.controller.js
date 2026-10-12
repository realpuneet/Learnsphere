import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as admin from '../services/admin.service.js';
import * as courses from '../services/course.service.js';
import * as enroll from '../services/enrollment.service.js';
import { adminDashboard } from '../services/analytics.service.js';
import { getSettings, updateSettings } from '../services/settings.service.js';
import { getImageKit } from '../config/imagekit.js';
import { ApiError } from '../utils/ApiError.js';
import { Enrollment } from '../models/Enrollment.js';

const page = (res, r) => ok(res, r.items, 'OK', r.meta);

export const dashboard = asyncHandler(async (_req, res) => ok(res, await adminDashboard()));
export const users = asyncHandler(async (req, res) => page(res, await admin.listUsers(req.query)));
export const createUser = asyncHandler(async (req, res) => created(res, await admin.createUser(req.body), 'Account created'));
export const setActive = asyncHandler(async (req, res) => ok(res, await admin.setUserActive(req.user._id, req.params.id, req.body.isActive)));
export const approveInstructor = asyncHandler(async (req, res) => ok(res, await admin.approveInstructor(req.params.id, req.body.approved)));

export const courseList = asyncHandler(async (req, res) => page(res, await admin.listCourses(req.query)));
export const courseReview = asyncHandler(async (req, res) => ok(res, await courses.review(req.user, req.params.id, req.body), 'Decision saved'));
export const courseStatus = asyncHandler(async (req, res) => ok(res, await courses.adminSetStatus(req.params.id, req.body.status)));
export const courseFeature = asyncHandler(async (req, res) => ok(res, await courses.setFeatured(req.params.id, req.body.featured)));

export const categoryList = asyncHandler(async (_req, res) => ok(res, await admin.listAllCategories()));
export const categoryCreate = asyncHandler(async (req, res) => created(res, await admin.createCategory(req.body)));
export const categoryUpdate = asyncHandler(async (req, res) => ok(res, await admin.updateCategory(req.params.id, req.body)));
export const categoryDelete = asyncHandler(async (req, res) => {
  await admin.deleteCategory(req.params.id);
  return noContent(res);
});

export const payments = asyncHandler(async (req, res) => page(res, await admin.listPayments(req.query)));
export const logs = asyncHandler(async (req, res) => page(res, await admin.notificationLogs(req.query)));
export const enrollments = asyncHandler(async (req, res) => page(res, await admin.listEnrollments(req.query)));
export const grant = asyncHandler(async (req, res) => created(res, await enroll.adminGrant(req.user, req.body), 'Access granted'));
export const revoke = asyncHandler(async (req, res) => ok(res, await enroll.adminRevoke(req.params.id), 'Access revoked'));
export const refund = asyncHandler(async (req, res) => {
  const enr = await Enrollment.findById(req.params.id);
  if (!enr) throw ApiError.notFound('Enrolment not found');
  if (!enr.payment || !enr.amountPaid) throw ApiError.badRequest('Nothing to refund', 'NOT_REFUNDABLE');
  return ok(res, await enroll.refundEnrollment(enr, 'Refunded by admin'), 'Refund initiated');
});

export const settingsGet = asyncHandler(async (_req, res) => ok(res, await getSettings()));
export const settingsUpdate = asyncHandler(async (req, res) => ok(res, await updateSettings(req.body), 'Settings saved'));

/** ImageKit signed upload parameters for direct browser uploads (thumbnails, avatars, lesson files). */
export const uploadAuth = asyncHandler(async (req, res) => {
  const ik = getImageKit();
  if (!ik) throw new ApiError(503, 'Uploads are not configured', 'UPLOADS_DISABLED');
  return ok(res, { ...ik.getAuthenticationParameters(), publicKey: process.env.IMAGEKIT_PUBLIC_KEY, urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT, folder: `/learnsphere/${req.user.role}` });
});
