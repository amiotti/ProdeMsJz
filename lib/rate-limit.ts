type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function nowMs() {
  return Date.now();
}

function cleanupExpired() {
  const now = nowMs();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIdentifier(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwarded || realIp || 'unknown';
}

export function checkRateLimit(key: string, options: { limit: number; windowMs: number }) {
  cleanupExpired();
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
