import { Notification } from '../models/Notification.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { User } from '../models/User.js';
import { enqueue, QUEUES } from '../jobs/queues.js';
import { emitToUser } from '../sockets/index.js';
import { cursorPaginate } from '../utils/pagination.js';
import { logger } from '../utils/logger.js';

/** Which preference flag governs each kind of message. */
const PREF_KEY = { updates: 'emailUpdates', nudge: 'emailNudges', qa: 'emailQa' };

/**
 * Notify a user: in-app notification + realtime push (always), plus an OPTIONAL email
 * when the user's preference allows it (an explicit `email: true|false` overrides the preference).
 * opts: { userId|user, type, title, body, data, kind, email?, vars, ref }
 */
export async function notifyUser(opts) {
  const { type, title, body, data, kind = 'updates', vars = {}, ref } = opts;
  try {
    const user = opts.user || (await User.findById(opts.userId).lean());
    if (!user) return null;

    const notif = await Notification.create({ user: user._id, type, title, body, data });
    emitToUser(user._id, 'notification:new', notif.toJSON());

    const wantEmail = Boolean(user.email) && (typeof opts.email === 'boolean' ? opts.email : Boolean(user.prefs?.[PREF_KEY[kind]]));
    if (wantEmail) {
      const log = await NotificationLog.create({ user: user._id, channel: 'email', type, to: user.email, ref, status: 'queued' });
      await enqueue(QUEUES.NOTIFY, 'deliver', { logId: String(log._id), channel: 'email', to: user.email, type, vars: { name: user.name, title, body, ...vars } });
    }
    return { notification: notif, email: wantEmail };
  } catch (e) {
    // notifications must never break the business flow
    logger.error({ err: e.message, type }, 'notifyUser failed');
    return null;
  }
}

export async function listNotifications(userId, { cursor, limit = 20 } = {}) {
  const res = await cursorPaginate(Notification, { user: userId }, { cursor, limit });
  const unread = await Notification.countDocuments({ user: userId, readAt: { $exists: false } });
  return { ...res, unread };
}
export const markRead = (userId, id) =>
  id === 'all'
    ? Notification.updateMany({ user: userId, readAt: { $exists: false } }, { readAt: new Date() })
    : Notification.updateOne({ _id: id, user: userId }, { readAt: new Date() });
