import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config';

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export function signSession(payload: { userId: string; organizationId: string }) {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '12h', issuer: 'future-ocr', audience: 'future-ocr-web' });
}

export function verifySession(token: string) {
  return jwt.verify(token, config.JWT_SECRET, { issuer: 'future-ocr', audience: 'future-ocr-web' }) as {
    userId: string;
    organizationId: string;
  };
}

export function issueApiKey() {
  const secret = `focr_${randomBytes(30).toString('base64url')}`;
  return { secret, prefix: secret.slice(0, 12), hash: hashApiKey(secret) };
}

export const hashApiKey = (key: string) => createHash('sha256').update(key).digest('hex');
