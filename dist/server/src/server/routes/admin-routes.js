"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../audit");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.get('/overview', async (_req, res) => { const [orgs, jobs, queue, usage] = await Promise.all([(0, db_1.rows)('SELECT COUNT(*) count FROM organizations'), (0, db_1.rows)("SELECT status,COUNT(*) count FROM ocr_jobs GROUP BY status"), (0, db_1.rows)("SELECT COUNT(*) queued,MIN(created_at) oldest FROM ocr_jobs WHERE status='queued'"), (0, db_1.rows)("SELECT COALESCE(SUM(quantity),0) pages FROM usage_events WHERE occurred_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')")]); res.json({ organizations: Number(orgs[0].count), jobs, queue: queue[0], monthlyPages: Number(usage[0].pages) }); });
router.get('/organizations', async (_req, res) => { const organizations = await (0, db_1.rows)(`SELECT o.id,o.name,o.slug,o.status,o.plan_code,o.monthly_page_limit,o.created_at,COUNT(DISTINCT m.user_id) members,COUNT(DISTINCT j.id) jobs FROM organizations o LEFT JOIN memberships m ON m.organization_id=o.id LEFT JOIN ocr_jobs j ON j.organization_id=o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200`); res.json({ organizations }); });
router.patch('/organizations/:id', async (req, res) => { const auth = req.auth; const parsed = zod_1.z.object({ status: zod_1.z.enum(['active', 'suspended']).optional(), planCode: zod_1.z.string().min(2).max(40).optional(), monthlyPageLimit: zod_1.z.number().int().min(0).max(10000000).optional() }).refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!parsed.success)
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No valid organization changes supplied' } }); const fields = []; const values = []; if (parsed.data.status) {
    fields.push('status=?');
    values.push(parsed.data.status);
} if (parsed.data.planCode) {
    fields.push('plan_code=?');
    values.push(parsed.data.planCode);
} if (parsed.data.monthlyPageLimit !== undefined) {
    fields.push('monthly_page_limit=?');
    values.push(parsed.data.monthlyPageLimit);
} values.push(req.params.id); await db_1.db.execute(`UPDATE organizations SET ${fields.join(',')} WHERE id=?`, values); await (0, audit_1.audit)({ actorUserId: auth.userId, action: 'organization.updated', targetType: 'organization', targetId: req.params.id, ip: req.ip, metadata: parsed.data }); res.json({ updated: true }); });
router.get('/audit', async (_req, res) => { const events = await (0, db_1.rows)('SELECT id,organization_id,actor_user_id,action,target_type,target_id,ip_address,created_at FROM audit_events ORDER BY created_at DESC LIMIT 200'); res.json({ events }); });
exports.default = router;
