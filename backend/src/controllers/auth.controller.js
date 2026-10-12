import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as auth from '../services/auth.service.js';
import { env, features } from '../config/env.js';
import * as social from '../services/social.service.js';
import * as tokens from '../services/token.service.js';

const meta = (req) => ({ userAgent: req.headers['user-agent'], ip: req.ip });
const respond = (res, { user, accessToken, refreshToken }, status = 200, message = 'OK') => {
  tokens.setRefreshCookie(res, refreshToken);
  const body = { user, accessToken };
  return status === 201 ? created(res, body, message) : ok(res, body, message);
};

export const register = asyncHandler(async (req, res) => respond(res, await auth.register(req.body, meta(req)), 201, 'Account created'));
export const login = asyncHandler(async (req, res) => respond(res, await auth.login(req.body, meta(req)), 200, 'Logged in'));

export const refresh = asyncHandler(async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await tokens.rotateRefreshToken(req.cookies?.[tokens.REFRESH_COOKIE], meta(req));
    tokens.setRefreshCookie(res, refreshToken);
    return ok(res, { user, accessToken });
  } catch (e) {
    tokens.clearRefreshCookie(res);
    throw e;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await tokens.revokeRefreshToken(req.cookies?.[tokens.REFRESH_COOKIE]);
  tokens.clearRefreshCookie(res);
  return noContent(res);
});

export const me = asyncHandler(async (req, res) => ok(res, req.user));

export const forgotPassword = asyncHandler(async (req, res) => {
  await auth.forgotPassword(req.body);
  return ok(res, null, 'If that email has an account, a reset link is on its way');
});
export const resetPassword = asyncHandler(async (req, res) => respond(res, await auth.resetPassword(req.body, meta(req)), 200, 'Password updated'));

/** Which social providers are configured (the Google client id is public). */
export const providers = asyncHandler(async (_req, res) =>
  ok(res, { google: features.google ? env.GOOGLE_CLIENT_ID : null, linkedin: features.linkedin }),
);
export const googleLogin = asyncHandler(async (req, res) =>
  respond(res, await auth.socialLogin(await social.verifyGoogle(req.body.credential), meta(req)), 200, 'Logged in'),
);

const STATE_COOKIE = 'ls_oauth';
const stateCookie = () => ({ httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE, path: '/api/v1/auth/linkedin', maxAge: 10 * 60_000 });
export const linkedinStart = asyncHandler(async (_req, res) => {
  const state = social.newState();
  res.cookie(STATE_COOKIE, state, stateCookie());
  res.redirect(social.linkedinAuthUrl(state));
});
/** Browser lands here after LinkedIn; we set the refresh cookie and bounce to the SPA, which calls /auth/refresh. */
export const linkedinCallback = asyncHandler(async (req, res) => {
  const fail = (code) => res.redirect(`${env.CLIENT_URL}/login?error=${code}`);
  const expected = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, stateCookie());
  if (req.query.error || !req.query.code) return fail('social_cancelled');
  if (!expected || expected !== req.query.state) return fail('social_failed');
  try {
    const { refreshToken } = await auth.socialLogin(await social.exchangeLinkedin(String(req.query.code)), meta(req));
    tokens.setRefreshCookie(res, refreshToken);
    return res.redirect(`${env.CLIENT_URL}/auth/callback`);
  } catch (e) {
    return fail(e.code === 'ACCOUNT_INACTIVE' ? 'account_inactive' : 'social_failed');
  }
});
