"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const db_1 = require("./db");
const security_1 = require("./security");
async function requireAuth(req, res, next) {
    try {
        const bearer = req.header('authorization');
        if (bearer?.startsWith('Bearer focr_')) {
            const keyHash = (0, security_1.hashApiKey)(bearer.slice(7));
            const found = await (0, db_1.rows)(`SELECT k.organization_id, k.created_by user_id, 'api' role, u.system_role, o.status
         FROM api_keys k JOIN organizations o ON o.id=k.organization_id JOIN users u ON u.id=k.created_by
         WHERE k.key_hash=? AND k.revoked_at IS NULL AND (k.expires_at IS NULL OR k.expires_at > NOW()) LIMIT 1`, [keyHash]);
            if (!found[0] || found[0].status !== 'active')
                return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } });
            req.auth = { userId: found[0].user_id, organizationId: found[0].organization_id, role: 'api', systemRole: found[0].system_role, method: 'api-key' };
            void Promise.resolve().then(() => __importStar(require('./db'))).then(({ db }) => db.execute('UPDATE api_keys SET last_used_at=NOW(3) WHERE key_hash=?', [keyHash]));
            return next();
        }
        const token = req.cookies?.focr_session;
        if (!token)
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sign in required' } });
        const session = (0, security_1.verifySession)(token);
        const found = await (0, db_1.rows)(`SELECT m.user_id, m.organization_id, m.role, u.system_role, o.status
       FROM memberships m JOIN users u ON u.id=m.user_id JOIN organizations o ON o.id=m.organization_id
       WHERE m.user_id=? AND m.organization_id=? AND u.disabled_at IS NULL LIMIT 1`, [session.userId, session.organizationId]);
        if (!found[0] || found[0].status !== 'active')
            return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Session is no longer active' } });
        req.auth = { userId: found[0].user_id, organizationId: found[0].organization_id, role: found[0].role, systemRole: found[0].system_role, method: 'session' };
        next();
    }
    catch {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication failed' } });
    }
}
function requireAdmin(req, res, next) {
    if (req.auth.systemRole !== 'admin')
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Administrator access required' } });
    next();
}
