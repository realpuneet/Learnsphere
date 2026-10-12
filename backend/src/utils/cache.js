import { getRedis } from '../config/redis.js';
import { logger } from './logger.js';

/**
 * Namespace-versioned cache: invalidating a namespace is a single INCR, no SCAN/DEL storms.
 */
async function nsVersion(ns) {
  const r = getRedis();
  const v = await r.get(`cv:${ns}`);
  return v || '0';
}

export async function cacheGetOrSet(ns, key, ttlSeconds, loader) {
  const r = getRedis();
  let full;
  try {
    full = `c:${ns}:${await nsVersion(ns)}:${key}`;
    const hit = await r.get(full);
    if (hit) return JSON.parse(hit);
  } catch (e) {
    logger.warn({ err: e.message }, 'cache read failed');
  }
  const value = await loader();
  try {
    if (full && value !== undefined) await r.set(full, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (e) {
    logger.warn({ err: e.message }, 'cache write failed');
  }
  return value;
}

export async function invalidateNamespace(ns) {
  try {
    await getRedis().incr(`cv:${ns}`);
  } catch (e) {
    logger.warn({ err: e.message }, 'cache invalidate failed');
  }
}
