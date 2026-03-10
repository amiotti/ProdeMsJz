import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { createUserLeaderboardGroup, deleteUserLeaderboardGroup, getUserFromSessionToken, listUserLeaderboardGroups } from '@/lib/db';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user) {
    return noStoreJson({ ok: false, error: 'No autenticado' }, { status: 401 });
  }

  const groups = await listUserLeaderboardGroups(user.id);
  return noStoreJson({ ok: true, groups });
}

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user) {
      return noStoreJson({ ok: false, error: 'No autenticado' }, { status: 401 });
    }

    const body = (await request.json()) as { name?: string; userIds?: string[] };
    const group = await createUserLeaderboardGroup(user.id, {
      name: body.name ?? '',
      userIds: Array.isArray(body.userIds) ? body.userIds : [],
    });

    return noStoreJson({ ok: true, group });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el grupo';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user) {
      return noStoreJson({ ok: false, error: 'No autenticado' }, { status: 401 });
    }

    const body = (await request.json()) as { groupId?: string };
    if (!body.groupId) {
      return noStoreJson({ ok: false, error: 'groupId es obligatorio' }, { status: 400 });
    }

    await deleteUserLeaderboardGroup(user.id, body.groupId);
    return noStoreJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el grupo';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

