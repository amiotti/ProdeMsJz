import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getState, getUserFromSessionToken } from '@/lib/db';
import { noStoreJson } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user || user.role !== 'admin') {
    return noStoreJson({ ok: false, error: 'Solo admin' }, { status: 403 });
  }

  const state = await getState(token);
  return noStoreJson(state);
}

