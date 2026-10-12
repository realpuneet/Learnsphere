import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';
import { env, isProd } from '../config/env.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { sendEmail } from '../integrations/email.js';
import { renderPasswordReset } from '../integrations/templates.js';
import { emitToUser } from '../sockets/index.js';
import { logger } from '../utils/logger.js';
import { randomToken, sha256 } from '../utils/helpers.js';
import { findOrCreateSocialUser } from './social.service.js';
import { getSettings } from './settings.service.js';
import { signAccessToken, issueRefreshToken, revokeAllForUser } from './token.service.js';

const ROUNDS = 10;
export const hashPassword = (p) => bcrypt.hash(p, ROUNDS);

async function session(user, meta) {
  user.lastLoginAt = new Date();
  await user.save();
  return { user, accessToken: signAccessToken(user), refreshToken: await issueRefreshToken(user, meta) };
}

/** Public sign-up creates students, or instructors-pending-approval when `asInstructor` is set. */
export async function register({ name, email, password, asInstructor }, meta) {
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists', 'ACCOUNT_EXISTS');
  if (asInstructor && !(await getSettings()).allowInstructorSignup) throw ApiError.forbidden('Instructor sign-ups are closed', 'INSTRUCTOR_SIGNUP_CLOSED');
  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: asInstructor ? ROLES.INSTRUCTOR : ROLES.STUDENT,
    instructor: asInstructor ? { approved: false, appliedAt: new Date() } : undefined,
  });
  return session(user, meta);
}

export async function login({ email, password }, meta) {
  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');
  const ok = user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw ApiError.unauthorized('Incorrect email or password', 'BAD_CREDENTIALS');
  if (!user.isActive) throw ApiError.forbidden('Account is disabled', 'ACCOUNT_INACTIVE');
  return session(user, meta);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  // social-only accounts have no password yet – let them set one without a current password
  if (user.passwordHash && !(await bcrypt.compare(currentPassword || '', user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect', 'BAD_PASSWORD');
  }
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await revokeAllForUser(user._id);
  emitToUser(user._id, 'auth:password-changed', {});
}

export async function socialLogin(profile, meta) {
  return session(await findOrCreateSocialUser(profile), meta);
}

export async function forgotPassword({ email }) {
  const user = await User.findOne({ email, isActive: true });
  if (!user) return; // same response either way – never reveal which emails exist
  const raw = randomToken(32);
  await PasswordReset.updateMany({ user: user._id, usedAt: { $exists: false } }, { usedAt: new Date() }); // only the newest link works
  await PasswordReset.create({ user: user._id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + env.RESET_TOKEN_TTL_MIN * 60_000) });
  const url = `${env.CLIENT_URL}/reset-password?token=${raw}`;
  try {
    const r = await sendEmail({ to: user.email, ...renderPasswordReset({ name: user.name, url, minutes: env.RESET_TOKEN_TTL_MIN }) });
    if (r.status === 'dry_run' && !isProd) logger.info({ to: user.email, url }, '[password-reset:dry-run] open this link to reset');
  } catch (e) {
    logger.error({ err: e.message }, 'password reset email failed');
  }
}

export async function resetPassword({ token, password }, meta) {
  const doc = await PasswordReset.findOneAndUpdate(
    { tokenHash: sha256(token), usedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { usedAt: new Date() },
  ); // single-use, compare-and-set
  const user = doc && (await User.findById(doc.user));
  if (!user || !user.isActive) throw ApiError.badRequest('This reset link is invalid or has expired', 'RESET_INVALID');
  user.passwordHash = await hashPassword(password);
  user.emailVerified = true; // they proved control of the mailbox
  await user.save();
  await revokeAllForUser(user._id);
  emitToUser(user._id, 'auth:password-changed', {});
  return session(user, meta);
}
