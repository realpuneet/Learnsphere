import { z } from 'zod';
import { LEVELS } from '../utils/constants.js';
import { pageQuery, cursorQuery } from './common.js';

export const courseList = pageQuery.and(
  z.object({
    q: z.string().trim().max(60).optional(),
    category: z.string().trim().max(60).optional(),
    level: z.enum(LEVELS).optional(),
    price: z.enum(['free', 'paid']).optional(),
    sort: z.enum(['popular', 'newest', 'rating', 'price_asc', 'price_desc']).optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    language: z.string().trim().max(30).optional(),
    featured: z.enum(['true', 'false']).optional(),
  }),
);
export const slugParam = z.object({ slug: z.string().min(1).max(120) });
export const reviewList = cursorQuery;
