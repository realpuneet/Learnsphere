import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const phone = z.string().trim().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number');
export const idParam = z.object({ id: objectId });
export const emptyToUndef = (s) => z.preprocess((v) => (v === '' || v === null ? undefined : v), s.optional());
export const pageQuery = z.object({ page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() }).passthrough();
export const cursorQuery = z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).optional() }).passthrough();
/** http(s) URLs only – `z.string().url()` happily accepts `javascript:` and `data:` URLs (stored XSS if rendered as href/src). */
export const httpUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((u) => {
    try {
      const p = new URL(u).protocol;
      return p === 'https:' || p === 'http:';
    } catch {
      return false;
    }
  }, 'Enter a valid http(s) link');
