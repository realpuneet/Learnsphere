import { ApiError } from '../utils/ApiError.js';

/** validate({ body, query, params }) with Zod schemas. Parsed values replace the originals. */
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
        return next(ApiError.unprocessable(`Invalid ${part}: ${details[0]?.path ? details[0].path + ' – ' : ''}${details[0]?.message}`, 'VALIDATION_ERROR', details));
      }
      if (part === 'query') {
        // Express 4 allows reassignment, keep a copy of the parsed values
        req.query = result.data;
      } else req[part] = result.data;
    }
    next();
  } catch (e) {
    next(e);
  }
};
