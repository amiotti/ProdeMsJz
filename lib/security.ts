import { NextResponse } from 'next/server';

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function requestOrigin(request: Request) {
  const originHeader = request.headers.get('origin');
  if (originHeader) return normalizeOrigin(originHeader);

  const referer = request.headers.get('referer');
  if (referer) return normalizeOrigin(referer);

  return null;
}

function requestHostOrigin(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export function assertSameOriginForMutation(request: Request): NextResponse | null {
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null;

  const source = requestOrigin(request);
  const target = requestHostOrigin(request);

  // Allow non-browser clients that omit Origin/Referer, but enforce same-origin when present.
  if (!source || !target) return null;
  if (source === target) return null;

  return NextResponse.json({ ok: false, error: 'Origen no permitido' }, { status: 403 });
}

export function noStoreJson(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
  const response = NextResponse.json(data, init);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
