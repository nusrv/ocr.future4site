"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../audit");
const db_1 = require("../db");
const security_1 = require("../security");
const router = (0, express_1.Router)();
router.get('/usage', async (req, res) => {
    const auth = req.auth;
    const summary = await (0, db_1.rows)(`SELECT COALESCE(SUM(quantity),0) pages FROM usage_events WHERE organization_id=? AND occurred_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')`, [auth.organizationId]);
    const plan = await (0, db_1.rows)('SELECT plan_code,monthly_page_limit FROM organizations WHERE id=?', [auth.organizationId]);
    res.json({ period: new Date().toISOString().slice(0, 7), pages: Number(summary[0].pages), plan: plan[0] });
});
router.get('/api-keys', async (req, res) => {
    const auth = req.auth;
    const keys = await (0, db_1.rows)('SELECT id,name,key_prefix,last_used_at,expires_at,revoked_at,created_at FROM api_keys WHERE organization_id=? ORDER BY created_at DESC', [auth.organizationId]);
    res.json({ keys });
});
router.post('/api-keys', async (req, res) => {
    const auth = req.auth;
    if (!['owner', 'admin'].includes(auth.role))
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Workspace administrator access required' } });
    const parsed = zod_1.z.object({ name: zod_1.z.string().trim().min(2).max(100) }).safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Enter a key name' } });
    const key = (0, security_1.issueApiKey)();
    const id = (0, node_crypto_1.randomUUID)();
    await db_1.db.execute('INSERT INTO api_keys (id,organization_id,created_by,name,key_prefix,key_hash) VALUES (?,?,?,?,?,?)', [id, auth.organizationId, auth.userId, parsed.data.name, key.prefix, key.hash]);
    await (0, audit_1.audit)({ organizationId: auth.organizationId, actorUserId: auth.userId, action: 'api_key.created', targetType: 'api_key', targetId: id, ip: req.ip });
    res.status(201).json({ key: { id, name: parsed.data.name, prefix: key.prefix, secret: key.secret } });
});
router.delete('/api-keys/:id', async (req, res) => {
    const auth = req.auth;
    if (!['owner', 'admin'].includes(auth.role))
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Workspace administrator access required' } });
    const [result] = await db_1.db.execute('UPDATE api_keys SET revoked_at=NOW(3) WHERE id=? AND organization_id=? AND revoked_at IS NULL', [req.params.id, auth.organizationId]);
    if (!result.affectedRows)
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Active key not found' } });
    await (0, audit_1.audit)({ organizationId: auth.organizationId, actorUserId: auth.userId, action: 'api_key.revoked', targetType: 'api_key', targetId: req.params.id, ip: req.ip });
    res.status(204).end();
});
exports.default = router;
