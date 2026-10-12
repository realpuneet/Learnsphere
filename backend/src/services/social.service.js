import crypto from 'crypto';
import { env, features } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';

const LINKEDIN_SCOPE = 'openid profile email';

async function json(res, what) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw ApiError.unauthorized(`${what} sign-in failed`, 'SOCIAL_FAILED');
  return body;
}

/** Verifies a Google Identity Services ID token (credential) and returns the verified profile. */
export async function verifyGoogle(credential) {
  if (!features.google) throw ApiError.badRequest('Google sign-in is not configured', 'SOCIAL_DISABLED');
  const info = await json(await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`), 'Google');
  if (info.aud !== env.GOOGLE_CLIENT_ID) throw ApiError.unauthorized('Google token was issued for another app', 'SOCIAL_FAILED');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(info.iss)) throw ApiError.unauthorized('Invalid Google token', 'SOCIAL_FAILED');
  if (String(info.email_verified) !== 'true') throw ApiError.unauthorized('Your Google email is not verified', 'SOCIAL_FAILED');
  return { provider: 'google', subject: info.sub, email: info.email, name: info.name || info.email.split('@')[0], avatar: info.picture };
}

export function linkedinAuthUrl(state) {
  if (!features.linkedin) throw ApiError.badRequest('LinkedIn sign-in is not configured', 'SOCIAL_DISABLED');
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: env.LINKEDIN_CLIENT_ID,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    state,
    scope: LINKEDIN_SCOPE,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${q}`;
}

/** Exchanges the authorization code (OpenID Connect) and returns the verified profile. */
export async function exchangeLinkedin(code) {
  const token = await json(
    await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.LINKEDIN_REDIRECT_URI,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
      }),
    }),
    'LinkedIn',
  );
  const p = await json(await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } }), 'LinkedIn');
  if (!p.email || p.email_verified === false) throw ApiError.unauthorized('Your LinkedIn email is not verified', 'SOCIAL_FAILED');
  return { provider: 'linkedin', subject: p.sub, email: p.email, name: p.name || p.email.split('@')[0], avatar: p.picture };
}

export const newState = () => crypto.randomBytes(16).toString('hex');

/** Finds the user for a verified social identity, linking by email or creating a student. */
export async function findOrCreateSocialUser({ provider, subject, email, name, avatar }) {
  const idField = provider === 'google' ? 'googleId' : 'linkedinId';
  email = String(email).trim().toLowerCase();
  let user = await User.findOne({ [idField]: subject });
  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user[idField] = subject; // provider vouches for the email, so link to the existing account
      user.emailVerified = true;
      if (!user.avatar && avatar) user.avatar = avatar;
    } else {
      user = new User({ name: name.slice(0, 80), email, role: ROLES.STUDENT, avatar: avatar || null, emailVerified: true, [idField]: subject });
    }
  }
  if (!user.isActive) throw ApiError.forbidden('Account is disabled', 'ACCOUNT_INACTIVE');
  return user;
}
