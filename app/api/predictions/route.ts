import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getPredictionsScreenState, getUserFromSessionToken, savePredictions } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      predictions?: Array<{ matchId: string; homeGoals: number; awayGoals: number }>;
    };
    const token = cookies().get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Debes iniciar sesion para cargar predicciones' }, { status: 401 });
    }

    const result = await savePredictions(user.id, body.predictions ?? []);
    const state = await getPredictionsScreenState(token);
    return NextResponse.json({ ok: true, state, lockedMatches: result.lockedMatches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron guardar las predicciones';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
