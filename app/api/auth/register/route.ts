import { cookies } from 'next/headers';

import { getSessionCookieName, getSessionCookieOptions, signSession } from '@/lib/auth';
import { createUser } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      bankInfo?: string;
      password?: string;
      acceptedTerms?: boolean;
      acceptedPrivacy?: boolean;
      declaredAdult?: boolean;
    };

    if (!body.acceptedTerms) {
      return noStoreJson({ ok: false, error: 'Debes aceptar los Terminos y Condiciones' }, { status: 400 });
    }
    if (!body.acceptedPrivacy) {
      return noStoreJson({ ok: false, error: 'Debes aceptar la Politica de Privacidad' }, { status: 400 });
    }
    if (!body.declaredAdult) {
      return noStoreJson({ ok: false, error: 'Debes declarar ser mayor de 18 anos' }, { status: 400 });
    }

    const ip = getClientIdentifier(request);
    const ipRate = checkRateLimit(`auth:register:ip:${ip}`, { limit: 10, windowMs: 30 * 60 * 1000 });
    if (!ipRate.ok) {
      return noStoreJson({ ok: false, error: 'Demasiados registros desde este origen. Intenta mas tarde.' }, { status: 429 });
    }

    const user = await createUser({
      firstName: body.firstName ?? '',
      lastName: body.lastName ?? '',
      email: body.email ?? '',
      phone: body.phone ?? '',
      bankInfo: body.bankInfo ?? '',
      password: body.password ?? '',
      legalAcceptance: {
        acceptedTerms: Boolean(body.acceptedTerms),
        acceptedPrivacy: Boolean(body.acceptedPrivacy),
        declaredAdult: Boolean(body.declaredAdult),
        ip,
      },
    });

    const token = signSession({ userId: user.id, role: user.role });
    (await cookies()).set(getSessionCookieName(), token, getSessionCookieOptions());

    return noStoreJson({ ok: true, user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}
