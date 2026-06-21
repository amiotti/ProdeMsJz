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

    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user) {
      cookieStore.delete(getSessionCookieName());
      return noStoreJson({ ok: false, error: 'Debes iniciar sesion para cargar predicciones' }, { status: 401 });
    }
    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`predictions:save:${user.id}:${ip}`, { limit: 120, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return noStoreJson({ ok: false, error: 'Demasiadas acciones. Intenta mas tarde.' }, { status: 429 });

    const predictionItems = Array.isArray(body.predictions) ? body.predictions : [];
    const triviaItems = Array.isArray(body.triviaAnswers) ? body.triviaAnswers : [];
    const result = predictionItems.length > 0
      ? await savePredictions(user.id, predictionItems)
      : { savedMatchIds: [], lockedMatches: [], invalidMatches: [] };
    if (triviaItems.length > 0) {
      await saveTriviaPredictions(user.id, triviaItems);
    }

    revalidatePath('/predictions');
    revalidatePath('/profile');
    revalidatePath('/leaderboard');
    revalidatePath('/');

    const state = await getPredictionsScreenState(token);
    return noStoreJson({
      ok: true,
      state,
      savedMatchIds: result.savedMatchIds,
      lockedMatches: result.lockedMatches,
      invalidMatches: result.invalidMatches,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron guardar las predicciones';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}
