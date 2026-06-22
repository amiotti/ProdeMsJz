import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getLeaderboardParticipantDetail, getUserFromSessionToken } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { noStoreJson } from '@/lib/security';
import type { LeaderboardScope } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_SCOPES = new Set<LeaderboardScope>(['general', 'groups', 'knockout']);

export async function GET(request: Request) {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const viewer = await getUserFromSessionToken(token);
  if (!viewer) {
    return noStoreJson({ ok: false, error: 'No autenticado' }, { status: 401 });
  }
  if (viewer.role !== 'admin' && viewer.registrationPaymentStatus !== 'approved') {
    return noStoreJson({ ok: false, error: 'Inscripción no aprobada' }, { status: 403 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId')?.trim() ?? '';
  const scope = url.searchParams.get('scope') as LeaderboardScope | null;
  if (!userId || userId.length > 80 || !scope || !VALID_SCOPES.has(scope)) {
    return noStoreJson({ ok: false, error: 'Parámetros inválidos' }, { status: 400 });
  }

  const ip = getClientIdentifier(request);
  const rate = checkRateLimit(`leaderboard:detail:${viewer.id}:${ip}`, { limit: 120, windowMs: 10 * 60 * 1000 });
  if (!rate.ok) {
    return noStoreJson({ ok: false, error: 'Demasiadas consultas. Intenta más tarde.' }, { status: 429 });
  }

  const detail = await getLeaderboardParticipantDetail(userId, scope);
  if (!detail) {
    return noStoreJson({ ok: false, error: 'Participante no encontrado' }, { status: 404 });
  }

  return noStoreJson({ ok: true, detail });
}
