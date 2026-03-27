import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { deleteUserAccount, getUserFromSessionToken, updateUserProfile } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson, parseJsonBody } from '@/lib/security';

export async function GET() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user) {
    return noStoreJson({ ok: false, error: 'No autenticado' }, { status: 401 });
  }

  return noStoreJson({ ok: true, user });
}

export async function PATCH(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const viewer = await getUserFromSessionToken(token);
    if (!viewer) {
      return noStoreJson({ ok: false, error: 'No autenticado' }, { status: 401 });
    }

    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`profile:patch:${viewer.id}:${ip}`, { limit: 30, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return noStoreJson({ ok: false, error: 'Demasiadas acciones. Intenta mas tarde.' }, { status: 429 });

    const parsed = await parseJsonBody<{
      firstName?: string;
      lastName?: string;
      phone?: string;
      bankInfo?: string;
      password?: string;
    }>(request, { maxBytes: 16 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const user = await updateUserProfile(viewer.id, {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      bankInfo: body.bankInfo,
      password: body.password,
    });

    return noStoreJson({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el perfil';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value ?? null;
    const viewer = await getUserFromSessionToken(token);
    if (!viewer) {
      return noStoreJson({ ok: false, error: 'No autenticado' }, { status: 401 });
    }
    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`profile:delete:${viewer.id}:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!rate.ok) return noStoreJson({ ok: false, error: 'Demasiadas acciones. Intenta mas tarde.' }, { status: 429 });

    await deleteUserAccount(viewer.id);
    cookieStore.delete(getSessionCookieName());
    return noStoreJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el usuario';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}
