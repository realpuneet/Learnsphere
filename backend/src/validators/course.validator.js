import { z } from 'zod';
import { LEVELS, LESSON_TYPES, QUESTION_TYPES, COURSE_STATUS_LIST } from '../utils/constants.js';
import { httpUrl, objectId, pageQuery } from './common.js';

const strList = (max, len = 200) => z.array(z.string().trim().min(1).max(len)).max(max);
const url = httpUrl;

const courseFields = {
  title: z.string().trim().min(5).max(120),
  subtitle: z.string().trim().max(200),
  description: z.string().trim().max(10000),
  category: objectId,
  level: z.enum(LEVELS),
  language: z.string().trim().min(2).max(30),
  tags: strList(10, 30),
  thumbnail: httpUrl.nullable(),
  previewVideo: url.nullable(),
  outcomes: strList(20),
  requirements: strList(20),
  price: z.coerce.number().min(0).max(100000),
  mrp: z.coerce.number().min(0).max(100000),
  certificate: z.boolean(),
};
export const createCourse = z.object({ title: courseFields.title, subtitle: courseFields.subtitle.optional(), category: courseFields.category.optional(), level: courseFields.level.optional() });
export const updateCourse = z.object(courseFields).partial();
export const myCourses = pageQuery.and(z.object({ status: z.enum(COURSE_STATUS_LIST).optional(), all: z.enum(['true', 'false']).optional() }));

export const sectionBody = z.object({ title: z.string().trim().min(1).max(120) });
export const orderIds = z.object({ ids: z.array(objectId).min(1).max(300) });
export const sectionParams = z.object({ id: objectId, sectionId: objectId });

const resource = z.object({ name: z.string().trim().min(1).max(80), url });
const lessonFields = {
  title: z.string().trim().min(1).max(140),
  type: z.enum(LESSON_TYPES),
  videoUrl: url.optional().or(z.literal('')),
  durationSec: z.coerce.number().int().min(0).max(86400),
  content: z.string().max(60000),
  resources: z.array(resource).max(15),
  isPreview: z.boolean(),
};
export const createLesson = z.object({ ...lessonFields, type: lessonFields.type.default('video'), videoUrl: lessonFields.videoUrl, durationSec: lessonFields.durationSec.optional(), content: lessonFields.content.optional(), resources: lessonFields.resources.optional(), isPreview: lessonFields.isPreview.optional() });
export const updateLesson = z.object({ ...lessonFields, section: objectId }).partial();
export const lessonParam = z.object({ lessonId: objectId });

const option = z.object({ text: z.string().trim().min(1).max(300), correct: z.boolean().default(false) });
const question = z.object({
  text: z.string().trim().min(3).max(1000),
  type: z.enum(QUESTION_TYPES).default('single'),
  options: z.array(option).min(2).max(8),
  explanation: z.string().trim().max(1000).optional(),
  points: z.coerce.number().int().min(1).max(20).default(1),
});
export const quizBody = z.object({
  passPercent: z.coerce.number().int().min(1).max(100).default(60),
  maxAttempts: z.coerce.number().int().min(0).max(50).default(0),
  shuffle: z.boolean().default(true),
  questions: z.array(question).min(1).max(100),
});

export const review = z.object({ decision: z.enum(['approve', 'reject']), reason: z.string().trim().min(5).max(500).optional() }).refine((v) => v.decision === 'approve' || v.reason, { message: 'Tell the instructor what to change', path: ['reason'] });
