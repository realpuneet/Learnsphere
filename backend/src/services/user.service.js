import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeLinks } from '../utils/links.js';

export async function updateProfile(userId, data) {
  const patch = { ...data };
  if (patch.links) patch.links = normalizeLinks(patch.links);
  try {
    return await User.findByIdAndUpdate(userId, { $set: patch }, { new: true, runValidators: true });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Phone already in use', 'DUPLICATE');
    throw e;
  }
}

export async function updatePrefs(userId, prefs) {
  const set = Object.fromEntries(Object.entries(prefs).map(([k, v]) => [`prefs.${k}`, v]));
  return User.findByIdAndUpdate(userId, { $set: set }, { new: true });
}

/** Public instructor card (no email / phone). */
export async function publicInstructor(id) {
  const u = await User.findOne({ _id: id, role: 'instructor', isActive: true }).select('name avatar headline bio links createdAt').lean();
  if (!u) throw ApiError.notFound('Instructor not found');
  return u;
}
