type TaloPrice = {
  currency: string;
  amount: number;
};

type TaloClientData = {
  first_name?: string;
  last_name?: string;
  email?: string;
  dni?: string;
  phone?: string;
  cuit?: string;
};

type TaloCreatePaymentRequest = {
  price: TaloPrice;
  user_id: string;
  payment_options?: string[];
  webhook_url?: string;
  redirect_url: string;
  external_id: string;
  motive?: string;
  items?: Array<{
    name?: string;
    quantity?: number;
    unit_price?: number;
  }>;
  client_data?: TaloClientData;
};

type TaloApiResponse<T> = {
  message?: string;
  error?: boolean;
  data?: T;
};

type TaloTokenData = {
  token: string;
};

type TaloCreatePaymentData = {
  id: string;
  payment_url?: string;
  url?: string;
  status?: string;
  external_id?: string;
  redirect_url?: string;
};

export type TaloPaymentDetails = {
  id: string;
  status?: string;
  payment_status?: string;
  external_id?: string;
  price?: {
    currency?: string;
    amount?: number;
  };
  amount?: number;
  currency?: string;
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

function runtimeEnvOptional(baseName: string) {
  const scopedName = `${baseName}_${isProductionEnv() ? 'PROD' : 'LOCAL'}`;
  const scopedValue = process.env[scopedName];
  if (scopedValue && scopedValue.trim()) return scopedValue.trim();
  const base = process.env[baseName];
  if (base && base.trim()) return base.trim();
  return '';
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getTaloConfig() {
  const appBaseUrl = stripTrailingSlash(runtimeEnv('APP_BASE_URL', 'http://localhost:3000'));
  const webhookBaseUrl = stripTrailingSlash(runtimeEnvOptional('TALOPAY_WEBHOOK_BASE_URL') || appBaseUrl);
  if (isProductionEnv() && /localhost|127\.0\.0\.1/i.test(webhookBaseUrl)) {
    throw new Error('TALOPAY_WEBHOOK_BASE_URL en produccion no puede apuntar a localhost');
  }

  return {
    apiBase: runtimeEnv('TALOPAY_API_BASE', 'https://api.talo.com.ar'),
    appBaseUrl,
    webhookBaseUrl,
    userId: runtimeEnv('TALOPAY_USER_ID'),
    clientId: runtimeEnv('TALOPAY_CLIENT_ID'),
    clientSecret: runtimeEnv('TALOPAY_CLIENT_SECRET'),
    amount: Number(runtimeEnv('TALOPAY_REGISTRATION_AMOUNT_ARS', '20000')),
    currencyId: runtimeEnv('TALOPAY_CURRENCY_ID', 'ARS'),
    title: runtimeEnv('TALOPAY_REGISTRATION_TITLE', 'Inscripcion PRODE Fase Grupos Mundial 2026'),
    webhookSecret: process.env.TALOPAY_WEBHOOK_SECRET?.trim() || '',
  };
}

type CachedToken = {
  value: string;
  expiresAt: number;
};

let tokenCache: CachedToken | null = null;

async function taloRequest<T>(path: string, init: RequestInit): Promise<T> {
  const cfg = getTaloConfig();
  const response = await fetch(`${cfg.apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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
      'message' in data &&
      typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `TaloPay request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

async function getAccessToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > now) return tokenCache.value;

  const cfg = getTaloConfig();
  const response = await taloRequest<TaloApiResponse<TaloTokenData>>(`/users/${encodeURIComponent(cfg.userId)}/tokens`, {
    method: 'POST',
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  });

  const token = response.data?.token?.trim();
  if (!token) throw new Error('TaloPay no devolvio token de autenticacion');

  tokenCache = {
    value: token,
    expiresAt: now + 1000 * 60 * 8,
  };
  return token;
}

async function taloAuthedRequest<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getAccessToken();
  try {
    return await taloRequest<T>(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (!message.includes('401')) throw error;
    const refreshedToken = await getAccessToken(true);
    return taloRequest<T>(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${refreshedToken}`,
        ...(init.headers ?? {}),
      },
    });
  }
}

function registrationExternalIdForUser(userId: string) {
  return `prode-registration-${userId}`;
}

export function extractUserIdFromTaloRegistrationExternalId(externalId: string | null | undefined) {
  const value = String(externalId ?? '');
  const prefix = 'prode-registration-';
  if (!value.startsWith(prefix)) return null;
  const userId = value.slice(prefix.length).trim();
  return userId || null;
}

function buildWebhookUrl() {
  const cfg = getTaloConfig();
  if (!cfg.webhookSecret) return `${cfg.webhookBaseUrl}/api/payments/talo/webhook`;
  return `${cfg.webhookBaseUrl}/api/payments/talo/webhook?token=${encodeURIComponent(cfg.webhookSecret)}`;
}

export async function createTaloRegistrationPaymentLink(input: {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  dni?: string;
}) {
  const cfg = getTaloConfig();
  const payload: TaloCreatePaymentRequest = {
    price: {
      currency: cfg.currencyId,
      amount: cfg.amount,
    },
    user_id: cfg.userId,
    payment_options: ['transfer'],
    webhook_url: buildWebhookUrl(),
    redirect_url: `${cfg.appBaseUrl}/payment/return?provider=talo&status=success`,
    external_id: registrationExternalIdForUser(input.userId),
    motive: cfg.title,
    client_data: {
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      dni: input.dni,
    },
    items: [
      {
        name: cfg.title,
        quantity: 1,
        unit_price: cfg.amount,
      },
    ],
  };

  const response = await taloAuthedRequest<TaloApiResponse<TaloCreatePaymentData>>('/payments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = response.data;
  const url = data?.payment_url ?? data?.url ?? null;
  if (!url) throw new Error('TaloPay no devolvio payment_url');

  return {
    url,
    paymentId: data?.id ?? null,
    externalId: payload.external_id,
  };
}

export async function getTaloPayment(paymentId: string) {
  const response = await taloAuthedRequest<TaloApiResponse<TaloPaymentDetails>>(
    `/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
    },
  );
  if (!response.data) throw new Error('TaloPay no devolvio datos de pago');
  return response.data;
}

export function isTaloApprovedStatus(status: string | null | undefined) {
  const normalized = (status ?? '').trim().toUpperCase();
  return ['SUCCESS', 'OVERPAID', 'UNDERPAID', 'APPROVED', 'PAID', 'COMPLETED'].includes(normalized);
}

export function isValidTaloRegistrationPaymentForUser(
  payment: Partial<TaloPaymentDetails> | null | undefined,
  userId: string,
) {
  if (!payment) return false;
  const status = payment.payment_status ?? payment.status;
  if (!isTaloApprovedStatus(status)) return false;

  const cfg = getTaloConfig();
  const externalId = String(payment.external_id ?? '');
  const referenceOk = externalId === registrationExternalIdForUser(userId);

  const currency = String(payment.price?.currency ?? payment.currency ?? '').toUpperCase();
  const amount = Number(payment.price?.amount ?? payment.amount ?? NaN);

  const currencyOk = currency === String(cfg.currencyId).toUpperCase();
  const amountOk = amount === Number(cfg.amount);

  return referenceOk && currencyOk && amountOk;
}

export function getTaloWebhookAuthConfig() {
  return {
    secret: getTaloConfig().webhookSecret,
  };
}
