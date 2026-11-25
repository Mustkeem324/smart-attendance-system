export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { apiSuccess } from '@/lib/distribution-helper';
import { buildAuthCookieOptions } from '@/lib/cookies';

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get('auth_token')?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      const payload = verifyToken(token);
      if (payload?.userId) {
        await prisma.user.updateMany({
          where: { id: payload.userId },
          data: { refreshToken: null },
        }).catch(() => {});
      }
    }

    const response = apiSuccess({ message: '30-day session logged out successfully' });
    response.cookies.set('auth_token', '', buildAuthCookieOptions(req, 0));
    return response;
  } catch {
    const response = apiSuccess({ message: 'Logged out' });
    response.cookies.delete('auth_token');
    return response;
  }
}
