import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';
const pretty = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : level,
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash', 'otp'],
  ...(pretty ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
});
