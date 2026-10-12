import { getRedis } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';
import { isTest } from '../config/env.js';

/**
 * Fixed-window Redis limiter. Fails open if Redis is unavailable (availability > strictness).
 * key: function(req) => string
 */
export function rateLimit({ windowSec = 60, max = 60, prefix = 'rl', key = (req) => req.ip } = {}) {
  return async (req, res, next) => {
    if (isTest && !process.env.TEST_RATE_LIMIT) return next();
    try {
      const k = `${prefix}:${key(req)}:${Math.floor(Date.now() / 1000 / windowSec)}`;
      const r = getRedis();
      const n = await r.incr(k);
      if (n === 1) await r.expire(k, windowSec + 1);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - n));
      if (n > max) return next(ApiError.tooMany('Too many requests, please slow down'));
    } catch {
      /* fail open */
    }
    next();
  };
}

export const globalLimiter = rateLimit({ windowSec: 60, max: 300, prefix: 'rl:g' });
export const authLimiter = rateLimit({ windowSec: 60, max: 10, prefix: 'rl:auth' });
export const otpLimiter = rateLimit({ windowSec: 600, max: 5, prefix: 'rl:otp', key: (req) => `${req.ip}:${req.body?.phone || req.body?.email || ''}` });
export const bookingLimiter = rateLimit({ windowSec: 60, max: 12, prefix: 'rl:book', key: (req) => req.user?.id || req.ip });
