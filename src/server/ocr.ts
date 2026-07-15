import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { config } from './config';
import { db, rows, transaction } from './db';

const run = promisify(execFile);
type Job = import('mysql2').RowDataPacket & { id: string; organization_id: string; source_path: string; media_type: string; language: string };

export async function claimJob(): Promise<Job | null> {
  return transaction(async (connection) => {
    const [jobs] = await connection.query<Job[]>("SELECT id,organization_id,source_path,media_type,language FROM ocr_jobs WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED");
    if (!jobs[0]) return null;
    await connection.execute("UPDATE ocr_jobs SET status='processing',worker_id=?,locked_at=NOW(3),started_at=COALESCE(started_at,NOW(3)),attempt_count=attempt_count+1 WHERE id=?", [config.OCR_WORKER_ID, jobs[0].id]);
    return jobs[0];
  });
}

export async function processJob(job: Job) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'future-ocr-'));
  try {
    let images: string[];
    if (job.media_type === 'application/pdf') {
      const prefix = path.join(temp, 'page');
      await run(config.PDFTOPPM_PATH, ['-png', '-r', '300', '-f', '1', '-l', String(config.MAX_PDF_PAGES), job.source_path, prefix], { timeout: 120000, maxBuffer: 2_000_000 });
      images = (await fs.readdir(temp)).filter((f) => /^page-.*\.png$/i.test(f)).sort(naturalSort).map((f) => path.join(temp, f));
    } else images = [job.source_path];
    if (!images.length) throw new OcrError('NO_PAGES', 'No processable pages were found');
    if (images.length > config.MAX_PDF_PAGES) throw new OcrError('PAGE_LIMIT', 'The PDF exceeds the configured page limit');

    const pages: Array<{ text: string; confidence: number | null }> = [];
    for (const image of images) {
      const { stdout } = await run(config.TESSERACT_PATH, [image, 'stdout', '-l', job.language, '--oem', '1', '--psm', '3', 'tsv'], { timeout: 120000, maxBuffer: 20_000_000 });
      const lines = stdout.split(/\r?\n/).slice(1).map((line) => line.split('\t'));
      const words = lines.filter((c) => c.length >= 12 && Number(c[10]) >= 0 && c[11]?.trim());
      const confidence = words.length ? words.reduce((sum, c) => sum + Number(c[10]), 0) / words.length : null;
      const text = rebuildText(lines);
      pages.push({ text, confidence });
    }
    const resultText = pages.map((p) => p.text).join('\n\f\n');
    const overall = pages.some((p) => p.confidence !== null) ? pages.reduce((s, p) => s + (p.confidence ?? 0), 0) / pages.filter((p) => p.confidence !== null).length : null;
    await transaction(async (connection) => {
      for (let index = 0; index < pages.length; index++) await connection.execute('INSERT INTO ocr_pages (id,job_id,page_number,text,confidence) VALUES (?,?,?,?,?)', [randomUUID(), job.id, index + 1, pages[index].text, pages[index].confidence]);
      await connection.execute("UPDATE ocr_jobs SET status='succeeded',page_count=?,result_text=?,confidence=?,completed_at=NOW(3),locked_at=NULL WHERE id=? AND status='processing'", [pages.length, resultText, overall, job.id]);
      await connection.execute("INSERT IGNORE INTO usage_events (id,organization_id,job_id,event_type,quantity) VALUES (?,?,?,'ocr_pages',?)", [randomUUID(), job.organization_id, job.id, pages.length]);
    });
  } catch (error) {
    const code = error instanceof OcrError ? error.code : 'OCR_FAILED';
    const message = error instanceof Error ? error.message.slice(0, 500) : 'OCR processing failed';
    await db.execute("UPDATE ocr_jobs SET status='failed',error_code=?,error_message=?,completed_at=NOW(3),locked_at=NULL WHERE id=?", [code, message, job.id]);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}

export async function runOne() { const job = await claimJob(); if (!job) return false; await processJob(job); return true; }
export async function runtimeReadiness() {
  const checks = await Promise.allSettled([run(config.TESSERACT_PATH, ['--version'], { timeout: 5000 }), run(config.PDFTOPPM_PATH, ['-v'], { timeout: 5000 })]);
  return { tesseract: checks[0].status === 'fulfilled', poppler: checks[1].status === 'fulfilled' };
}

function naturalSort(a: string, b: string) { return a.localeCompare(b, undefined, { numeric: true }); }
function rebuildText(lines: string[][]) {
  let lastLine = ''; const output: string[] = [];
  for (const c of lines) { if (c.length < 12 || !c[11]?.trim()) continue; const key = `${c[2]}:${c[3]}:${c[4]}`; if (lastLine && key !== lastLine) output.push('\n'); else if (output.length && output[output.length - 1] !== '\n') output.push(' '); output.push(c[11].trim()); lastLine = key; }
  return output.join('').replace(/\n +/g, '\n').trim();
}
class OcrError extends Error { constructor(public code: string, message: string) { super(message); } }
