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
  payment_id?: string;
  paymentId?: string;
  payment_url?: string;
  url?: string;
  checkout_url?: string;
  status?: string;
  external_id?: string;
  externalId?: string;
  redirect_url?: string;
  payment?: {
    id?: string;
    payment_id?: string;
    paymentId?: string;
  };
};

export type TaloPaymentDetails = {
  id: string;
  status?: string;
  payment_status?: string;
  state?: string;
  external_id?: string;
  externalId?: string;
  reference_id?: string;
  referenceId?: string;
  price?: {
    currency?: string;
    currency_id?: string;
    amount?: number;
  };
  amount?: number;
  total?: number;
  currency?: string;
  currency_id?: string;
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

function normalizeCurrency(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function parseAmount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function extractPaymentId(data: TaloCreatePaymentData | undefined, url: string | null) {
  const direct =
    String(data?.id ?? '').trim() ||
    String(data?.payment_id ?? '').trim() ||
    String(data?.paymentId ?? '').trim() ||
    String(data?.payment?.id ?? '').trim() ||
    String(data?.payment?.payment_id ?? '').trim() ||
    String(data?.payment?.paymentId ?? '').trim();

  if (direct) return direct;
  if (!url) return null;

  const fromQuery = (() => {
    try {
      const parsed = new URL(url);
      const candidate =
        parsed.searchParams.get('payment_id') ??
        parsed.searchParams.get('paymentId') ??
        parsed.searchParams.get('id');
      return candidate?.trim() || null;
    } catch {
      return null;
    }
  })();
  if (fromQuery) return fromQuery;

  const fromPath = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0];
  return fromPath?.trim() || null;
}

function extractPaymentStatus(payment: Partial<TaloPaymentDetails> | null | undefined) {
  return String(payment?.payment_status ?? payment?.status ?? payment?.state ?? '').trim();
}

function extractPaymentExternalId(payment: Partial<TaloPaymentDetails> | null | undefined) {
  return String(
    payment?.external_id ??
      payment?.externalId ??
      payment?.reference_id ??
      payment?.referenceId ??
      '',
  ).trim();
}

function extractPaymentIdForValidation(payment: Partial<TaloPaymentDetails> | null | undefined) {
  return String((payment as { id?: unknown })?.id ?? '').trim();
}

function extractPaymentCurrency(payment: Partial<TaloPaymentDetails> | null | undefined) {
  return normalizeCurrency(
    payment?.price?.currency ??
      payment?.price?.currency_id ??
      payment?.currency ??
      payment?.currency_id ??
      '',
  );
}

function extractPaymentAmount(payment: Partial<TaloPaymentDetails> | null | undefined) {
  return parseAmount(payment?.price?.amount ?? payment?.amount ?? payment?.total ?? NaN);
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
  appBaseUrl?: string;
  webhookBaseUrl?: string;
}) {
  const cfg = getTaloConfig();
  const appBaseUrl = input.appBaseUrl ? stripTrailingSlash(input.appBaseUrl) : cfg.appBaseUrl;
  const webhookBaseUrl = input.webhookBaseUrl ? stripTrailingSlash(input.webhookBaseUrl) : cfg.webhookBaseUrl;
  const webhookUrl = cfg.webhookSecret
    ? `${webhookBaseUrl}/api/payments/talo/webhook?token=${encodeURIComponent(cfg.webhookSecret)}`
    : `${webhookBaseUrl}/api/payments/talo/webhook`;

  const payload: TaloCreatePaymentRequest = {
    price: {
      currency: cfg.currencyId,
      amount: cfg.amount,
    },
    user_id: cfg.userId,
    payment_options: ['transfer'],
    webhook_url: webhookUrl,
    redirect_url: `${appBaseUrl}/payment/return?provider=talo&status=success`,
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
  const url = data?.payment_url ?? data?.url ?? data?.checkout_url ?? null;
  if (!url) throw new Error('TaloPay no devolvio payment_url');

  return {
    url,
    paymentId: extractPaymentId(data, url),
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
  return ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'OVERPAID', 'APPROVED', 'PAID', 'COMPLETED', 'CONFIRMED'].includes(normalized);
}

export function isValidTaloRegistrationPaymentForUser(
  payment: Partial<TaloPaymentDetails> | null | undefined,
  userId: string,
  options?: {
    expectedPaymentId?: string | null;
    allowMissingExternalIdForExpectedPaymentId?: boolean;
    allowAmountMismatch?: boolean;
  },
) {
  if (!payment) return false;
  const status = extractPaymentStatus(payment);
  if (!isTaloApprovedStatus(status)) return false;

  const cfg = getTaloConfig();
  const externalId = extractPaymentExternalId(payment);
  const expectedExternalId = registrationExternalIdForUser(userId);
  let referenceOk = externalId === expectedExternalId;

  if (!referenceOk && !externalId && options?.allowMissingExternalIdForExpectedPaymentId) {
    const expectedPaymentId = String(options.expectedPaymentId ?? '').trim();
    const paymentId = extractPaymentIdForValidation(payment);
    referenceOk = Boolean(expectedPaymentId && paymentId && expectedPaymentId === paymentId);
  }

  const currency = extractPaymentCurrency(payment);
  const amount = extractPaymentAmount(payment);

  const currencyOk = !currency || currency === normalizeCurrency(cfg.currencyId);
  const strictAmountOk = Number.isFinite(amount) && Math.abs(amount - Number(cfg.amount)) < 0.01;
  const fallbackAmountOk = Number.isFinite(amount) && amount > 0;
  const amountOk = strictAmountOk || (Boolean(options?.allowAmountMismatch) && fallbackAmountOk);

  return referenceOk && currencyOk && amountOk;
}

export function getTaloWebhookAuthConfig() {
  return {
    secret: getTaloConfig().webhookSecret,
  };
}
