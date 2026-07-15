"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
const node_crypto_1 = require("node:crypto");
const db_1 = require("./db");
async function audit(input) {
    await db_1.db.execute(`INSERT INTO audit_events (id, organization_id, actor_user_id, action, target_type, target_id, ip_address, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [(0, node_crypto_1.randomUUID)(), input.organizationId ?? null, input.actorUserId ?? null, input.action, input.targetType,
        input.targetId ?? null, input.ip ?? null, input.metadata ? JSON.stringify(input.metadata) : null]);
}
