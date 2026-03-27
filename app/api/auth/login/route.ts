import { cookies } from 'next/headers';

import { getSessionCookieName, getSessionCookieOptions, signSession } from '@/lib/auth';
import { loginUser } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson, parseJsonBody } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const parsed = await parseJsonBody<{ email?: string; password?: string }>(request, { maxBytes: 8 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const email = String(body.email ?? '').trim().toLowerCase();

    const ip = getClientIdentifier(request);
    const ipRate = checkRateLimit(`auth:login:ip:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 });
    const emailRate = checkRateLimit(`auth:login:email:${email || 'empty'}`, { limit: 10, windowMs: 10 * 60 * 1000 });
    if (!ipRate.ok || !emailRate.ok) {
      return noStoreJson({ ok: false, error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, { status: 429 });
    }

    const user = await loginUser({ email, password: body.password ?? '' });
    const token = signSession({ userId: user.id, role: user.role });
    (await cookies()).set(getSessionCookieName(), token, getSessionCookieOptions());
    return noStoreJson({ ok: true, user });
  } catch (error) {
    if (error instanceof Error) {
      console.warn('auth.login.failed', { message: error.message });
    }
    return noStoreJson({ ok: false, error: 'Credenciales invalidas' }, { status: 401 });
  }
}
