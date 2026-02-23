import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken } from '@/lib/db';
import { createRegistrationPreference } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const token = cookies().get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Debes iniciar sesion para generar el pago' }, { status: 401 });
    }

    if (user.role === 'admin') {
      return NextResponse.json({ ok: false, error: 'El administrador no requiere pago de inscripcion' }, { status: 400 });
    }

    const preference = await createRegistrationPreference({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });

    return NextResponse.json({
      ok: true,
      preferenceId: preference.id,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
    });
  } catch (error) {
    const err = error as any;
    const message =
      typeof err?.message === 'string'
        ? err.message
        : typeof err?.cause?.message === 'string'
          ? err.cause.message
          : 'No se pudo generar la preferencia de pago';

    return NextResponse.json(
      {
        ok: false,
        error: message,
        details: {
          code: err?.code ?? err?.cause?.code ?? null,
          status: err?.status ?? err?.cause?.status ?? null,
          blocked_by: err?.blocked_by ?? err?.cause?.blocked_by ?? null,
        },
        hint:
          process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('APP_USR-') && process.env.APP_BASE_URL?.includes('localhost')
            ? 'Estas usando credenciales de produccion (APP_USR) con localhost. Para simulacro con tarjetas de prueba usa credenciales TEST y usuarios/tarjetas de prueba de Mercado Pago.'
            : null,
      },
      { status: 400 },
    );
  }
}
