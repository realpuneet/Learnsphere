import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import { corsOptions } from './config/cors.js';
import { logger } from './utils/logger.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import routes from './routes/index.js';
import { webhook } from './controllers/payment.controller.js';
import { openapi } from './docs/openapi.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
      autoLogging: { ignore: (req) => req.url.endsWith('/health') },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );

  // Razorpay webhook needs the RAW body for HMAC verification -> before express.json()
  app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), webhook);

  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use('/api', globalLimiter);
  app.get('/api/v1/openapi.json', (_req, res) => res.json(openapi));
  app.use('/api/v1', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
