import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { adminDeleteUser, createUser, getUserFromSessionToken, listUsers } from '@/lib/db';

async function requireAdmin() {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: 'Solo admin' }, { status: 403 });

  const users = await listUsers();
  return NextResponse.json({ ok: true, users });
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: 'Solo admin' }, { status: 403 });

    const body = (await request.json()) as { userId?: string };
    if (!body.userId) return NextResponse.json({ ok: false, error: 'Falta userId' }, { status: 400 });
    await adminDeleteUser(body.userId);
    const users = await listUsers();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el usuario';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      photoDataUrl?: string | null;
      password?: string;
    };
    const user = await createUser({
      firstName: body.firstName ?? '',
      lastName: body.lastName ?? '',
      email: body.email ?? '',
      phone: body.phone ?? '',
      photoDataUrl: body.photoDataUrl ?? null,
      password: body.password ?? '',
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar el usuario';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
