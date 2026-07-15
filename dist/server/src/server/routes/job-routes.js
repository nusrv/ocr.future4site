"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const file_type_1 = require("file-type");
const zod_1 = require("zod");
const audit_1 = require("../audit");
const config_1 = require("../config");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: config_1.config.MAX_UPLOAD_BYTES, files: 1 } });
const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
router.get('/', async (req, res) => {
    const auth = req.auth;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const jobs = await (0, db_1.rows)(`SELECT id,status,original_name,media_type,source_bytes,language,page_count,confidence,error_code,created_at,completed_at,expires_at FROM ocr_jobs WHERE organization_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?`, [auth.organizationId, limit, (page - 1) * limit]);
    res.json({ jobs, page, limit });
});
router.post('/', upload.single('file'), async (req, res) => {
    const auth = req.auth;
    if (!req.file)
        return res.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Choose a document to upload' } });
    const input = zod_1.z.object({ language: zod_1.z.enum(['eng', 'ara', 'eng+ara']).default('eng+ara') }).safeParse(req.body);
    if (!input.success)
        return res.status(400).json({ error: { code: 'INVALID_LANGUAGE', message: 'Choose English, Arabic, or bilingual OCR' } });
    const detected = await (0, file_type_1.fileTypeFromBuffer)(req.file.buffer);
    if (!detected || !allowed.has(detected.mime))
        return res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA', message: 'Only PNG, JPEG, WebP, and PDF files are supported' } });
    const id = (0, node_crypto_1.randomUUID)();
    const directory = node_path_1.default.join(config_1.config.STORAGE_PATH, auth.organizationId, id);
    await promises_1.default.mkdir(directory, { recursive: true });
    const sourcePath = node_path_1.default.join(directory, `source.${detected.ext}`);
    await promises_1.default.writeFile(sourcePath, req.file.buffer, { flag: 'wx', mode: 0o600 });
    const sha256 = (0, node_crypto_1.createHash)('sha256').update(req.file.buffer).digest('hex');
    const expires = new Date(Date.now() + config_1.config.RESULT_RETENTION_DAYS * 86400000);
    await db_1.db.execute(`INSERT INTO ocr_jobs (id,organization_id,created_by,original_name,media_type,source_path,source_sha256,source_bytes,language,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, [id, auth.organizationId, auth.userId, node_path_1.default.basename(req.file.originalname).slice(0, 255), detected.mime, sourcePath, sha256, req.file.size, input.data.language, expires]);
    await (0, audit_1.audit)({ organizationId: auth.organizationId, actorUserId: auth.userId, action: 'ocr_job.created', targetType: 'ocr_job', targetId: id, ip: req.ip, metadata: { mediaType: detected.mime, bytes: req.file.size, language: input.data.language } });
    res.status(202).json({ job: { id, status: 'queued', original_name: req.file.originalname, language: input.data.language, expires_at: expires } });
});
router.get('/:id', async (req, res) => {
    const auth = req.auth;
    const jobs = await (0, db_1.rows)(`SELECT id,status,original_name,media_type,source_sha256,source_bytes,language,page_count,result_text,confidence,error_code,error_message,created_at,started_at,completed_at,expires_at FROM ocr_jobs WHERE id=? AND organization_id=? LIMIT 1`, [req.params.id, auth.organizationId]);
    if (!jobs[0])
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
    const pages = jobs[0].status === 'succeeded' ? await (0, db_1.rows)('SELECT page_number,text,confidence,width,height FROM ocr_pages WHERE job_id=? ORDER BY page_number', [jobs[0].id]) : [];
    res.json({ job: jobs[0], pages });
});
router.post('/:id/cancel', async (req, res) => {
    const auth = req.auth;
    const [result] = await db_1.db.execute("UPDATE ocr_jobs SET status='cancelled',completed_at=NOW(3) WHERE id=? AND organization_id=? AND status='queued'", [req.params.id, auth.organizationId]);
    if (!result.affectedRows)
        return res.status(409).json({ error: { code: 'NOT_CANCELLABLE', message: 'Only queued jobs can be cancelled' } });
    await (0, audit_1.audit)({ organizationId: auth.organizationId, actorUserId: auth.userId, action: 'ocr_job.cancelled', targetType: 'ocr_job', targetId: req.params.id, ip: req.ip });
    res.json({ status: 'cancelled' });
});
router.delete('/:id', async (req, res) => {
    const auth = req.auth;
    const found = await (0, db_1.rows)('SELECT source_path FROM ocr_jobs WHERE id=? AND organization_id=? LIMIT 1', [req.params.id, auth.organizationId]);
    if (!found[0])
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Job not found' } });
    await promises_1.default.rm(node_path_1.default.dirname(found[0].source_path), { recursive: true, force: true });
    await db_1.db.execute("UPDATE ocr_jobs SET status='expired',source_path='',result_text=NULL,error_message=NULL WHERE id=? AND organization_id=?", [req.params.id, auth.organizationId]);
    await db_1.db.execute('DELETE FROM ocr_pages WHERE job_id=?', [req.params.id]);
    await (0, audit_1.audit)({ organizationId: auth.organizationId, actorUserId: auth.userId, action: 'ocr_job.deleted', targetType: 'ocr_job', targetId: req.params.id, ip: req.ip });
    res.status(204).end();
});
exports.default = router;
