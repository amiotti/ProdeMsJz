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

  if (!source || !target) {
    return NextResponse.json({ ok: false, error: 'Origen requerido' }, { status: 403 });
  }

  if (source !== target) {
    return NextResponse.json({ ok: false, error: 'Origen no permitido' }, { status: 403 });
  }

  return null;
}

export function noStoreJson(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
  const response = NextResponse.json(data, init);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  return response;
}

type ParseJsonOptions = {
  maxBytes?: number;
  allowEmpty?: boolean;
};

type ParsedJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request,
  options?: ParseJsonOptions,
): Promise<ParsedJsonResult<T>> {
  const maxBytes = Math.max(1024, options?.maxBytes ?? 64 * 1024);
  const allowEmpty = Boolean(options?.allowEmpty);

  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  if (contentType && !contentType.includes('application/json')) {
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: 'Content-Type debe ser application/json' }, { status: 415 }),
    };
  }

  const contentLength = Number(request.headers.get('content-length') ?? '');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: 'Payload demasiado grande' }, { status: 413 }),
    };
  }

  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: 'No se pudo leer el body' }, { status: 400 }),
    };
  }

  if (!raw.trim()) {
    if (allowEmpty) return { ok: true, data: {} as T };
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: 'Body JSON requerido' }, { status: 400 }),
    };
  }

  if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: 'Payload demasiado grande' }, { status: 413 }),
    };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      response: noStoreJson({ ok: false, error: 'JSON invalido' }, { status: 400 }),
    };
  }
}
