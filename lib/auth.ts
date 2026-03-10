import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'prode_session';
const SESSION_IDLE_TTL_MINUTES = 15;

function secret() {
  const value = process.env.PRODE_SESSION_SECRET || process.env.INSTANTDB_ADMIN_TOKEN || 'dev-secret-change-me';
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProd && value === 'dev-secret-change-me') {
    throw new Error('Falta configurar PRODE_SESSION_SECRET en producción');
  }
  return value;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromB64url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, 'base64');
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const digest = scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [algo, salt, digest] = passwordHash.split('$');
  if (algo !== 'scrypt' || !salt || !digest) return false;
  const derived = scryptSync(password, salt, 32);
  const expected = Buffer.from(digest, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

type SessionPayload = {
  userId: string;
  role: 'admin' | 'user';
  exp: number;
};

export function signSession(payload: Omit<SessionPayload, 'exp'> & { exp?: number }) {
  const exp = payload.exp ?? Date.now() + SESSION_IDLE_TTL_MINUTES * 60 * 1000;
  const body = b64url(JSON.stringify({ userId: payload.userId, role: payload.role, exp }));
  const sig = b64url(createHmac('sha256', secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expectedSig = b64url(createHmac('sha256', secret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload;
    if (!payload?.userId || !payload?.role || !payload?.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_IDLE_TTL_MINUTES * 60,
  };
}

export function getSessionIdleTimeoutMs() {
  return SESSION_IDLE_TTL_MINUTES * 60 * 1000;
}
