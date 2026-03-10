import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName, getSessionCookieOptions, signSession } from '@/lib/auth';
import { getUserFromSessionToken } from '@/lib/db';
import { noStoreJson } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (user) {
    cookieStore.set(getSessionCookieName(), signSession({ userId: user.id, role: user.role }), getSessionCookieOptions());
  }
  return noStoreJson({
    ok: true,
    isAuthenticated: Boolean(user),
    user,
    isAdmin: user?.role === 'admin',
  });
}


