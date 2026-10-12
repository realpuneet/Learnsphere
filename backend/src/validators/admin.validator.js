import { z } from 'zod';
import { COURSE_STATUS_LIST, ROLE_LIST } from '../utils/constants.js';
import { objectId, pageQuery } from './common.js';
import { password } from './auth.validator.js';

export const userList = pageQuery.and(z.object({ role: z.enum(ROLE_LIST).optional(), q: z.string().max(60).optional(), isActive: z.enum(['true', 'false']).optional(), pending: z.enum(['true', 'false']).optional() }));
export const createUser = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), password, role: z.enum(['instructor', 'admin', 'student']) });
export const setActive = z.object({ isActive: z.boolean() });
export const approve = z.object({ approved: z.boolean() });
export const courseList = pageQuery.and(z.object({ status: z.enum(COURSE_STATUS_LIST).optional(), q: z.string().max(60).optional() }));
export const setStatus = z.object({ status: z.enum(COURSE_STATUS_LIST) });
export const setFeatured = z.object({ featured: z.boolean() });
export const category = z.object({ name: z.string().trim().min(2).max(60), description: z.string().trim().max(300).optional(), icon: z.string().trim().max(40).optional(), sortOrder: z.coerce.number().int().optional(), isActive: z.boolean().optional() });
export const categoryUpdate = category.partial();
export const paymentList = pageQuery.and(z.object({ status: z.enum(['created', 'paid', 'failed', 'refunded']).optional() }));
export const logList = pageQuery.and(z.object({ status: z.enum(['queued', 'sent', 'failed', 'dry_run']).optional() }));
export const enrollmentList = pageQuery.and(z.object({ course: objectId.optional(), status: z.enum(['active', 'completed', 'refunded', 'revoked']).optional() }));
export const grant = z.object({ email: z.string().trim().toLowerCase().email(), courseId: objectId });
export const settings = z
  .object({
    siteName: z.string().max(60),
    tagline: z.string().max(160),
    supportEmail: z.string().max(120),
    platformFeePercent: z.coerce.number().min(0).max(90),
    gstPercent: z.coerce.number().min(0).max(40),
    refundWindowDays: z.coerce.number().int().min(0).max(90),
    refundMaxProgress: z.coerce.number().int().min(0).max(100),
    requireCourseApproval: z.boolean(),
    allowInstructorSignup: z.boolean(),
  })
  .partial();
export const couponBody = z.object({
  code: z.string().trim().min(3).max(24).regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'),
  type: z.enum(['percent', 'flat']),
  value: z.coerce.number().min(1).max(100000),
  maxDiscount: z.coerce.number().min(0).optional(),
  course: objectId.optional(),
  maxUses: z.coerce.number().int().min(0).default(0),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});
export const couponUpdate = couponBody.omit({ code: true }).partial();
