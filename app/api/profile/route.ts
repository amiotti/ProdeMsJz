import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { deleteUserAccount, getUserFromSessionToken, updateUserProfile } from '@/lib/db';

export async function GET() {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user });
}

export async function PATCH(request: Request) {
  try {
    const token = cookies().get(getSessionCookieName())?.value ?? null;
    const viewer = await getUserFromSessionToken(token);
    if (!viewer) {
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
    }

    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      photoDataUrl?: string | null;
      password?: string;
    };

    const user = await updateUserProfile(viewer.id, {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      photoDataUrl: body.photoDataUrl,
      password: body.password,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el perfil';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(getSessionCookieName())?.value ?? null;
    const viewer = await getUserFromSessionToken(token);
    if (!viewer) {
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
    }

    await deleteUserAccount(viewer.id);
    cookieStore.delete(getSessionCookieName());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el usuario';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
