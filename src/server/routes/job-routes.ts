import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { z } from 'zod';
import { audit } from '../audit';
import { config } from '../config';
import { db, rows } from '../db';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1 } });
const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

router.get('/', async (req, res) => {
  const auth = (req as AuthenticatedRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const jobs = await rows<any[]>(`SELECT id,status,original_name,media_type,source_bytes,language,page_count,confidence,error_code,created_at,completed_at,expires_at FROM ocr_jobs WHERE organization_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [auth.organizationId, limit, (page - 1) * limit]);
  res.json({ jobs, page, limit });
});

router.post('/', upload.single('file'), async (req, res) => {
  const auth = (req as AuthenticatedRequest).auth;
  if (!req.file) return res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Choose a document to upload' } });
  const input = z.object({ language: z.enum(['eng', 'ara', 'eng+ara']).default('eng+ara') }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: { code: 'INVALID_LANGUAGE', message: 'Choose English, Arabic, or bilingual OCR' } });
  const detected = await fileTypeFromBuffer(req.file.buffer);
  if (!detected || !allowed.has(detected.mime)) return res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA', message: 'Only PNG, JPEG, WebP, and PDF files are supported' } });
  const id = randomUUID();
  const directory = path.join(config.STORAGE_PATH, auth.organizationId, id);
  await fs.mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, `source.${detected.ext}`);
  await fs.writeFile(sourcePath, req.file.buffer, { flag: 'wx', mode: 0o600 });
  const sha256 = createHash('sha256').update(req.file.buffer).digest('hex');
  const expires = new Date(Date.now() + config.RESULT_RETENTION_DAYS * 86400000);
  await db.execute(`INSERT INTO ocr_jobs (id,organization_id,created_by,original_name,media_type,source_path,source_sha256,source_bytes,language,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, [id, auth.organizationId, auth.userId, path.basename(req.file.originalname).slice(0, 255), detected.mime, sourcePath, sha256, req.file.size, input.data.language, expires]);
  await audit({ organizationId: auth.organizationId, actorUserId: auth.userId, action: 'ocr_job.created', targetType: 'ocr_job', targetId: id, ip: req.ip, metadata: { mediaType: detected.mime, bytes: req.file.size, language: input.data.language } });
  res.status(202).json({ job: { id, status: 'queued', original_name: req.file.originalname, language: input.data.language, expires_at: expires } });
});

router.get('/:id', async (req, res) => {
  const auth = (req as AuthenticatedRequest).auth;
  const jobs = await rows<any[]>(`SELECT id,status,original_name,media_type,source_sha256,source_bytes,language,page_count,result_text,confidence,error_code,error_message,created_at,started_at,completed_at,expires_at FROM ocr_jobs WHERE id=? AND organization_id=? LIMIT 1`, [req.params.id, auth.organizationId]);
  if (!jobs[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
  const pages = jobs[0].status === 'succeeded' ? await rows<any[]>('SELECT page_number,text,confidence,width,height FROM ocr_pages WHERE job_id=? ORDER BY page_number', [jobs[0].id]) : [];
  res.json({ job: jobs[0], pages });
});

router.post('/:id/cancel', async (req, res) => {
  const auth = (req as AuthenticatedRequest).auth;
  const [result] = await db.execute<any>("UPDATE ocr_jobs SET status='cancelled',completed_at=NOW(3) WHERE id=? AND organization_id=? AND status='queued'", [req.params.id, auth.organizationId]);
  if (!result.affectedRows) return res.status(409).json({ error: { code: 'NOT_CANCELLABLE', message: 'Only queued jobs can be cancelled' } });
  await audit({ organizationId: auth.organizationId, actorUserId: auth.userId, action: 'ocr_job.cancelled', targetType: 'ocr_job', targetId: req.params.id, ip: req.ip });
  res.json({ status: 'cancelled' });
});

router.delete('/:id', async (req, res) => {
  const auth = (req as AuthenticatedRequest).auth;
  const found = await rows<any[]>('SELECT source_path FROM ocr_jobs WHERE id=? AND organization_id=? LIMIT 1', [req.params.id, auth.organizationId]);
  if (!found[0]) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
  await fs.rm(path.dirname(found[0].source_path), { recursive: true, force: true });
  await db.execute("UPDATE ocr_jobs SET status='expired',source_path='',result_text=NULL,error_message=NULL WHERE id=? AND organization_id=?", [req.params.id, auth.organizationId]);
  await db.execute('DELETE FROM ocr_pages WHERE job_id=?', [req.params.id]);
  await audit({ organizationId: auth.organizationId, actorUserId: auth.userId, action: 'ocr_job.deleted', targetType: 'ocr_job', targetId: req.params.id, ip: req.ip });
  res.status(204).end();
});

export default router;
