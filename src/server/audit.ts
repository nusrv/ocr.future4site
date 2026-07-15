import { randomUUID } from 'node:crypto';
import { db } from './db';

export async function audit(input: {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.execute(
    `INSERT INTO audit_events (id, organization_id, actor_user_id, action, target_type, target_id, ip_address, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), input.organizationId ?? null, input.actorUserId ?? null, input.action, input.targetType,
      input.targetId ?? null, input.ip ?? null, input.metadata ? JSON.stringify(input.metadata) : null]
  );
}
