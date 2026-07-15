import type { NextFunction, Request, Response } from 'express';
import { rows } from './db';
import { hashApiKey, verifySession } from './security';
import type { AuthenticatedRequest, AuthContext } from './types';

type SessionRow = import('mysql2').RowDataPacket & {
  user_id: string; organization_id: string; role: AuthContext['role']; system_role: AuthContext['systemRole']; status: string;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const bearer = req.header('authorization');
    if (bearer?.startsWith('Bearer focr_')) {
      const keyHash = hashApiKey(bearer.slice(7));
      const found = await rows<SessionRow[]>(
        `SELECT k.organization_id, k.created_by user_id, 'api' role, u.system_role, o.status
         FROM api_keys k JOIN organizations o ON o.id=k.organization_id JOIN users u ON u.id=k.created_by
         WHERE k.key_hash=? AND k.revoked_at IS NULL AND (k.expires_at IS NULL OR k.expires_at > NOW()) LIMIT 1`, [keyHash]);
      if (!found[0] || found[0].status !== 'active') return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } });
      (req as AuthenticatedRequest).auth = { userId: found[0].user_id, organizationId: found[0].organization_id, role: 'api', systemRole: found[0].system_role, method: 'api-key' };
      void import('./db').then(({ db }) => db.execute('UPDATE api_keys SET last_used_at=NOW(3) WHERE key_hash=?', [keyHash]));
      return next();
    }

    const token = req.cookies?.focr_session;
    if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sign in required' } });
    const session = verifySession(token);
    const found = await rows<SessionRow[]>(
      `SELECT m.user_id, m.organization_id, m.role, u.system_role, o.status
       FROM memberships m JOIN users u ON u.id=m.user_id JOIN organizations o ON o.id=m.organization_id
       WHERE m.user_id=? AND m.organization_id=? AND u.disabled_at IS NULL LIMIT 1`, [session.userId, session.organizationId]);
    if (!found[0] || found[0].status !== 'active') return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Session is no longer active' } });
    (req as AuthenticatedRequest).auth = { userId: found[0].user_id, organizationId: found[0].organization_id, role: found[0].role, systemRole: found[0].system_role, method: 'session' };
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication failed' } });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as AuthenticatedRequest).auth.systemRole !== 'admin') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Administrator access required' } });
  next();
}
