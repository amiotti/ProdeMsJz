import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { deleteUserAccount, getUserFromSessionToken, updateUserProfile } from '@/lib/db';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';

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

    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      bankInfo?: string;
      password?: string;
    };

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

    await deleteUserAccount(viewer.id);
    cookieStore.delete(getSessionCookieName());
    return noStoreJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el usuario';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

