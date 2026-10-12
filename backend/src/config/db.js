import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

if (env.DNS_SERVERS) dns.setServers(env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean));

mongoose.set('strictQuery', true);

export async function connectDB(uri = env.MONGO_URI) {
  mongoose.connection.on('error', (e) => logger.error({ err: e }, 'mongo error'));
  mongoose.connection.on('disconnected', () => logger.warn('mongo disconnected'));
  await mongoose.connect(uri, { maxPoolSize: 50, minPoolSize: 5, serverSelectionTimeoutMS: 10000 });
  logger.info('MongoDB connected');
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
