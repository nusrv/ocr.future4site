import type { Request } from 'express';

export type AuthContext = {
  userId: string | null;
  organizationId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'api';
  systemRole: 'user' | 'admin';
  method: 'session' | 'api-key';
};

export type AuthenticatedRequest = Request<any, any, any, any> & { auth: AuthContext };
