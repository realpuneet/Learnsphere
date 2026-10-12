import { asyncHandler } from '../utils/asyncHandler.js';
import { noContent, ok } from '../utils/ApiResponse.js';
import * as users from '../services/user.service.js';
import * as auth from '../services/auth.service.js';
import * as notif from '../services/notification.service.js';
import * as certs from '../services/certificate.service.js';
import * as enroll from '../services/enrollment.service.js';

export const updateProfile = asyncHandler(async (req, res) => ok(res, await users.updateProfile(req.user._id, req.body), 'Profile updated'));
export const updatePrefs = asyncHandler(async (req, res) => ok(res, await users.updatePrefs(req.user._id, req.body), 'Preferences saved'));
export const changePassword = asyncHandler(async (req, res) => {
  await auth.changePassword(req.user._id, req.body);
  return ok(res, null, 'Password changed, please login again');
});
export const notifications = asyncHandler(async (req, res) => {
  const r = await notif.listNotifications(req.user._id, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore, unread: r.unread });
});
export const markRead = asyncHandler(async (req, res) => {
  await notif.markRead(req.user._id, req.params.id);
  return noContent(res);
});
export const learning = asyncHandler(async (req, res) => {
  const r = await enroll.myLearning(req.user, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore });
});
export const certificates = asyncHandler(async (req, res) => ok(res, await certs.listMine(req.user._id)));
export const certificate = asyncHandler(async (req, res) => ok(res, await certs.getMine(req.user._id, req.params.id)));
