import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'prode_session';

const PRIVATE_PAGE_PREFIXES = [
  '/inicio',
  '/calendar',
  '/teams',
  '/rules',
  '/predictions',
  '/results',
  '/leaderboard',
  '/stats',
  '/profile',
  '/users',
];

const SENSITIVE_API_PREFIXES = [
  '/api/profile',
  '/api/predictions',
  '/api/leaderboard/groups',
  '/api/users',
  '/api/state',
  '/api/results',
];

const AUTH_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
];

const WEBHOOK_API_PREFIXES = [
  '/api/payments/talo/webhook',
  '/api/payments/galio/webhook',
];

const BOT_UA_RE =
  /(bot|crawler|spider|curl|wget|python-requests|scrapy|httpclient|axios|postman|insomnia|headless|phantom|selenium)/i;

type RateBucket = {
  count: number;
  resetAt: number;
};

type GlobalWithRateLimit = typeof globalThis & {
  __prodeEdgeRateLimit?: Map<string, RateBucket>;
};

function getStore() {
  const g = globalThis as GlobalWithRateLimit;
  if (!g.__prodeEdgeRateLimit) {
    g.__prodeEdgeRateLimit = new Map<string, RateBucket>();
  }
  return g.__prodeEdgeRateLimit;
}

function getClientIp(req: NextRequest) {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? 'unknown';

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

function getCountry(req: NextRequest) {
  const cfCountry = req.headers.get('cf-ipcountry');
  if (cfCountry) return cfCountry.trim().toUpperCase();

  const vercelCountry = req.headers.get('x-vercel-ip-country');
  if (vercelCountry) return vercelCountry.trim().toUpperCase();

  return '';
}

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isWebhook(pathname: string) {
  return startsWithAny(pathname, WEBHOOK_API_PREFIXES);
}

function checkRate(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const store = getStore();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  store.set(key, current);
  return { ok: true };
}

function withSecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return res;
}

function rejectApi(status: number, message: string, retryAfterSec?: number) {
  const res = NextResponse.json({ ok: false, error: message }, { status });
  if (retryAfterSec) res.headers.set('Retry-After', String(retryAfterSec));
  return withSecurityHeaders(res);
}

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const method = req.method.toUpperCase();
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  const hasSession = Boolean(sessionToken);
  const isApi = pathname.startsWith('/api/');

  // 1) Protect private pages and sensitive endpoints
  if (startsWithAny(pathname, PRIVATE_PAGE_PREFIXES) && !hasSession) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return withSecurityHeaders(NextResponse.redirect(url));
  }
  if (startsWithAny(pathname, SENSITIVE_API_PREFIXES) && !hasSession) {
    return rejectApi(401, 'No autenticado');
  }

  // 2) Geo blocking (default: only Argentina)
  if (!isWebhook(pathname)) {
    const allowedCountries = new Set(
      (process.env.ALLOWED_COUNTRIES ?? 'AR')
        .split(',')
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean),
    );
    const blockUnknownCountry = (process.env.BLOCK_UNKNOWN_COUNTRY ?? 'true').toLowerCase() === 'true';
    const country = getCountry(req);
    const known = country.length > 0;
    const forbidden = (!known && blockUnknownCountry) || (known && !allowedCountries.has(country));

    if (forbidden) {
      if (isApi) return rejectApi(451, 'Acceso bloqueado por restriccion geografica');
      return withSecurityHeaders(NextResponse.redirect(new URL('/login', req.url)));
    }
  }

  // 3) Basic bot blocking
  if (!isWebhook(pathname) && method !== 'OPTIONS') {
    const ua = req.headers.get('user-agent') ?? '';
    const blockBots = (process.env.BLOCK_BOTS ?? 'true').toLowerCase() === 'true';
    if (blockBots && (!ua || BOT_UA_RE.test(ua))) {
      if (isApi) return rejectApi(403, 'Solicitud bloqueada');
      return withSecurityHeaders(NextResponse.redirect(new URL('/login', req.url)));
    }
  }

  // 4) Rate limiting
  const ip = getClientIp(req);

  const globalRate = checkRate(`global:${ip}`, 240, 60_000);
  if (!globalRate.ok) {
    if (isApi) return rejectApi(429, 'Demasiadas solicitudes', globalRate.retryAfterSec);
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.headers.set('Retry-After', String(globalRate.retryAfterSec));
    return withSecurityHeaders(res);
  }

  if (startsWithAny(pathname, AUTH_API_PREFIXES)) {
    const authRate = checkRate(`auth:${pathname}:${ip}`, 20, 5 * 60_000);
    if (!authRate.ok) return rejectApi(429, 'Demasiados intentos. Intenta mas tarde.', authRate.retryAfterSec);
  }

  if (startsWithAny(pathname, SENSITIVE_API_PREFIXES) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const writeRate = checkRate(`mutate:${pathname}:${ip}`, 120, 60_000);
    if (!writeRate.ok) return rejectApi(429, 'Demasiadas operaciones en poco tiempo', writeRate.retryAfterSec);
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map|txt|woff|woff2)$).*)',
  ],
};


