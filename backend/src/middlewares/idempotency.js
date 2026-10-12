import { getRedis } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Idempotency-Key support for POST endpoints that create money/slot-affecting records.
 * First request stores a "processing" lock, the response is cached for 24h and replayed on retries.
 */
export function idempotent(scope) {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) return next();
    if (String(key).length > 100) return next(ApiError.badRequest('Idempotency-Key too long'));
    const r = getRedis();
    const redisKey = `idem:${scope}:${req.user?.id || req.ip}:${key}`;
    try {
      const existing = await r.get(redisKey);
      if (existing) {
        const parsed = JSON.parse(existing);
        if (parsed.state === 'processing') return next(ApiError.conflict('Request already in progress', 'IDEMPOTENT_IN_PROGRESS'));
        res.setHeader('Idempotent-Replay', 'true');
        return res.status(parsed.status).json(parsed.body);
      }
      const locked = await r.set(redisKey, JSON.stringify({ state: 'processing' }), 'EX', 60, 'NX');
      if (!locked) return next(ApiError.conflict('Request already in progress', 'IDEMPOTENT_IN_PROGRESS'));
    } catch {
      return next();
    }
    const origJson = res.json.bind(res);
    res.json = (body) => {
      const done = res.statusCode < 500
        ? r.set(redisKey, JSON.stringify({ state: 'done', status: res.statusCode, body }), 'EX', 86400)
        : r.del(redisKey);
      Promise.resolve(done).catch(() => {});
      return origJson(body);
    };
    next();
  };
}
