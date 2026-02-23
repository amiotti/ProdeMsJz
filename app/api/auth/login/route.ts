import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName, getSessionCookieOptions, signSession } from '@/lib/auth';
import { loginUser } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const user = await loginUser({ email: body.email ?? '', password: body.password ?? '' });
    const token = signSession({ userId: user.id, role: user.role });
    cookies().set(getSessionCookieName(), token, getSessionCookieOptions());
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo iniciar sesion';
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}
