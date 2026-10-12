import { z } from 'zod';
import { objectId, cursorQuery } from './common.js';

export const courseParam = z.object({ courseId: objectId });
export const lessonParams = z.object({ courseId: objectId, lessonId: objectId });
export const coupon = z.object({ coupon: z.string().trim().max(30).optional() });
export const complete = z.object({ done: z.boolean().default(true) });
export const position = z.object({ lessonId: objectId, sec: z.coerce.number().min(0).max(86400) });
export const attempt = z.object({ answers: z.array(z.object({ question: objectId, selected: z.array(objectId).max(8) })).max(100) });
export const reviewBody = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() });
export const replyBody = z.object({ body: z.string().trim().min(1).max(1000) });
export const myLearning = cursorQuery;
export const threadList = cursorQuery.and(z.object({ lesson: objectId.optional(), resolved: z.enum(['true', 'false']).optional(), mine: z.enum(['true', 'false']).optional() }));
export const threadCreate = z.object({ lesson: objectId.optional(), title: z.string().trim().min(5).max(160), body: z.string().trim().max(4000).optional() });
export const answerBody = z.object({ body: z.string().trim().min(1).max(4000) });
export const resolvedBody = z.object({ resolved: z.boolean() });
export const inbox = cursorQuery.and(z.object({ unanswered: z.enum(['true', 'false']).optional() }));
