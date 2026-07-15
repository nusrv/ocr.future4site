"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const auth_1 = require("./auth");
const config_1 = require("./config");
const db_1 = require("./db");
const ocr_1 = require("./ocr");
const account_routes_1 = __importDefault(require("./routes/account-routes"));
const admin_routes_1 = __importDefault(require("./routes/admin-routes"));
const auth_routes_1 = __importDefault(require("./routes/auth-routes"));
const job_routes_1 = __importDefault(require("./routes/job-routes"));
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.disable('x-powered-by');
    app.use((0, pino_http_1.default)({ redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'] }));
    app.use((0, helmet_1.default)({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"] } } }));
    app.use(express_1.default.json({ limit: '256kb' }));
    app.use((0, cookie_parser_1.default)());
    app.get('/api/health/live', (_req, res) => res.json({ status: 'ok', version: process.env.npm_package_version ?? '0.1.0' }));
    app.get('/api/health/ready', async (_req, res) => {
        try {
            await db_1.db.query('SELECT 1');
            const ocr = await (0, ocr_1.runtimeReadiness)();
            const ready = ocr.tesseract && ocr.poppler;
            res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'degraded', database: true, ocr });
        }
        catch {
            res.status(503).json({ status: 'unavailable', database: false, ocr: { tesseract: false, poppler: false } });
        }
    });
    app.use('/api/auth', (0, express_rate_limit_1.default)({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }), auth_routes_1.default);
    app.use('/api/v1/jobs', auth_1.requireAuth, (0, express_rate_limit_1.default)({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }), job_routes_1.default);
    app.use('/api/v1/account', auth_1.requireAuth, account_routes_1.default);
    app.use('/api/admin', auth_1.requireAuth, auth_1.requireAdmin, admin_routes_1.default);
    const publicPath = node_path_1.default.resolve('public');
    if (node_fs_1.default.existsSync(publicPath)) {
        app.use(express_1.default.static(publicPath, { index: false, maxAge: config_1.config.isProduction ? '1d' : 0 }));
        app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(node_path_1.default.join(publicPath, 'index.html')));
    }
    app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }));
    app.use((error, _req, res, _next) => {
        if (error?.code === 'LIMIT_FILE_SIZE')
            return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: `Maximum upload size is ${Math.round(config_1.config.MAX_UPLOAD_BYTES / 1048576)} MB` } });
        _req.log?.error({ err: error }, 'request failed');
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed' } });
    });
    return app;
}
