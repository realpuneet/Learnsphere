import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { isTest } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const QUEUES = { NOTIFY: 'notify', MAINTENANCE: 'maintenance' };
const queues = new Map();

export function getQueue(name) {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 },
        },
      }),
    );
  }
  return queues.get(name);
}

/**
 * Enqueue a job. In tests (or JOBS_INLINE=true) the handler runs in-process so flows are
 * deterministic and don't need Redis/BullMQ.
 */
export async function enqueue(queueName, jobName, data, opts = {}) {
  if (isTest || process.env.JOBS_INLINE === 'true') {
    const { handlers } = await import('./handlers.js');
    const fn = handlers[jobName];
    if (fn) await fn(data).catch((e) => logger.warn({ err: e.message, jobName }, 'inline job failed'));
    return null;
  }
  try {
    return await getQueue(queueName).add(jobName, data, opts);
  } catch (e) {
    logger.error({ err: e.message, jobName }, 'enqueue failed');
    return null;
  }
}

export async function closeQueues() {
  await Promise.all([...queues.values()].map((q) => q.close().catch(() => {})));
  queues.clear();
}
