import { cookies } from 'next/headers';

import { getSessionCookieName } from '@/lib/auth';
import { getUserFromSessionToken, markUserRegistrationPaymentApproved } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { assertSameOriginForMutation, noStoreJson, parseJsonBody } from '@/lib/security';
import { getTaloPayment, isValidTaloRegistrationPaymentForUser } from '@/lib/talopay';

function getPendingPaymentIdFromReceipt(receipt: string | null | undefined) {
  const value = String(receipt ?? '').trim();
  const prefix = 'talo_pending:';
  if (!value.startsWith(prefix)) return null;
  const id = value.slice(prefix.length).trim();
  return id || null;
}

export async function POST(request: Request) {
  try {
    const originError = assertSameOriginForMutation(request);
    if (originError) return originError;

    const token = (await cookies()).get(getSessionCookieName())?.value ?? null;
    const user = await getUserFromSessionToken(token);
    if (!user) return noStoreJson({ ok: false, error: 'Debes iniciar sesion' }, { status: 401 });
    if (user.role === 'admin') return noStoreJson({ ok: false, error: 'El admin no requiere pago' }, { status: 400 });

    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`pay:talo:sync:${user.id}:${ip}`, { limit: 30, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) return noStoreJson({ ok: false, error: 'Demasiados intentos. Intenta mas tarde.' }, { status: 429 });

    const parsed = await parseJsonBody<{ paymentId?: string }>(request, { maxBytes: 8 * 1024, allowEmpty: true });
    if (!parsed.ok) return parsed.response;
    const paymentIdFromBody = String(parsed.data.paymentId ?? '').trim();
    const paymentId = paymentIdFromBody || getPendingPaymentIdFromReceipt(user.registrationPaymentReceipt);
    if (!paymentId) {
      return noStoreJson(
        {
          ok: false,
          error: 'No encontramos un paymentId pendiente para este usuario.',
        },
        { status: 400 },
      );
    }

    const payment = await getTaloPayment(paymentId);
    const valid = isValidTaloRegistrationPaymentForUser(payment, user.id, {
      expectedPaymentId: paymentId,
      allowMissingExternalIdForExpectedPaymentId: true,
    });
    if (!valid) {
      return noStoreJson(
        {
          ok: false,
          approved: false,
          paymentId,
          paymentStatus: payment.payment_status ?? payment.status ?? payment.state ?? null,
          error: 'El pago existe, pero todavía no figura como aprobado por Talo.',
        },
        { status: 409 },
      );
    }

    const updated = await markUserRegistrationPaymentApproved(user.id, paymentId);
    return noStoreJson({
      ok: true,
      approved: true,
      paymentId,
      registrationPaymentStatus: updated.registrationPaymentStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo sincronizar el pago';
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

