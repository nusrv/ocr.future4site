import { db } from './db';
import { runOne } from './ocr';

runOne().then(async (processed) => { await db.end(); console.log(processed ? 'Processed one OCR job.' : 'No queued OCR jobs.'); }).catch(async (error) => { console.error(error); await db.end(); process.exitCode = 1; });
