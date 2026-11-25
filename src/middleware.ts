import { NextRequest, NextResponse } from 'next/server';
import { ROLE_GROUPS, ROLES } from '@/lib/rbac';

const JWT_SECRET =
  process.env.JWT_SECRET || 'smart-attendance-super-secure-jwt-secret-key-32-chars-min-2026';

interface EdgeJwtPayload {
  userId?: string;
  role?: string;
  organizationId?: string;
  exp?: number;
}

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-account',
  '/contact',
  '/catalog',
  '/products',
  '/access-denied',
];

const ADMIN_ROUTES = ['/admin'];
const MANAGEMENT_ROUTES = ['/employees', '/branches', '/departments', '/holidays', '/shifts', '/reports'];
const SUPER_ADMIN_CONFIG_ROUTES = ['/audit-logs', '/settings'];
const PAYROLL_ROUTES = ['/payroll'];
const DISTRIBUTION_ADMIN_ROUTES = ['/distribution/users', '/distribution/audit-logs', '/distribution/settings'];
const DISTRIBUTION_ROUTES = ['/distribution'];
const FIELD_SALES_ROUTES = ['/field-sales'];
const STAFF_WORKFORCE_ROUTES = ['/employee', '/attendance', '/leaves'];
const AUTHENTICATED_COMMON_ROUTES = ['/notifications'];

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64Url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyJwtHS256(token: string): Promise<EdgeJwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToUint8Array(sigB64);

    // Explicitly copy to an ArrayBuffer so TypeScript strict lib.dom checks succeed cleanly
    const sigBuffer = signature.buffer.slice(
      signature.byteOffset,
      signature.byteOffset + signature.byteLength
    ) as ArrayBuffer;
    const dataBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;

    const valid = await crypto.subtle.verify('HMAC', key, sigBuffer, dataBuffer);
    if (!valid) return null;

    const payloadBytes = base64UrlToUint8Array(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as EdgeJwtPayload;

    if (typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) >= payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

function redirectNoCache(url: URL): NextResponse {
  const res = NextResponse.redirect(url);
  res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
  return applySecurityHeaders(res);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next internals, static assets, and API routes (API handlers enforce JSON 401/403)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/i.test(pathname)
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Allow public pages without requiring an active session
  if (PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)))) {
    return applySecurityHeaders(NextResponse.next());
  }

  let allowedRoles: readonly string[] | null = null;
  if (matchesPrefix(pathname, DISTRIBUTION_ADMIN_ROUTES)) {
    allowedRoles = ROLE_GROUPS.SYS_ADMIN;
  } else if (matchesPrefix(pathname, DISTRIBUTION_ROUTES)) {
    allowedRoles = ROLE_GROUPS.DISTRIBUTION_PORTAL;
  } else if (matchesPrefix(pathname, FIELD_SALES_ROUTES)) {
    allowedRoles = ROLE_GROUPS.FIELD_SALES;
  } else if (matchesPrefix(pathname, SUPER_ADMIN_CONFIG_ROUTES)) {
    allowedRoles = ROLE_GROUPS.SYS_ADMIN;
  } else if (matchesPrefix(pathname, PAYROLL_ROUTES)) {
    allowedRoles = ROLE_GROUPS.HR_ADMIN;
  } else if (matchesPrefix(pathname, ADMIN_ROUTES)) {
    allowedRoles = ROLE_GROUPS.MANAGEMENT;
  } else if (matchesPrefix(pathname, MANAGEMENT_ROUTES)) {
    allowedRoles = ROLE_GROUPS.MANAGEMENT;
  } else if (matchesPrefix(pathname, STAFF_WORKFORCE_ROUTES)) {
    allowedRoles = ROLE_GROUPS.STAFF;
  } else if (matchesPrefix(pathname, AUTHENTICATED_COMMON_ROUTES)) {
    allowedRoles = Object.values(ROLES);
  }

  // Let unmatched/unknown routes pass through cleanly so Next.js renders custom 404 page
  if (!allowedRoles) {
    return applySecurityHeaders(NextResponse.next());
  }

  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return redirectNoCache(loginUrl);
  }

  const payload = await verifyJwtHS256(token);
  if (!payload || !payload.userId || !payload.role) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('expired', '1');
    const res = redirectNoCache(loginUrl);
    res.cookies.set('auth_token', '', { path: '/', maxAge: 0 });
    return res;
  }

  const role = payload.role;

  if (!allowedRoles.includes(role)) {
    const deniedUrl = new URL('/access-denied', req.url);
    deniedUrl.searchParams.set('from', pathname);
    return redirectNoCache(deniedUrl);
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
