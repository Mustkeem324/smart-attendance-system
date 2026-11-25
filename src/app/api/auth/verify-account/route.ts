export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyActionToken } from '@/lib/tokens';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body?.token || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();

    if (token) {
      const payload = verifyActionToken(token, 'account_verify');
      if (!payload) {
        return NextResponse.json(
          { error: 'Verification link is invalid or has expired.' },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, organizationId: true, isActive: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'Account record not found.' }, { status: 404 });
      }

      if (!user.isActive) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: true },
        });
      }

      await createAuditLog({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'ACCOUNT_VERIFIED',
        entity: 'User',
        entityId: user.id,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        verified: true,
        email: user.email,
        message: 'Account verified and activated. You can now sign in to your workspace.',
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Provide either a verification token or a valid account email address.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, email: true, organizationId: true, isActive: true },
    });

    if (user && !user.isActive) {
      const admins = await prisma.user.findMany({
        where: {
          organizationId: user.organizationId,
          role: { in: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
          isActive: true,
        },
        select: { id: true },
        take: 5,
      });

      if (admins.length > 0) {
        await prisma.notification
          .createMany({
            data: admins.map((admin) => ({
              organizationId: user.organizationId,
              userId: admin.id,
              title: 'Account Activation Requested',
              message: `User ${user.email} requested workspace verification and activation review.`,
              type: 'ALERT',
              isRead: false,
            })),
          })
          .catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      verified: false,
      message:
        'If your account is awaiting verification, an activation review request has been logged for your workspace administrator.',
    });
  } catch (error: any) {
    console.error('Verify Account Error:', error);
    return NextResponse.json({ error: 'Failed to process account verification.' }, { status: 500 });
  }
}
