import { createHash } from 'node:crypto';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10000;

function nowMs() {
  return Date.now();
}

function cleanupExpired() {
  const now = nowMs();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function enforceBucketCap() {
  if (buckets.size <= MAX_BUCKETS) return;
  cleanupExpired();
  if (buckets.size <= MAX_BUCKETS) return;

  const toDelete = buckets.size - MAX_BUCKETS;
  let deleted = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    deleted += 1;
    if (deleted >= toDelete) break;
  }
}

function normalizeIp(value: string | null | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const first = raw.split(',')[0]?.trim() ?? '';
  if (!first) return null;

  const withoutPort = first.replace(/^\[?([a-fA-F0-9:.]+)\]?(:\d+)?$/, '$1');
  return withoutPort || null;
}

function fallbackFingerprint(request: Request) {
  const ua = request.headers.get('user-agent') ?? '';
  const lang = request.headers.get('accept-language') ?? '';
  return createHash('sha256').update(`${ua}|${lang}`).digest('hex').slice(0, 20);
}

export function getClientIdentifier(request: Request) {
  const ip =
    normalizeIp(request.headers.get('cf-connecting-ip')) ??
    normalizeIp(request.headers.get('x-vercel-forwarded-for')) ??
    normalizeIp(request.headers.get('x-forwarded-for')) ??
    normalizeIp(request.headers.get('x-real-ip'));

  if (ip) return ip;
  return `anon:${fallbackFingerprint(request)}`;
}

export function checkRateLimit(key: string, options: { limit: number; windowMs: number }) {
  cleanupExpired();
  enforceBucketCap();
  const now = nowMs();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.limit - 1, resetAt: now + options.windowMs };
  }

  if (bucket.count >= options.limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { ok: true, remaining: Math.max(0, options.limit - bucket.count), resetAt: bucket.resetAt };
}
