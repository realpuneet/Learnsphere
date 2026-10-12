import { z } from 'zod';
import { emptyToUndef, httpUrl, phone, cursorQuery } from './common.js';

const url = z.string().trim().max(300);
export const updateProfile = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: emptyToUndef(phone),
    avatar: httpUrl.nullable(),
    headline: z.string().trim().max(120),
    bio: z.string().trim().max(2000),
    links: z.object({ website: url.optional(), linkedin: url.optional(), github: url.optional(), twitter: url.optional() }),
  })
  .partial();
export const prefs = z.object({ emailUpdates: z.boolean(), emailNudges: z.boolean(), emailQa: z.boolean() }).partial();
export const notificationList = cursorQuery;
