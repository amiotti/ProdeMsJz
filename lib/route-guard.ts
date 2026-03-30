import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken } from '@/lib/db';

export async function requireAuthenticatedUser() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user) {
    redirect('/login');
  }
  return { token, user };
}
