import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';

export async function POST(request: Request) {
  const originError = assertSameOriginForMutation(request);
  if (originError) return originError;

  (await cookies()).delete(getSessionCookieName());
  return noStoreJson({ ok: true });
}

