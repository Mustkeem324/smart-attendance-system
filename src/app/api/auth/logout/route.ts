export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // 1. Identify active session token
    let token = req.cookies.get('auth_token')?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // 2. Clear server-side refresh token if present
    if (token) {
      const payload = verifyToken(token);
      if (payload?.userId) {
        await prisma.user.updateMany({
          where: { id: payload.userId },
          data: { refreshToken: null },
        }).catch(() => {});
      }
    }

    // 3. Clear cookie cleanly
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully. 30-day session terminated.',
    });

    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error: any) {
    const response = NextResponse.json({ success: true, message: 'Logged out' });
    response.cookies.delete('auth_token');
    return response;
  }
}
