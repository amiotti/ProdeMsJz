import { cookies } from 'next/headers';

import { getSessionCookieName, getSessionCookieOptions, signSession } from '@/lib/auth';
import { loginUser } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const body = (await request.json()) as { email?: string; password?: string };
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
    const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión';
    return noStoreJson({ ok: false, error: message }, { status: 401 });
  }
}


