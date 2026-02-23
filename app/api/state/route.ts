import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getState } from '@/lib/db';
import { getSessionCookieName } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = cookies().get(getSessionCookieName())?.value ?? null;
  const state = await getState(token);
  return NextResponse.json(state);
}
