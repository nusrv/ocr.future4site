"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const ocr_1 = require("./ocr");
(0, ocr_1.runOne)().then(async (processed) => { await db_1.db.end(); console.log(processed ? 'Processed one OCR job.' : 'No queued OCR jobs.'); }).catch(async (error) => { console.error(error); await db_1.db.end(); process.exitCode = 1; });
