import fs from 'node:fs/promises';
import path from 'node:path';
import { db } from '../src/server/db';

async function main() {
  const sql = await fs.readFile(path.resolve('database/schema.sql'), 'utf8');
  const statements = sql.split(/;\s*(?:\r?\n|$)/).map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) await db.query(statement);
  console.log(`Applied ${statements.length} schema statements.`);
  await db.end();
}
main().catch(async (error) => { console.error(error); await db.end(); process.exitCode = 1; });
