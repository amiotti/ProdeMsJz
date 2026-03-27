import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { getSessionCookieName } from '@/lib/auth';
import { getPredictionsScreenState, getUserFromSessionToken, savePredictions, saveTriviaPredictions } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson, parseJsonBody } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const parsed = await parseJsonBody<{
      predictions?: Array<{ matchId: string; homeGoals: number; awayGoals: number }>;
      triviaAnswers?: Array<{ questionId: string; answer: string }>;
    }>(request, { maxBytes: 64 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user) {
      return noStoreJson({ ok: false, error: 'Debes iniciar sesion para cargar predicciones' }, { status: 401 });
    }
    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`predictions:save:${user.id}:${ip}`, { limit: 120, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return noStoreJson({ ok: false, error: 'Demasiadas acciones. Intenta mas tarde.' }, { status: 429 });

    const result = await savePredictions(user.id, body.predictions ?? []);
    await saveTriviaPredictions(user.id, body.triviaAnswers ?? []);

    revalidatePath('/predictions');
    revalidatePath('/profile');
    revalidatePath('/leaderboard');
    revalidatePath('/');

    const state = await getPredictionsScreenState(token);
    return noStoreJson({ ok: true, state, lockedMatches: result.lockedMatches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron guardar las predicciones';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}
