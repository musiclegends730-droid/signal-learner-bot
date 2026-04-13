import type { Request, Response, NextFunction } from 'express';
import { createHmac } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET ?? 'slb-super-secret-key-change-in-production';

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromBase64url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

export function signJwt(payload: object): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): any | null {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    return JSON.parse(fromBase64url(body));
  } catch {
    return null;
  }
}

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  req.user = payload;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

export async function hashPassword(password: string): Promise<string> {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}
