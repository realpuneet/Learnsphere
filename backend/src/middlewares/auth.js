import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/User.js';

function readToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function loadUser(req) {
  const token = readToken(req);
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token', 'TOKEN_INVALID');
  }
  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || !user.isActive) throw ApiError.unauthorized('Account unavailable', 'ACCOUNT_INACTIVE');
  return user;
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await loadUser(req);
  if (!user) throw ApiError.unauthorized('Login required');
  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    req.user = (await loadUser(req)) || undefined;
  } catch {
    req.user = undefined;
  }
  next();
});

export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Login required'));
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('You do not have access to this resource'));
    next();
  };
