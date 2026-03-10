import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { getSessionCookieName } from '@/lib/auth';
import { getPredictionsScreenState, getUserFromSessionToken, savePredictions } from '@/lib/db';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const body = (await request.json()) as {
      predictions?: Array<{ matchId: string; homeGoals: number; awayGoals: number }>;
    };

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user) {
      return noStoreJson({ ok: false, error: 'Debes iniciar sesiÃ³n para cargar predicciones' }, { status: 401 });
    }

    const result = await savePredictions(user.id, body.predictions ?? []);
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

