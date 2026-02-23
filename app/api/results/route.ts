import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getResultsScreenState, getUserFromSessionToken, saveOfficialResults } from '@/lib/db';

export async function GET() {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const state = await getResultsScreenState(token);
  return NextResponse.json({ ok: true, state });
}

export async function POST(request: Request) {
  try {
    const token = cookies().get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Solo el administrador puede cargar resultados oficiales' }, { status: 403 });
    }

    const body = (await request.json()) as {
      results?: Array<{ matchId: string; home: number; away: number }>;
    };

    await saveOfficialResults(body.results ?? []);
    const state = await getResultsScreenState(token);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron guardar los resultados';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
