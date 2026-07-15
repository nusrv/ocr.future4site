import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { requireAdmin, requireAuth } from './auth';
import { config } from './config';
import { db } from './db';
import { runtimeReadiness } from './ocr';
import accountRoutes from './routes/account-routes';
import adminRoutes from './routes/admin-routes';
import authRoutes from './routes/auth-routes';
import jobRoutes from './routes/job-routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(pinoHttp({ redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'] }));
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"] } } }));
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  app.get('/api/health/live', (_req, res) => res.json({ status: 'ok', version: process.env.npm_package_version ?? '0.1.0' }));
  app.get('/api/health/ready', async (_req, res) => {
    try { await db.query('SELECT 1'); const ocr = await runtimeReadiness(); const ready = ocr.tesseract && ocr.poppler; res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'degraded', database: true, ocr }); }
    catch { res.status(503).json({ status: 'unavailable', database: false, ocr: { tesseract: false, poppler: false } }); }
  });
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }), authRoutes);
  app.use('/api/v1/jobs', requireAuth, rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }), jobRoutes);
  app.use('/api/v1/account', requireAuth, accountRoutes);
  app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

  const publicPath = path.resolve('public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath, { index: false, maxAge: config.isProduction ? '1d' : 0 }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(publicPath, 'index.html')));
  }
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (error?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: `Maximum upload size is ${Math.round(config.MAX_UPLOAD_BYTES / 1048576)} MB` } });
    _req.log?.error({ err: error }, 'request failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed' } });
  });
  return app;
}
