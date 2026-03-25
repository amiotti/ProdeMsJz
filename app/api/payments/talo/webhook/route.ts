import { revalidatePath } from 'next/cache';

import { markUserRegistrationPaymentApproved } from '@/lib/db';
import { noStoreJson } from '@/lib/security';
import {
  extractUserIdFromTaloRegistrationExternalId,
  getTaloPayment,
  getTaloWebhookAuthConfig,
  isValidTaloRegistrationPaymentForUser,
} from '@/lib/talopay';

export const dynamic = 'force-dynamic';

function normalizeIp(value: string | null) {
  return value?.split(',')[0]?.trim() || null;
}

function getRequestAuditMeta(request: Request) {
  return {
    ip:
      normalizeIp(request.headers.get('cf-connecting-ip')) ??
      normalizeIp(request.headers.get('x-vercel-forwarded-for')) ??
      normalizeIp(request.headers.get('x-forwarded-for')) ??
      normalizeIp(request.headers.get('x-real-ip')) ??
      'unknown',
    userAgent: (request.headers.get('user-agent') ?? 'unknown').slice(0, 180),
  };
}

function auditLog(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown>) {
  const payload = {
    scope: 'talo-webhook',
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
  const { secret } = getTaloWebhookAuthConfig();
  if (!secret) return { ok: true as const, reason: 'not_required' as const };

  const queryToken = (() => {
    try {
      const url = new URL(request.url);
      return (url.searchParams.get('token') ?? '').trim();
    } catch {
      return '';
    }
  })();

  const candidates = [
    queryToken,
    request.headers.get('x-talo-webhook-secret') ?? '',
    request.headers.get('x-webhook-secret') ?? '',
    request.headers.get('x-api-key') ?? '',
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '',
  ].map((v) => v.trim());

  const match = candidates.some((value) => value && safeEqual(value, secret));
  return { ok: match, reason: match ? 'ok' : 'invalid_secret' } as const;
}

function findPaymentId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const obj = payload as Record<string, unknown>;
  const direct = obj.paymentId ?? obj.payment_id ?? obj.id;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (typeof direct === 'number' && Number.isFinite(direct)) return String(direct);

  const data = obj.data;
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    const nestedId = nested.paymentId ?? nested.payment_id ?? nested.id;
    if (typeof nestedId === 'string' && nestedId.trim()) return nestedId.trim();
    if (typeof nestedId === 'number' && Number.isFinite(nestedId)) return String(nestedId);
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const auditMeta = getRequestAuditMeta(request);
    const auth = isWebhookAuthorized(request);
    if (!auth.ok) {
      auditLog('warn', 'unauthorized', { ...auditMeta, reason: auth.reason });
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

    const payment = await getTaloPayment(paymentId);
    const userId = extractUserIdFromTaloRegistrationExternalId(payment.external_id);
    if (!userId) {
      auditLog('info', 'ignored_non_prode_reference', {
        ...auditMeta,
        paymentId,
        externalId: payment.external_id ?? null,
      });
      return noStoreJson({ ok: true, ignored: true, reason: 'external_id no corresponde a inscripcion PRODE' });
    }

    const valid = isValidTaloRegistrationPaymentForUser(payment, userId);
    if (!valid) {
      auditLog('warn', 'invalid_payment_for_user', {
        ...auditMeta,
        paymentId,
        userId,
        paymentStatus: payment.payment_status ?? payment.status ?? null,
        externalId: payment.external_id ?? null,
        amount: payment.price?.amount ?? payment.amount ?? null,
        currency: payment.price?.currency ?? payment.currency ?? null,
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
      status: payment.payment_status ?? payment.status ?? null,
    });

    return noStoreJson({
      ok: true,
      approved: true,
      userId,
      paymentId: payment.id,
      registrationPaymentStatus: updatedUser.registrationPaymentStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando webhook de Talo';
    auditLog('error', 'processing_error', { message });
    return noStoreJson({ ok: false, error: 'No se pudo procesar el webhook' }, { status: 400 });
  }
}

export async function GET() {
  return noStoreJson({
    ok: true,
    endpoint: 'Talo webhook',
    status: 'ready',
    note: 'Si configuras TALOPAY_WEBHOOK_SECRET, agrega el token en la URL del webhook.',
  });
}
