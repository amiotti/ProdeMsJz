import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getResultsScreenState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const state = await getResultsScreenState(token);
  return NextResponse.json(state);
}
