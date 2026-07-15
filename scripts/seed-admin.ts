import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, transaction } from '../src/server/db';
import { hashPassword } from '../src/server/security';

const input = z.object({ ADMIN_EMAIL: z.string().email(), ADMIN_PASSWORD: z.string().min(14) }).parse(process.env);
async function main() {
  const userId = randomUUID(); const orgId = randomUUID();
  await transaction(async (connection) => {
    await connection.execute("INSERT IGNORE INTO organizations (id,name,slug,plan_code,monthly_page_limit) VALUES (?,'Future OCR Operations','future-ocr-operations','internal',10000000)", [orgId]);
    const [existing] = await connection.query<any[]>('SELECT id FROM users WHERE email=?', [input.ADMIN_EMAIL.toLowerCase()]);
    const actualUser = existing[0]?.id ?? userId;
    if (!existing[0]) await connection.execute("INSERT INTO users (id,email,password_hash,name,system_role) VALUES (?,?,?,'System Administrator','admin')", [userId, input.ADMIN_EMAIL.toLowerCase(), await hashPassword(input.ADMIN_PASSWORD)]);
    else await connection.execute("UPDATE users SET system_role='admin' WHERE id=?", [actualUser]);
    await connection.execute("INSERT IGNORE INTO memberships (organization_id,user_id,role) VALUES (?,?,'owner')", [orgId, actualUser]);
  });
  console.log('Administrator account is ready. Remove ADMIN_PASSWORD from the environment now.'); await db.end();
}
main().catch(async (error) => { console.error(error); await db.end(); process.exitCode = 1; });
