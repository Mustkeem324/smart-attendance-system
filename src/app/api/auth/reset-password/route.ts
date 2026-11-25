export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { createUserFingerprint, verifyActionToken } from '@/lib/tokens';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body?.token || '').trim();
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!token) {
      return NextResponse.json({ error: 'A valid reset token is required.' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
    }
    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: 'Password confirmation does not match.' }, { status: 400 });
    }

    const payload = verifyActionToken(token, 'password_reset');
    if (!payload) {
      return NextResponse.json(
        { error: 'This recovery link is invalid or has expired. Please request a new reset.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        organizationId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Account is inactive or unavailable.' }, { status: 404 });
    }

    // Reject token replay after a prior password change
    if (createUserFingerprint(user.passwordHash) !== payload.fingerprint) {
      return NextResponse.json(
        { error: 'This recovery link has already been used or superseded.' },
        { status: 400 }
      );
    }

    const nextPasswordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: nextPasswordHash,
        refreshToken: null,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Your workspace password has been updated. You may now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset Password Error:', error);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}
