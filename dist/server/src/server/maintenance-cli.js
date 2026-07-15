"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const db_1 = require("./db");
async function main() {
    await db_1.db.execute("UPDATE ocr_jobs SET status='queued',worker_id=NULL,locked_at=NULL WHERE status='processing' AND locked_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE) AND attempt_count < 3");
    await db_1.db.execute("UPDATE ocr_jobs SET status='failed',error_code='RETRY_EXHAUSTED',error_message='Worker retry limit reached',completed_at=NOW(3),locked_at=NULL WHERE status='processing' AND locked_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE) AND attempt_count >= 3");
    const expired = await (0, db_1.rows)("SELECT id,source_path FROM ocr_jobs WHERE expires_at < NOW() AND status <> 'expired' LIMIT 500");
    for (const job of expired) {
        if (job.source_path)
            await promises_1.default.rm(node_path_1.default.dirname(job.source_path), { recursive: true, force: true });
        await db_1.db.execute("UPDATE ocr_jobs SET status='expired',source_path='',result_text=NULL,error_message=NULL WHERE id=?", [job.id]);
        await db_1.db.execute('DELETE FROM ocr_pages WHERE job_id=?', [job.id]);
    }
    console.log(`Maintenance complete. Expired ${expired.length} jobs.`);
    await db_1.db.end();
}
main().catch(async (error) => { console.error(error); await db_1.db.end(); process.exitCode = 1; });
