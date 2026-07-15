"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const db_1 = require("../src/server/db");
async function main() {
    const sql = await promises_1.default.readFile(node_path_1.default.resolve('database/schema.sql'), 'utf8');
    const statements = sql.split(/;\s*(?:\r?\n|$)/).map((s) => s.trim()).filter(Boolean);
    for (const statement of statements)
        await db_1.db.query(statement);
    console.log(`Applied ${statements.length} schema statements.`);
    await db_1.db.end();
}
main().catch(async (error) => { console.error(error); await db_1.db.end(); process.exitCode = 1; });
