import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken, markUserRegistrationPaymentPending } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';
import { createTaloRegistrationPaymentLink } from '@/lib/talopay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);

    if (!user) {
      return noStoreJson({ ok: false, error: 'Debes iniciar sesion para generar el pago' }, { status: 401 });
    }
    if (user.role === 'admin') {
      return noStoreJson({ ok: false, error: 'El administrador no requiere pago de inscripcion' }, { status: 400 });
    }

    const ip = getClientIdentifier(request);
    const limit = checkRateLimit(`paylink:${user.id}:${ip}`, { limit: 12, windowMs: 10 * 60 * 1000 });
    if (!limit.ok) {
      return noStoreJson({ ok: false, error: 'Demasiados intentos de generar pagos. Intenta mas tarde.' }, { status: 429 });
    }

    const result = await createTaloRegistrationPaymentLink({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });

    if (result.paymentId) {
      await markUserRegistrationPaymentPending(user.id, result.paymentId);
    }

    return noStoreJson({ ok: true, url: result.url, paymentId: result.paymentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el link de pago (TaloPay)';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}
