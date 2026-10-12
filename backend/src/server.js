import http from 'http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { getRedis, closeRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { createApp } from './app.js';
import { initSocket } from './sockets/index.js';
import { startWorkers, stopWorkers } from './jobs/worker.js';

async function main() {
  await connectDB();
  getRedis();

  const app = createApp();
  const server = http.createServer(app);
  server.keepAliveTimeout = 65_000; // > typical LB idle timeout
  server.headersTimeout = 66_000;
  initSocket(server);

  if (env.START_WORKER) await startWorkers({ connect: false });

  server.listen(env.PORT, () => logger.info(`${env.APP_NAME} API listening on :${env.PORT} (${env.NODE_ENV})`));

  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await stopWorkers().catch(() => {});
      await disconnectDB().catch(() => {});
      await closeRedis();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 15_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (e) => logger.error({ err: e }, 'unhandledRejection'));
}

main().catch((e) => {
  logger.error({ err: e }, 'fatal boot error');
  process.exit(1);
});
