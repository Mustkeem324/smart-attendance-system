import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, NotificationType, RequestStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!requireRole(session.user, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { organizationId, id: userId } = session.user;
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'UNREAD', 'READ', 'ALL'
    const category = searchParams.get('category'); // 'ATTENDANCE', 'LEAVE', 'SYSTEM', 'HR'

    // 1. Automatically generate real-time dynamic notifications from database events
    const todayStr = new Date().toISOString().split('T')[0];

    // Missing check-outs from previous days
    const missingCheckoutsCount = await prisma.attendanceRecord.count({
      where: {
        organizationId,
        date: { lt: todayStr },
        checkInTime: { not: null },
        checkOutTime: null,
      },
    });

    // Pending leaves
    const pendingLeavesCount = await prisma.leaveRequest.count({
      where: {
        organizationId,
        status: RequestStatus.PENDING,
      },
    });

    // Pending exceptions
    const pendingExceptionsCount = await prisma.attendanceException.count({
      where: {
        organizationId,
        status: RequestStatus.PENDING,
      },
    });

    // 2. Fetch notifications stored in DB
    const whereClause: any = {
      organizationId,
      ...(filter === 'UNREAD' && { isRead: false }),
      ...(filter === 'READ' && { isRead: true }),
    };

    const dbNotifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Synthesize system actionable alerts
    const dynamicAlerts: any[] = [];
    if (missingCheckoutsCount > 0) {
      dynamicAlerts.push({
        id: 'sys-missing-checkouts',
        title: 'Missing Check-Outs Detected',
        message: `${missingCheckoutsCount} employee record(s) from earlier shifts have missing punch-outs.`,
        type: NotificationType.WARNING,
        isRead: false,
        category: 'ATTENDANCE',
        link: '/attendance',
        createdAt: new Date().toISOString(),
      });
    }

    if (pendingLeavesCount > 0) {
      dynamicAlerts.push({
        id: 'sys-pending-leaves',
        title: 'Pending Leave Approvals',
        message: `${pendingLeavesCount} employee leave request(s) require supervisor action.`,
        type: NotificationType.INFO,
        isRead: false,
        category: 'LEAVE',
        link: '/leaves',
        createdAt: new Date().toISOString(),
      });
    }

    if (pendingExceptionsCount > 0) {
      dynamicAlerts.push({
        id: 'sys-pending-exceptions',
        title: 'Geofence Exceptions Pending',
        message: `${pendingExceptionsCount} attendance exception(s) await compliance verification.`,
        type: NotificationType.ALERT,
        isRead: false,
        category: 'ATTENDANCE',
        link: '/attendance/exceptions',
        createdAt: new Date().toISOString(),
      });
    }

    const combined = [...dynamicAlerts, ...dbNotifications];

    return NextResponse.json({
      success: true,
      unreadCount: combined.filter((n) => !n.isRead).length,
      notifications: combined,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Mark notifications read / unread
export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { organizationId: session.user.organizationId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId && !notificationId.startsWith('sys-')) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true, message: 'Notification updated' });
  } catch (err: any) {
    console.error('Error in PUT /api/admin/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
