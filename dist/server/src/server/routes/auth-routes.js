"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../audit");
const auth_1 = require("../auth");
const config_1 = require("../config");
const db_1 = require("../db");
const security_1 = require("../security");
const router = (0, express_1.Router)();
const credentials = zod_1.z.object({ email: zod_1.z.string().email().max(254).transform((v) => v.toLowerCase()), password: zod_1.z.string().min(10).max(200) });
router.post('/register', async (req, res) => {
    if (!config_1.config.ALLOW_REGISTRATION)
        return res.status(403).json({ error: { code: 'REGISTRATION_CLOSED', message: 'Registration is currently invitation only' } });
    const parsed = credentials.extend({ name: zod_1.z.string().trim().min(2).max(120), organizationName: zod_1.z.string().trim().min(2).max(160) }).safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the registration fields', details: parsed.error.flatten() } });
    const ids = { user: (0, node_crypto_1.randomUUID)(), organization: (0, node_crypto_1.randomUUID)() };
    const slug = `${parsed.data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'workspace'}-${ids.organization.slice(0, 6)}`;
    try {
        await (0, db_1.transaction)(async (connection) => {
            await connection.execute('INSERT INTO organizations (id,name,slug) VALUES (?,?,?)', [ids.organization, parsed.data.organizationName, slug]);
            await connection.execute('INSERT INTO users (id,email,password_hash,name) VALUES (?,?,?,?)', [ids.user, parsed.data.email, await (0, security_1.hashPassword)(parsed.data.password), parsed.data.name]);
            await connection.execute("INSERT INTO memberships (organization_id,user_id,role) VALUES (?,?,'owner')", [ids.organization, ids.user]);
        });
    }
    catch (error) {
        if (error?.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'An account already uses this email' } });
        throw error;
    }
    res.cookie('focr_session', (0, security_1.signSession)({ userId: ids.user, organizationId: ids.organization }), cookieOptions());
    await (0, audit_1.audit)({ organizationId: ids.organization, actorUserId: ids.user, action: 'account.registered', targetType: 'user', targetId: ids.user, ip: req.ip });
    res.status(201).json({ user: { id: ids.user, email: parsed.data.email, name: parsed.data.name }, organization: { id: ids.organization, name: parsed.data.organizationName } });
});
router.post('/login', async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email and password' } });
    const found = await (0, db_1.rows)(`SELECT u.id,u.email,u.name,u.password_hash,m.organization_id FROM users u JOIN memberships m ON m.user_id=u.id JOIN organizations o ON o.id=m.organization_id WHERE u.email=? AND u.disabled_at IS NULL AND o.status='active' ORDER BY m.created_at LIMIT 1`, [parsed.data.email]);
    if (!found[0] || !(await (0, security_1.verifyPassword)(parsed.data.password, found[0].password_hash)))
        return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } });
    res.cookie('focr_session', (0, security_1.signSession)({ userId: found[0].id, organizationId: found[0].organization_id }), cookieOptions());
    await db_1.db.execute('UPDATE users SET last_login_at=NOW(3) WHERE id=?', [found[0].id]);
    await (0, audit_1.audit)({ organizationId: found[0].organization_id, actorUserId: found[0].id, action: 'session.created', targetType: 'user', targetId: found[0].id, ip: req.ip });
    res.json({ user: { id: found[0].id, email: found[0].email, name: found[0].name } });
});
router.post('/logout', (_req, res) => { res.clearCookie('focr_session', cookieOptions()); res.status(204).end(); });
router.get('/me', auth_1.requireAuth, async (req, res) => {
    const auth = req.auth;
    const found = await (0, db_1.rows)(`SELECT u.id,u.email,u.name,u.locale,o.name organization_name,o.plan_code,o.monthly_page_limit FROM users u JOIN organizations o ON o.id=? WHERE u.id=?`, [auth.organizationId, auth.userId]);
    res.json({ user: found[0], auth });
});
function cookieOptions() { return { httpOnly: true, secure: config_1.config.isProduction, sameSite: 'lax', path: '/', maxAge: 12 * 60 * 60 * 1000 }; }
exports.default = router;
