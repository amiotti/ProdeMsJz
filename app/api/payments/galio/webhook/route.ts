import { revalidatePath } from 'next/cache';

import { markUserRegistrationPaymentApproved } from '@/lib/db';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import {
  extractUserIdFromGalioRegistrationReferenceId,
  getGalioPayment,
  getGalioWebhookAuthConfig,
  isValidGalioRegistrationPaymentForUser,
} from '@/lib/galiopay';
import { noStoreJson, parseJsonBody } from '@/lib/security';

export const dynamic = 'force-dynamic';

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

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

  if (!secret) {
    const allowInsecureLocal = process.env.GALIOPAY_WEBHOOK_ALLOW_INSECURE_LOCAL === 'true';
    if (!isProductionRuntime() && allowInsecureLocal) {
      return { ok: true as const, reason: 'insecure_local_override' as const };
    }
    return { ok: false as const, reason: 'missing_secret' as const };
  }

  const candidates = [
    request.headers.get('x-galio-webhook-secret') ?? '',
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
  const direct = obj.paymentId ?? obj.payment_id ?? obj.galio_payment_id ?? obj.id;
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
    const auth = isWebhookAuthorized(request);
    if (!auth.ok) {
      auditLog('warn', 'unauthorized', { ...auditMeta, reason: auth.reason });
      return noStoreJson({ ok: false, error: 'Webhook no autorizado' }, { status: 401 });
    }
    const ip = getClientIdentifier(request);
    const rate = checkRateLimit(`webhook:galio:${ip}`, { limit: 300, windowMs: 60 * 1000 });
    if (!rate.ok) {
      auditLog('warn', 'rate_limited', { ...auditMeta, reason: 'too_many_requests' });
      return noStoreJson({ ok: false, error: 'Rate limit excedido' }, { status: 429 });
    }

    const parsed = await parseJsonBody<Record<string, unknown>>(request, { maxBytes: 64 * 1024 });
    const payload: unknown = parsed.ok ? parsed.data : null;

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
    return noStoreJson({ ok: false, error: 'No se pudo procesar el webhook' }, { status: 400 });
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
    note: 'Configura GALIOPAY_WEBHOOK_SECRET para habilitar notificaciones de pago seguras.',
  });
}
