import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken } from '@/lib/db';
import { createGalioRegistrationPaymentLink } from '@/lib/galiopay';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);

    if (!user) {
      return noStoreJson({ ok: false, error: 'Debes iniciar sesiÃ³n para generar el pago' }, { status: 401 });
    }
    if (user.role === 'admin') {
      return noStoreJson({ ok: false, error: 'El administrador no requiere pago de inscripciÃ³n' }, { status: 400 });
    }

    const ip = getClientIdentifier(request);
    const limit = checkRateLimit(`paylink:${user.id}:${ip}`, { limit: 12, windowMs: 10 * 60 * 1000 });
    if (!limit.ok) {
      return noStoreJson({ ok: false, error: 'Demasiados intentos de generar pagos. Intenta mÃ¡s tarde.' }, { status: 429 });
    }

    const result = await createGalioRegistrationPaymentLink({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return noStoreJson({ ok: true, url: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el link de pago (GalioPay)';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

