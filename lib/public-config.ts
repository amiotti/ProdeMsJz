function runtimeEnv(baseName: string, fallback?: string) {
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const scopedName = `${baseName}_${isProd ? 'PROD' : 'LOCAL'}`;
  const scopedValue = process.env[scopedName];
  if (scopedValue && scopedValue.trim()) return scopedValue.trim();
  const fallbackValue = process.env[baseName] ?? fallback;
  return String(fallbackValue ?? '').trim();
}

export function getRegistrationAmountArs() {
  const value = Number(runtimeEnv('GALIOPAY_REGISTRATION_AMOUNT_ARS', '20000'));
  return Number.isFinite(value) ? value : 20000;
}
