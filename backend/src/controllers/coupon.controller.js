import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as coupons from '../services/coupon.service.js';

export const list = asyncHandler(async (req, res) => ok(res, await coupons.list(req.user, req.query)));
export const create = asyncHandler(async (req, res) => created(res, await coupons.create(req.user, req.body)));
export const update = asyncHandler(async (req, res) => ok(res, await coupons.update(req.user, req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => {
  await coupons.remove(req.user, req.params.id);
  return noContent(res);
});
