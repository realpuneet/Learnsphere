import Redis from 'ioredis';
import { env, isTest } from './env.js';
import { logger } from '../utils/logger.js';

let client;

/** Shared command connection (cache, rate-limit, OTP, idempotency). */
export function getRedis() {
  if (client) return client;
  client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, enableReadyCheck: true, lazyConnect: false });
  client.on('error', (e) => !isTest && logger.error({ err: e.message }, 'redis error'));
  return client;
}

/** Test helper to inject ioredis-mock. */
export function setRedis(c) {
  client = c;
}

/** BullMQ & socket adapter need dedicated connections with maxRetriesPerRequest=null. */
export function createRedisConnection() {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export async function closeRedis() {
  if (client) await client.quit().catch(() => {});
  client = undefined;
}
