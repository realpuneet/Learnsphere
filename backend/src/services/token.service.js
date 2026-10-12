import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env, isProd } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { sha256, randomToken } from '../utils/helpers.js';

export const REFRESH_COOKIE = 'ls_rt';

export const signAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TTL });

export async function issueRefreshToken(user, { family, userAgent, ip } = {}) {
  const raw = randomToken(40);
  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(raw),
    family: family || crypto.randomUUID(),
    userAgent: userAgent?.slice(0, 200),
    ip,
    expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86400_000),
  });
  return raw;
}

/**
 * Rotating refresh tokens with reuse detection: presenting an already-rotated token revokes the whole family
 * (the token was stolen or replayed).
 */
export async function rotateRefreshToken(raw, meta = {}) {
  if (!raw) throw ApiError.unauthorized('Session expired', 'NO_REFRESH');
  const doc = await RefreshToken.findOne({ tokenHash: sha256(raw) });
  if (!doc) throw ApiError.unauthorized('Session expired', 'REFRESH_INVALID');
  if (doc.revokedAt) {
    await RefreshToken.updateMany({ family: doc.family, revokedAt: { $exists: false } }, { revokedAt: new Date() });
    throw ApiError.unauthorized('Session revoked, please login again', 'REFRESH_REUSED');
  }
  if (doc.expiresAt < new Date()) throw ApiError.unauthorized('Session expired', 'REFRESH_EXPIRED');

  // compare-and-set so two concurrent refreshes cannot both succeed
  const claimed = await RefreshToken.findOneAndUpdate({ _id: doc._id, revokedAt: { $exists: false } }, { revokedAt: new Date() });
  if (!claimed) throw ApiError.unauthorized('Session revoked, please login again', 'REFRESH_REUSED');

  const user = await User.findById(doc.user);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account unavailable', 'ACCOUNT_INACTIVE');
  const next = await issueRefreshToken(user, { family: doc.family, ...meta });
  await RefreshToken.updateOne({ _id: doc._id }, { replacedBy: sha256(next) });
  return { user, accessToken: signAccessToken(user), refreshToken: next };
}

export async function revokeRefreshToken(raw) {
  if (!raw) return;
  const doc = await RefreshToken.findOne({ tokenHash: sha256(raw) });
  if (doc) await RefreshToken.updateMany({ family: doc.family, revokedAt: { $exists: false } }, { revokedAt: new Date() });
}
export const revokeAllForUser = (userId) =>
  RefreshToken.updateMany({ user: userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });

const cookieBase = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE || isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/api/v1/auth',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});
export const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, { ...cookieBase(), maxAge: env.REFRESH_TTL_DAYS * 86400_000 });
export const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, cookieBase());
