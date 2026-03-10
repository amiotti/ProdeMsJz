import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { adminUpdateContactMessageStatus, createContactMessage, getUserFromSessionToken, listContactMessages } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson } from '@/lib/security';
import type { ContactMessageStatus } from '@/lib/types';

async function requireAdmin() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return noStoreJson({ ok: false, error: 'Solo admin' }, { status: 403 });

  const messages = await listContactMessages();
  return noStoreJson({ ok: true, messages });
}

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`contact:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!rate.ok) {
      return noStoreJson({ ok: false, error: 'Demasiados envíos. Intenta nuevamente en un rato.' }, { status: 429 });
    }

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };

    const message = await createContactMessage({
      userId: user?.id ?? null,
      name: body.name ?? '',
      email: body.email ?? '',
      phone: body.phone ?? '',
      message: body.message ?? '',
    });

    return noStoreJson({ ok: true, message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo enviar la consulta';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const admin = await requireAdmin();
    if (!admin) return noStoreJson({ ok: false, error: 'Solo admin' }, { status: 403 });

    const body = (await request.json()) as { messageId?: string; status?: ContactMessageStatus };
    if (!body.messageId) return noStoreJson({ ok: false, error: 'Falta messageId' }, { status: 400 });
    if (!body.status || !['new', 'contacted', 'resolved'].includes(body.status)) {
      return noStoreJson({ ok: false, error: 'Estado inválido' }, { status: 400 });
    }

    await adminUpdateContactMessageStatus(body.messageId, body.status);
    const messages = await listContactMessages();
    return noStoreJson({ ok: true, messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la consulta';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

