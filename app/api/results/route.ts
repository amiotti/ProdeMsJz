import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getResultsScreenState, getUserFromSessionToken, saveOfficialResults, saveOfficialTriviaResults } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson, parseJsonBody } from '@/lib/security';

export async function GET() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const state = await getResultsScreenState(token);
  return noStoreJson({ ok: true, state });
}

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user || user.role !== 'admin') {
      return noStoreJson({ ok: false, error: 'Solo el administrador puede cargar resultados oficiales' }, { status: 403 });
    }

    const parsed = await parseJsonBody<{
      results?: Array<{ matchId: string; home: number; away: number }>;
      triviaResults?: Array<{ questionId: string; answer: string }>;
      clearMatchIds?: string[];
      clearTriviaQuestionIds?: string[];
    }>(request, { maxBytes: 64 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`results:admin:${user.id}:${ip}`, { limit: 120, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return noStoreJson({ ok: false, error: 'Demasiadas acciones. Intenta mas tarde.' }, { status: 429 });

    await saveOfficialResults(body.results ?? [], body.clearMatchIds ?? []);
    await saveOfficialTriviaResults(body.triviaResults ?? [], body.clearTriviaQuestionIds ?? []);

    const state = await getResultsScreenState(token);
    return noStoreJson({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron guardar los resultados';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}
