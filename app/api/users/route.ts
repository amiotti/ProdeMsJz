import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { adminDeleteUser, adminSetUserRegistrationPaymentStatus, createUser, getUserFromSessionToken, listUsers } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson, parseJsonBody } from '@/lib/security';

async function requireAdmin() {
  const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
  const user = await getUserFromSessionToken(token);
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return noStoreJson({ ok: false, error: 'Solo admin' }, { status: 403 });

  const users = await listUsers();
  return noStoreJson({ ok: true, users });
}

export async function DELETE(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const admin = await requireAdmin();
    if (!admin) return noStoreJson({ ok: false, error: 'Solo admin' }, { status: 403 });
    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`users:admin:delete:${admin.id}:${ip}`, { limit: 60, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return noStoreJson({ ok: false, error: 'Demasiadas acciones. Intenta mas tarde.' }, { status: 429 });

    const parsed = await parseJsonBody<{ userId?: string }>(request, { maxBytes: 8 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    if (!body.userId) return noStoreJson({ ok: false, error: 'Falta userId' }, { status: 400 });

    await adminDeleteUser(String(body.userId));
    const users = await listUsers();
    return noStoreJson({ ok: true, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el usuario';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const admin = await requireAdmin();
    if (!admin) return noStoreJson({ ok: false, error: 'Solo admin' }, { status: 403 });
    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`users:admin:create:${admin.id}:${ip}`, { limit: 40, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return noStoreJson({ ok: false, error: 'Demasiadas acciones. Intenta mas tarde.' }, { status: 429 });

    const parsed = await parseJsonBody<{
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      bankInfo?: string;
      password?: string;
    }>(request, { maxBytes: 12 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const user = await createUser({
      firstName: body.firstName ?? '',
      lastName: body.lastName ?? '',
      email: body.email ?? '',
      phone: body.phone ?? '',
      bankInfo: body.bankInfo ?? '',
      password: body.password ?? '',
      legalAcceptance: {
        acceptedTerms: true,
        acceptedPrivacy: true,
        declaredAdult: true,
        ip: 'admin-manual',
      },
    });
    return noStoreJson({ ok: true, user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar el usuario';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const admin = await requireAdmin();
    if (!admin) return noStoreJson({ ok: false, error: 'Solo admin' }, { status: 403 });
    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`users:admin:patch:${admin.id}:${ip}`, { limit: 80, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return noStoreJson({ ok: false, error: 'Demasiadas acciones. Intenta mas tarde.' }, { status: 429 });

    const parsed = await parseJsonBody<{
      userId?: string;
      registrationPaymentStatus?: 'pending' | 'approved' | 'failed';
    }>(request, { maxBytes: 8 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    if (!body.userId) return noStoreJson({ ok: false, error: 'Falta userId' }, { status: 400 });
    if (!body.registrationPaymentStatus || !['pending', 'approved', 'failed'].includes(body.registrationPaymentStatus)) {
      return noStoreJson({ ok: false, error: 'Estado de pago invalido' }, { status: 400 });
    }

    await adminSetUserRegistrationPaymentStatus(body.userId, body.registrationPaymentStatus);
    const users = await listUsers();
    return noStoreJson({ ok: true, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el pago del usuario';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}
