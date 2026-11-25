export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import { DistributionNotification } from '@/models/electronics-sales';
import { NotificationMeta } from '@/models/employee-portal';
import { fetchRichUserNotifications } from '@/lib/notifications';
import { ROLE_GROUPS, hasAnyRole } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'ALL';
    const category = searchParams.get('category') || 'ALL';
    const search = searchParams.get('search') || '';
    const scope = searchParams.get('scope') || 'PERSONAL';

    const data = await fetchRichUserNotifications({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      role: session.user.role,
      filter,
      category,
      search,
      includeOrgScopeForAdmin: scope === 'ORG',
      limit: 80,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load notifications' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { notificationId, markAllRead, isRead = true } = body;

    if (markAllRead || (!notificationId && body.notificationId === undefined)) {
      await prisma.notification.updateMany({
        where: {
          organizationId: session.user.organizationId,
          userId: session.user.id,
          isRead: false,
        },
        data: { isRead: true },
      });

      if (hasAnyRole(session.user.role, ROLE_GROUPS.DISTRIBUTION_PORTAL)) {
        try {
          await connectToDatabase();
          await DistributionNotification.updateMany({ isRead: false }, { isRead: true });
        } catch {}
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (typeof notificationId === 'string') {
      if (notificationId.startsWith('dist-')) {
        if (!hasAnyRole(session.user.role, ROLE_GROUPS.DISTRIBUTION_PORTAL)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await connectToDatabase();
        const mongoId = notificationId.replace(/^dist-/, '');
        await DistributionNotification.findByIdAndUpdate(mongoId, { isRead: Boolean(isRead) });
      } else if (!notificationId.startsWith('sys-')) {
        const isManagement = hasAnyRole(session.user.role, ROLE_GROUPS.MANAGEMENT);
        await prisma.notification.updateMany({
          where: {
            id: notificationId,
            organizationId: session.user.organizationId,
            ...(isManagement ? {} : { userId: session.user.id }),
          },
          data: { isRead: Boolean(isRead) },
        });
        try {
          await connectToDatabase();
          await NotificationMeta.findOneAndUpdate(
            { notificationId },
            { acknowledgedAt: isRead ? new Date() : null }
          );
        } catch {}
      }
    }

    return NextResponse.json({ success: true, message: 'Notification updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update notifications' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clearRead = searchParams.get('clearRead') === 'true';

    if (clearRead) {
      const deleted = await prisma.notification.deleteMany({
        where: {
          organizationId: session.user.organizationId,
          userId: session.user.id,
          isRead: true,
        },
      });
      return NextResponse.json({ success: true, deletedCount: deleted.count });
    }

    return NextResponse.json({ error: 'Specify clearRead=true or notification ID' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to clear notifications' }, { status: 500 });
  }
}
