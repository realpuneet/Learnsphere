import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import * as catalog from '../services/catalog.service.js';
import * as settings from '../services/settings.service.js';
import * as certs from '../services/certificate.service.js';
import * as users from '../services/user.service.js';

export const settingsPublic = asyncHandler(async (_req, res) => ok(res, await settings.publicSettings()));
export const categories = asyncHandler(async (_req, res) => ok(res, await catalog.listCategories()));
export const home = asyncHandler(async (_req, res) => ok(res, await catalog.homeFeed()));
export const courses = asyncHandler(async (req, res) => {
  const r = await catalog.listCourses(req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const course = asyncHandler(async (req, res) => ok(res, await catalog.getCourseBySlug(req.params.slug, req.user)));
export const related = asyncHandler(async (req, res) => ok(res, await catalog.relatedCourses(req.params.slug)));
export const reviews = asyncHandler(async (req, res) => {
  const r = await catalog.listReviews(req.params.id, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore });
});
export const instructor = asyncHandler(async (req, res) => {
  const [profile, list] = await Promise.all([users.publicInstructor(req.params.id), catalog.publicInstructorCourses(req.params.id, req.query)]);
  return ok(res, { instructor: profile, courses: list.items }, 'OK', list.meta);
});
export const verifyCertificate = asyncHandler(async (req, res) => ok(res, await certs.verify(req.params.code)));
