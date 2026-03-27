import { cookies } from 'next/headers';

import { getSessionCookieName, getSessionCookieOptions, signSession } from '@/lib/auth';
import { getUserFromSessionToken, resetPasswordWithRecoveryData } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson, parseJsonBody } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const parsed = await parseJsonBody<{
      email?: string;
      phone?: string;
      bankInfo?: string;
      newPassword?: string;
    }>(request, { maxBytes: 12 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const ip = getClientIdentifier(request);
    const ipRate = checkRateLimit(`auth:reset:ip:${ip}`, { limit: 8, windowMs: 30 * 60 * 1000 });
    const email = String(body.email ?? '').trim().toLowerCase();
    const emailRate = checkRateLimit(`auth:reset:email:${email || 'empty'}`, { limit: 5, windowMs: 30 * 60 * 1000 });
    if (!ipRate.ok || !emailRate.ok) {
      return noStoreJson({ ok: false, error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' }, { status: 429 });
    }

    await resetPasswordWithRecoveryData({
      email,
      phone: body.phone ?? '',
      bankInfo: body.bankInfo ?? '',
      newPassword: body.newPassword ?? '',
    });

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (user && user.email.toLowerCase() === email) {
      (await cookies()).set(getSessionCookieName(), signSession({ userId: user.id, role: user.role }), getSessionCookieOptions());
    }

    return noStoreJson({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo restablecer la contraseña';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

