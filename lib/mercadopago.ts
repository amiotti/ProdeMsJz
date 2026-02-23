import { MercadoPagoConfig, Preference } from 'mercadopago';

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

export function getMercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: runtimeEnv('MERCADOPAGO_ACCESS_TOKEN'),
  });
}

export function getMercadoPagoPublicConfig() {
  return {
    publicKey: runtimeEnv('MERCADOPAGO_PUBLIC_KEY', ''),
    amount: Number(runtimeEnv('MERCADOPAGO_REGISTRATION_AMOUNT_ARS', '100')),
    currencyId: runtimeEnv('MERCADOPAGO_CURRENCY_ID', 'ARS'),
    title: runtimeEnv('MERCADOPAGO_REGISTRATION_TITLE', 'Inscripcion PRODE Fase Grupos Mundial 2026'),
    appBaseUrl: runtimeEnv('APP_BASE_URL', 'http://localhost:3000'),
  };
}

export async function createRegistrationPreference(input: {
  userId: string;
  firstName?: string;
  lastName?: string;
  email: string;
}) {
  const client = getMercadoPagoClient();
  const preferenceClient = new Preference(client);
  const cfg = getMercadoPagoPublicConfig();

  const successUrl = `${cfg.appBaseUrl}/payment/return?status=success`;
  const pendingUrl = `${cfg.appBaseUrl}/payment/return?status=pending`;
  const failureUrl = `${cfg.appBaseUrl}/payment/return?status=failure`;
  const isLocalhost =
    cfg.appBaseUrl.includes('localhost') || cfg.appBaseUrl.includes('127.0.0.1');
  const configuredTestPayerEmail = process.env.MERCADOPAGO_TEST_PAYER_EMAIL?.trim();
  const forceTestPayer = process.env.MERCADOPAGO_FORCE_TEST_PAYER === 'true';
  const payerEmail = forceTestPayer ? configuredTestPayerEmail : input.email;

  const response = await preferenceClient.create({
    body: {
      items: [
        {
          id: 'prode-inscripcion-grupos-2026',
          title: cfg.title,
          quantity: 1,
          currency_id: cfg.currencyId,
          unit_price: cfg.amount,
        },
      ],
      payer: payerEmail
        ? {
            email: payerEmail,
            ...(forceTestPayer || isLocalhost
              ? {}
              : {
                  name: input.firstName,
                  surname: input.lastName,
                }),
          }
        : undefined,
      external_reference: input.userId,
      metadata: {
        prode_user_id: input.userId,
        purpose: 'registration_fee',
      },
      back_urls: {
        success: successUrl,
        pending: pendingUrl,
        failure: failureUrl,
      },
      ...(isLocalhost ? {} : { auto_return: 'approved' as const }),
      // statement_descriptor puede gatillar bloqueos de políticas en cuentas/sandboxes.
      // Lo omitimos para maximizar compatibilidad en simulacros.
    },
  });

  return {
    id: response.id,
    initPoint: response.init_point,
    sandboxInitPoint: response.sandbox_init_point,
  };
}
