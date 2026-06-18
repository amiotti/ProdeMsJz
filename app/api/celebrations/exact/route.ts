import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { acknowledgeExactCelebrations, getUserFromSessionToken } from '@/lib/db';
import { assertSameOriginForMutation, noStoreJson, parseJsonBody } from '@/lib/security';

export async function POST(request: Request) {
  const originError = assertSameOriginForMutation(request);
  if (originError) return originError;

  const parsed = await parseJsonBody<{ matchIds?: string[] }>(request, { maxBytes: 8 * 1024 });
  if (!parsed.ok) return parsed.response;

  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user) {
    cookieStore.delete(getSessionCookieName());
    return noStoreJson({ ok: false, error: 'Sesion vencida' }, { status: 401 });
  }

  const matchIds = Array.isArray(parsed.data.matchIds) ? parsed.data.matchIds.slice(0, 32) : [];
  await acknowledgeExactCelebrations(user.id, matchIds);
  return noStoreJson({ ok: true });
}
