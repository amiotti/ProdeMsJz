import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getResultsScreenState } from '@/lib/db';
import { noStoreJson } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const state = await getResultsScreenState(token);
  return noStoreJson(state);
}


