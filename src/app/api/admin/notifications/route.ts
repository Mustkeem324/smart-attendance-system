export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import { NotificationMeta } from '@/models/employee-portal';
import { fetchRichUserNotifications } from '@/lib/notifications';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!requireRole(session.user, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'ALL';
    const category = searchParams.get('category') || 'ALL';
    const search = searchParams.get('search') || '';

    const data = await fetchRichUserNotifications({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      role: session.user.role,
      filter,
      category,
      search,
      includeOrgScopeForAdmin: true,
      limit: 80,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!requireRole(session.user, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId, markAllRead, isRead = true } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { organizationId: session.user.organizationId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId && !String(notificationId).startsWith('sys-') && !String(notificationId).startsWith('dist-')) {
      const updated = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          organizationId: session.user.organizationId,
        },
        data: { isRead: Boolean(isRead) },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      try {
        await connectToDatabase();
        await NotificationMeta.findOneAndUpdate(
          { notificationId },
          { acknowledgedAt: isRead ? new Date() : null }
        );
      } catch {}
    }

    return NextResponse.json({ success: true, message: 'Notification updated' });
  } catch (err: any) {
    console.error('Error in PUT /api/admin/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
