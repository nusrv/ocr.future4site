"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimJob = claimJob;
exports.processJob = processJob;
exports.runOne = runOne;
exports.runtimeReadiness = runtimeReadiness;
const node_crypto_1 = require("node:crypto");
const node_child_process_1 = require("node:child_process");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = require("node:util");
const config_1 = require("./config");
const db_1 = require("./db");
const run = (0, node_util_1.promisify)(node_child_process_1.execFile);
async function claimJob() {
    return (0, db_1.transaction)(async (connection) => {
        const [jobs] = await connection.query("SELECT id,organization_id,source_path,media_type,language FROM ocr_jobs WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED");
        if (!jobs[0])
            return null;
        await connection.execute("UPDATE ocr_jobs SET status='processing',worker_id=?,locked_at=NOW(3),started_at=COALESCE(started_at,NOW(3)),attempt_count=attempt_count+1 WHERE id=?", [config_1.config.OCR_WORKER_ID, jobs[0].id]);
        return jobs[0];
    });
}
async function processJob(job) {
    const temp = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'future-ocr-'));
    try {
        let images;
        if (job.media_type === 'application/pdf') {
            const prefix = node_path_1.default.join(temp, 'page');
            await run(config_1.config.PDFTOPPM_PATH, ['-png', '-r', '300', '-f', '1', '-l', String(config_1.config.MAX_PDF_PAGES), job.source_path, prefix], { timeout: 120000, maxBuffer: 2_000_000 });
            images = (await promises_1.default.readdir(temp)).filter((f) => /^page-.*\.png$/i.test(f)).sort(naturalSort).map((f) => node_path_1.default.join(temp, f));
        }
        else
            images = [job.source_path];
        if (!images.length)
            throw new OcrError('NO_PAGES', 'No processable pages were found');
        if (images.length > config_1.config.MAX_PDF_PAGES)
            throw new OcrError('PAGE_LIMIT', 'The PDF exceeds the configured page limit');
        const pages = [];
        for (const image of images) {
            const { stdout } = await run(config_1.config.TESSERACT_PATH, [image, 'stdout', '-l', job.language, '--oem', '1', '--psm', '3', 'tsv'], { timeout: 120000, maxBuffer: 20_000_000 });
            const lines = stdout.split(/\r?\n/).slice(1).map((line) => line.split('\t'));
            const words = lines.filter((c) => c.length >= 12 && Number(c[10]) >= 0 && c[11]?.trim());
            const confidence = words.length ? words.reduce((sum, c) => sum + Number(c[10]), 0) / words.length : null;
            const text = rebuildText(lines);
            pages.push({ text, confidence });
        }
        const resultText = pages.map((p) => p.text).join('\n\f\n');
        const overall = pages.some((p) => p.confidence !== null) ? pages.reduce((s, p) => s + (p.confidence ?? 0), 0) / pages.filter((p) => p.confidence !== null).length : null;
        await (0, db_1.transaction)(async (connection) => {
            for (let index = 0; index < pages.length; index++)
                await connection.execute('INSERT INTO ocr_pages (id,job_id,page_number,text,confidence) VALUES (?,?,?,?,?)', [(0, node_crypto_1.randomUUID)(), job.id, index + 1, pages[index].text, pages[index].confidence]);
            await connection.execute("UPDATE ocr_jobs SET status='succeeded',page_count=?,result_text=?,confidence=?,completed_at=NOW(3),locked_at=NULL WHERE id=? AND status='processing'", [pages.length, resultText, overall, job.id]);
            await connection.execute("INSERT IGNORE INTO usage_events (id,organization_id,job_id,event_type,quantity) VALUES (?,?,?,'ocr_pages',?)", [(0, node_crypto_1.randomUUID)(), job.organization_id, job.id, pages.length]);
        });
    }
    catch (error) {
        const code = error instanceof OcrError ? error.code : 'OCR_FAILED';
        const message = error instanceof Error ? error.message.slice(0, 500) : 'OCR processing failed';
        await db_1.db.execute("UPDATE ocr_jobs SET status='failed',error_code=?,error_message=?,completed_at=NOW(3),locked_at=NULL WHERE id=?", [code, message, job.id]);
    }
    finally {
        await promises_1.default.rm(temp, { recursive: true, force: true });
    }
}
async function runOne() { const job = await claimJob(); if (!job)
    return false; await processJob(job); return true; }
async function runtimeReadiness() {
    const checks = await Promise.allSettled([run(config_1.config.TESSERACT_PATH, ['--version'], { timeout: 5000 }), run(config_1.config.PDFTOPPM_PATH, ['-v'], { timeout: 5000 })]);
    return { tesseract: checks[0].status === 'fulfilled', poppler: checks[1].status === 'fulfilled' };
}
function naturalSort(a, b) { return a.localeCompare(b, undefined, { numeric: true }); }
function rebuildText(lines) {
    let lastLine = '';
    const output = [];
    for (const c of lines) {
        if (c.length < 12 || !c[11]?.trim())
            continue;
        const key = `${c[2]}:${c[3]}:${c[4]}`;
        if (lastLine && key !== lastLine)
            output.push('\n');
        else if (output.length && output[output.length - 1] !== '\n')
            output.push(' ');
        output.push(c[11].trim());
        lastLine = key;
    }
    return output.join('').replace(/\n +/g, '\n').trim();
}
class OcrError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
