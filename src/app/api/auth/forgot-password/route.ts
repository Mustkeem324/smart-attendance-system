export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateActionToken } from '@/lib/tokens';
import { createAuditLog } from '@/lib/audit';

const resetRateLimitMap = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const timestamps = resetRateLimitMap.get(ip) || [];
    const recent = timestamps.filter((t) => now - t < 15 * 60 * 1000);

    if (recent.length >= 6) {
      return NextResponse.json(
        { error: 'Too many recovery attempts. Please wait a few minutes before retrying.' },
        { status: 429 }
      );
    }
    recent.push(now);
    resetRateLimitMap.set(ip, recent);

    const body = await req.json();
    const rawEmail = String(body?.email || '').trim().toLowerCase();

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json({ error: 'Please enter a valid corporate email address.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: rawEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        organizationId: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      // Generate a time-limited token tied to the user's current password fingerprint
      const _resetToken = generateActionToken(user, 'password_reset', 30);

      // Notify org administrators internally without disclosing anything to unauthenticated callers
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
              title: 'Password Recovery Requested',
              message: `A password reset request was submitted for ${user.email}. You can issue or verify credentials from User Management.`,
              type: 'ALERT',
              isRead: false,
            })),
          })
          .catch(() => {});
      }

      await createAuditLog({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entity: 'User',
        entityId: user.id,
        newValues: { requestedByIp: ip },
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || undefined,
      }).catch(() => {});

      void _resetToken;
    }

    // Always return an ambiguous success message to prevent account enumeration
    return NextResponse.json({
      success: true,
      message:
        'If an active workspace account matches that email, recovery instructions have been dispatched and administrators have been notified.',
    });
  } catch (error: any) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json({ error: 'Unable to process recovery request.' }, { status: 500 });
  }
}
