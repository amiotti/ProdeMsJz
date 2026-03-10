import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getResultsScreenState, getUserFromSessionToken, saveOfficialResults } from '@/lib/db';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';

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

    const body = (await request.json()) as {
      results?: Array<{ matchId: string; home: number; away: number }>;
    };

    await saveOfficialResults(body.results ?? []);
    const state = await getResultsScreenState(token);
    return noStoreJson({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron guardar los resultados';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

