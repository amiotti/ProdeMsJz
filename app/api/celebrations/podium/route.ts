import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { acknowledgePodiumCelebration, getUserFromSessionToken } from '@/lib/db';
import { assertSameOriginForMutation, noStoreJson, parseJsonBody } from '@/lib/security';

export async function POST(request: Request) {
  const originError = assertSameOriginForMutation(request);
  if (originError) return originError;

  const parsed = await parseJsonBody<{ podiumKey?: string }>(request, { maxBytes: 8 * 1024 });
  if (!parsed.ok) return parsed.response;

  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user) {
    cookieStore.delete(getSessionCookieName());
    return noStoreJson({ ok: false, error: 'Sesion vencida' }, { status: 401 });
  }

  await acknowledgePodiumCelebration(user.id, String(parsed.data.podiumKey ?? ''));
  return noStoreJson({ ok: true });
}
