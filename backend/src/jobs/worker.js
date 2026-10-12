import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { createRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { QUEUES, getQueue, closeQueues } from './queues.js';
import { handlers } from './handlers.js';
import { fileURLToPath } from 'url';

const workers = [];

export async function startWorkers({ connect = true } = {}) {
  if (connect) await connectDB();

  workers.push(
    new Worker(QUEUES.NOTIFY, (job) => handlers.deliver(job.data), { connection: createRedisConnection(), concurrency: 20 }),
    new Worker(QUEUES.MAINTENANCE, (job) => handlers[job.name]?.(job.data), { connection: createRedisConnection(), concurrency: 1 }),
  );
  workers.forEach((w) => w.on('failed', (job, err) => logger.warn({ job: job?.name, err: err.message }, 'job failed')));

  // one repeatable minute tick (BullMQ de-duplicates by jobId across workers)
  await getQueue(QUEUES.MAINTENANCE).add('tick', {}, { repeat: { every: 60_000 }, jobId: 'tick', removeOnComplete: true, removeOnFail: true, attempts: 1 });
  logger.info(`Workers started (${env.NODE_ENV})`);
}

export async function stopWorkers() {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  workers.length = 0;
  await closeQueues();
}

// run standalone: `node src/jobs/worker.js`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startWorkers().catch((e) => {
    logger.error({ err: e }, 'worker boot failed');
    process.exit(1);
  });
  const shutdown = async () => {
    await stopWorkers();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
