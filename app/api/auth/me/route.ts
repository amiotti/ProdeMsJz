import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  return NextResponse.json({
    ok: true,
    isAuthenticated: Boolean(user),
    user,
    isAdmin: user?.role === 'admin',
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
