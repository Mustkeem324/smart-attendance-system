import type { NextRequest } from 'next/server';

/**
 * Determines whether cookies should be marked Secure based on the actual transport protocol,
 * supporting both HTTPS reverse proxies and direct HTTP local/LAN production servers.
 */
export function isSecureRequest(req: NextRequest): boolean {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return req.nextUrl.protocol === 'https:';
}

export function buildAuthCookieOptions(req: NextRequest, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
    ...(maxAgeSeconds === 0 ? { expires: new Date(0) } : {}),
  };
}
