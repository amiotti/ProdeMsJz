import { revalidatePath } from 'next/cache';

import { markUserRegistrationPaymentApproved } from '@/lib/db';
import {
  extractUserIdFromGalioRegistrationReferenceId,
  getGalioPayment,
  getGalioWebhookAuthConfig,
  isValidGalioRegistrationPaymentForUser,
} from '@/lib/galiopay';
import { noStoreJson } from '@/lib/security';

export const dynamic = 'force-dynamic';

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function getRequestAuditMeta(request: Request) {
  return {
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip')?.trim() ??
      'unknown',
    userAgent: (request.headers.get('user-agent') ?? 'unknown').slice(0, 180),
  };
}

function auditLog(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown>) {
  const payload = {
    scope: 'galio-webhook',
    event,
    at: new Date().toISOString(),
    ...data,
  };
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  fn(JSON.stringify(payload));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isWebhookAuthorized(request: Request) {
  const { secret } = getGalioWebhookAuthConfig();
  if (!secret) return true; // optional but recommended

  const candidates = [
    request.headers.get('x-galio-webhook-secret') ?? '',
    request.headers.get('x-webhook-secret') ?? '',
    request.headers.get('x-api-key') ?? '',
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '',
  ].map((v) => v.trim());

  return candidates.some((value) => value && safeEqual(value, secret));
}

function findPaymentId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const obj = payload as Record<string, unknown>;
  const direct =
    obj.paymentId ??
    obj.payment_id ??
    obj.galio_payment_id ??
    obj.id;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  if (typeof direct === 'number' && Number.isFinite(direct)) return String(direct);

  const data = obj.data;
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    const nestedId = nested.paymentId ?? nested.payment_id ?? nested.galio_payment_id ?? nested.id;
    if (typeof nestedId === 'string' && nestedId.trim()) return nestedId.trim();
    if (typeof nestedId === 'number' && Number.isFinite(nestedId)) return String(nestedId);
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const auditMeta = getRequestAuditMeta(request);
    if (!isWebhookAuthorized(request)) {
      auditLog('warn', 'unauthorized', auditMeta);
      return noStoreJson({ ok: false, error: 'Webhook no autorizado' }, { status: 401 });
    }

    let payload: unknown = null;
    try {
      payload = await request.json();
    } catch {
      payload = null;
    }

    const paymentId = findPaymentId(payload);
    if (!paymentId) {
      auditLog('warn', 'missing_payment_id', {
        ...auditMeta,
        payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload as Record<string, unknown>).slice(0, 20) : [],
      });
      return noStoreJson({ ok: false, error: 'Falta paymentId en webhook' }, { status: 400 });
    }

    const payment = await getGalioPayment(paymentId);
    const userId = extractUserIdFromGalioRegistrationReferenceId(payment.referenceId);
    if (!userId) {
      auditLog('info', 'ignored_non_prode_reference', {
        ...auditMeta,
        paymentId,
        referenceId: payment.referenceId ?? null,
      });
      return noStoreJson({ ok: true, ignored: true, reason: 'referenceId no corresponde a inscripcion PRODE' });
    }

    const valid = isValidGalioRegistrationPaymentForUser(payment, userId);
    if (!valid) {
      auditLog('warn', 'invalid_payment_for_user', {
        ...auditMeta,
        paymentId,
        userId,
        paymentStatus: payment.status ?? null,
        referenceId: payment.referenceId ?? null,
        amount: payment.amount ?? null,
        currency: payment.currency ?? null,
      });
      return noStoreJson({ ok: true, ignored: true, reason: 'pago no aprobado o datos no coinciden' });
    }

    const updatedUser = await markUserRegistrationPaymentApproved(userId, payment.id);

    revalidatePath('/predictions');
    revalidatePath('/profile');
    revalidatePath('/leaderboard');
    revalidatePath('/users');
    revalidatePath('/payment/return');

    auditLog('info', 'payment_approved', {
      ...auditMeta,
      paymentId: payment.id,
      userId,
      status: payment.status ?? null,
    });

    return noStoreJson({
      ok: true,
      approved: true,
      userId,
      paymentId: payment.id,
      registrationPaymentStatus: updatedUser.registrationPaymentStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando webhook de Galio';
    auditLog('error', 'processing_error', { message });
    return noStoreJson({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET() {
  if (isProductionRuntime()) {
    return noStoreJson({ ok: false, error: 'Not found' }, { status: 404 });
  }
  return noStoreJson({
    ok: true,
    endpoint: 'Galio webhook',
    status: 'ready',
    note: 'Configura esta URL en Galio Pay para notificaciones de pago.',
  });
}
