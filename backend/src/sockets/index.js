import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { allowedOrigins } from '../config/cors.js';
import { createRedisConnection, getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/User.js';
import { Enrollment } from '../models/Enrollment.js';
import { Course } from '../models/Course.js';

let io;
const CHANNEL = 'socket:emit';

/**
 * Emit from anywhere (API process or the BullMQ worker).
 * API: broadcast via the Socket.io Redis adapter. Worker (no io): publish on Redis; API nodes re-emit locally.
 */
export function emit(room, event, payload) {
  if (io) {
    io.to(room).emit(event, payload);
    return;
  }
  getRedis().publish(CHANNEL, JSON.stringify({ room, event, payload })).catch(() => {});
}
export const emitToUser = (userId, event, payload) => emit(`user:${userId}`, event, payload);
export const emitToRole = (role, event, payload) => emit(`role:${role}`, event, payload);
export const emitToCourse = (courseId, event, payload) => emit(`course:${courseId}`, event, payload);

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e5,
    transports: ['websocket', 'polling'],
  });

  const pub = createRedisConnection();
  const sub = pub.duplicate();
  io.adapter(createAdapter(pub, sub));

  const bridge = createRedisConnection();
  bridge.subscribe(CHANNEL).catch(() => {});
  bridge.on('message', (_c, msg) => {
    try {
      const { room, event, payload } = JSON.parse(msg);
      io.local.to(room).emit(event, payload);
    } catch {
      /* ignore */
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.sub).select('role isActive name').lean();
      if (!user || !user.isActive) return next(new Error('unauthorized'));
      socket.data.user = { id: String(user._id), role: user.role, name: user.name };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.data.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);

    // live Q&A for a course: only enrolled students, the owning instructor and admins may listen
    socket.on('course:watch', async (courseId, ack) => {
      try {
        if (!mongoose.isValidObjectId(courseId)) return ack?.({ ok: false });
        const [enrolled, owns] = await Promise.all([
          Enrollment.exists({ user: id, course: courseId, status: { $in: ['active', 'completed'] } }),
          Course.exists({ _id: courseId, instructor: id }),
        ]);
        if (!enrolled && !owns && role !== 'admin') return ack?.({ ok: false });
        socket.join(`course:${courseId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false });
      }
    });
    socket.on('course:unwatch', (courseId) => socket.leave(`course:${courseId}`));
  });

  logger.info('Socket.io ready');
  return io;
}

export const getIO = () => io;
