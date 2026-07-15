import path from 'node:path';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  STORAGE_PATH: z.string().default('./storage'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(15 * 1024 * 1024),
  MAX_PDF_PAGES: z.coerce.number().int().min(1).max(100).default(30),
  SOURCE_RETENTION_HOURS: z.coerce.number().int().min(1).default(24),
  RESULT_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
  TESSERACT_PATH: z.string().default('tesseract'),
  PDFTOPPM_PATH: z.string().default('pdftoppm'),
  OCR_WORKER_ID: z.string().default(`worker-${process.pid}`),
  ALLOW_REGISTRATION: z.string().default('true').transform((v) => v === 'true')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
}

export const config = {
  ...parsed.data,
  STORAGE_PATH: path.resolve(parsed.data.STORAGE_PATH),
  isProduction: parsed.data.NODE_ENV === 'production'
};
