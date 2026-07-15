"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const schema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    APP_URL: zod_1.z.string().url().default('http://localhost:3000'),
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(32),
    STORAGE_PATH: zod_1.z.string().default('./storage'),
    MAX_UPLOAD_BYTES: zod_1.z.coerce.number().int().positive().default(15 * 1024 * 1024),
    MAX_PDF_PAGES: zod_1.z.coerce.number().int().min(1).max(100).default(30),
    SOURCE_RETENTION_HOURS: zod_1.z.coerce.number().int().min(1).default(24),
    RESULT_RETENTION_DAYS: zod_1.z.coerce.number().int().min(1).default(30),
    TESSERACT_PATH: zod_1.z.string().default('tesseract'),
    PDFTOPPM_PATH: zod_1.z.string().default('pdftoppm'),
    OCR_WORKER_ID: zod_1.z.string().default(`worker-${process.pid}`),
    ALLOW_REGISTRATION: zod_1.z.string().default('true').transform((v) => v === 'true')
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
}
exports.config = {
    ...parsed.data,
    STORAGE_PATH: node_path_1.default.resolve(parsed.data.STORAGE_PATH),
    isProduction: parsed.data.NODE_ENV === 'production'
};
