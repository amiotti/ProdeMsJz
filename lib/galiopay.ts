type GalioPayItem = {
  title: string;
  quantity: number;
  unitPrice: number;
  currencyId: 'ARS' | string;
  imageUrl?: string;
};

type CreatePaymentLinkInput = {
  items: GalioPayItem[];
  referenceId: string;
  description?: string;
  establishmentName?: string;
  sellerName?: string;
  backUrl?: {
    success?: string;
    failure?: string;
  };
};

type CreatePaymentLinkResponse = {
  url: string;
};

type GalioPaymentDetails = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  referenceId: string;
  type: string;
  moneyReleaseDate?: string;
  netAmount?: number;
};

function isProductionEnv() {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

function runtimeEnv(baseName: string, fallback?: string) {
  const scopedName = `${baseName}_${isProductionEnv() ? 'PROD' : 'LOCAL'}`;
  const scopedValue = process.env[scopedName];
  if (scopedValue && scopedValue.trim()) return scopedValue.trim();
  const fallbackValue = process.env[baseName] ?? fallback;
  if (fallbackValue == null || fallbackValue === '') {
    throw new Error(`Falta configurar ${scopedName} o ${baseName}`);
  }
  return String(fallbackValue).trim();
}

function getGalioConfig() {
  return {
    apiBase: runtimeEnv('GALIOPAY_API_BASE', 'https://pay.galio.app/api'),
    apiKey: runtimeEnv('GALIOPAY_API_KEY'),
    clientId: runtimeEnv('GALIOPAY_CLIENT_ID'),
    appBaseUrl: runtimeEnv('APP_BASE_URL', 'http://localhost:3000'),
    amount: Number(runtimeEnv('GALIOPAY_REGISTRATION_AMOUNT_ARS', '20000')),
    currencyId: runtimeEnv('GALIOPAY_CURRENCY_ID', 'ARS'),
    title: runtimeEnv('GALIOPAY_REGISTRATION_TITLE', 'Inscripcion PRODE Fase Grupos Mundial 2026'),
  };
}

function registrationReferenceIdForUser(userId: string) {
  return `prode-registration-${userId}`;
}

export function extractUserIdFromGalioRegistrationReferenceId(referenceId: string | null | undefined) {
  const value = String(referenceId ?? '');
  const prefix = 'prode-registration-';
  if (!value.startsWith(prefix)) return null;
  const userId = value.slice(prefix.length).trim();
  return userId || null;
}

async function galioRequest<T>(path: string, init: RequestInit, withAuth = true): Promise<T> {
  const cfg = getGalioConfig();
  const response = await fetch(`${cfg.apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(withAuth
        ? {
            Authorization: `Bearer ${cfg.apiKey}`,
            'x-client-id': cfg.clientId,
          }
        : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  let data: unknown = null;
  try {
    data = (await response.json()) as unknown;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `GalioPay request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function createGalioRegistrationPaymentLink(input: {
  userId: string;
  firstName?: string;
  lastName?: string;
}) {
  const cfg = getGalioConfig();
  const referenceId = registrationReferenceIdForUser(input.userId);
  const payload: CreatePaymentLinkInput = {
    items: [
      {
        title: cfg.title,
        quantity: 1,
        unitPrice: cfg.amount,
        currencyId: cfg.currencyId,
      },
    ],
    referenceId,
    description: 'Inscripcion PRODE Fase Grupos Mundial 2026',
    establishmentName: 'PRODE Mundial 2026',
    sellerName: `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim() || undefined,
    backUrl: {
      success: `${cfg.appBaseUrl}/payment/return?provider=galio&status=success`,
      failure: `${cfg.appBaseUrl}/payment/return?provider=galio&status=failure`,
    },
  };

  return galioRequest<CreatePaymentLinkResponse>('/payment-links', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getGalioPayment(paymentId: string) {
  return galioRequest<GalioPaymentDetails>(`/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
  });
}

export function isGalioApprovedStatus(status: string | null | undefined) {
  const normalized = (status ?? '').trim().toLowerCase();
  return ['approved', 'paid', 'success', 'succeeded', 'completed'].includes(normalized);
}

export function isValidGalioRegistrationPaymentForUser(
  payment: Partial<GalioPaymentDetails> | null | undefined,
  userId: string,
) {
  if (!payment) return false;
  if (!isGalioApprovedStatus(payment.status)) return false;

  const cfg = getGalioConfig();
  const referenceOk = String(payment.referenceId ?? '') === registrationReferenceIdForUser(userId);
  const currencyOk = String(payment.currency ?? '').toUpperCase() === String(cfg.currencyId).toUpperCase();
  const amountOk = Number(payment.amount) === Number(cfg.amount);

  return referenceOk && currencyOk && amountOk;
}

export function getGalioWebhookAuthConfig() {
  return {
    secret: process.env.GALIOPAY_WEBHOOK_SECRET?.trim() || '',
  };
}


