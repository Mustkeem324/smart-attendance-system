export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import { NotificationMeta } from '@/models/employee-portal';
import { DistributionNotification } from '@/models/electronics-sales';
import { inferMeta } from '@/lib/notifications';
import { ROLE_GROUPS, hasAnyRole } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const isManagement = hasAnyRole(session.user.role, ROLE_GROUPS.MANAGEMENT);

    if (id.startsWith('dist-')) {
      if (!hasAnyRole(session.user.role, ROLE_GROUPS.DISTRIBUTION_PORTAL)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      await connectToDatabase();
      const dn: any = await DistributionNotification.findById(id.replace(/^dist-/, '')).lean();
      if (!dn) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      return NextResponse.json({
        success: true,
        notification: {
          id,
          title: dn.title,
          message: dn.message,
          type: dn.type,
          category: dn.type === 'STOCK' ? 'INVENTORY' : dn.type === 'ORDER' ? 'ORDER' : 'SYSTEM',
          priority: dn.type === 'STOCK' ? 'HIGH' : 'NORMAL',
          isRead: Boolean(dn.isRead),
          link: dn.link || '/distribution',
          actionLabel: 'Open Distribution Console',
          actorName: 'Distribution Telemetry',
          details: { Type: dn.type || 'SYSTEM' },
          source: 'DISTRIBUTION',
          createdAt: dn.createdAt,
        },
      });
    }

    const row = await prisma.notification.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
        ...(isManagement ? {} : { userId: session.user.id }),
      },
    });
    if (!row) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });

    let meta: any = null;
    try {
      await connectToDatabase();
      meta = await NotificationMeta.findOne({ notificationId: row.id }).lean();
    } catch {}

    const fallback = inferMeta(row);
    return NextResponse.json({
      success: true,
      notification: {
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type,
        category: meta?.category || fallback.category,
        priority: meta?.priority || fallback.priority,
        isRead: row.isRead,
        link: row.link,
        actionLabel: meta?.actionLabel || fallback.actionLabel,
        actorName: meta?.actorName || 'Salman Enterprises Workspace',
        details: meta?.details || {},
        source: 'WORKSPACE',
        acknowledgedAt: meta?.acknowledgedAt || null,
        createdAt: row.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to inspect notification' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const nextIsRead = body.isRead !== undefined ? Boolean(body.isRead) : true;
    const isManagement = hasAnyRole(session.user.role, ROLE_GROUPS.MANAGEMENT);

    if (id.startsWith('sys-')) {
      return NextResponse.json({ success: true, id, isRead: nextIsRead });
    }

    if (id.startsWith('dist-')) {
      if (!hasAnyRole(session.user.role, ROLE_GROUPS.DISTRIBUTION_PORTAL)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      await connectToDatabase();
      const updated = await DistributionNotification.findByIdAndUpdate(
        id.replace(/^dist-/, ''),
        { isRead: nextIsRead },
        { new: true }
      );
      if (!updated) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      return NextResponse.json({ success: true, id, isRead: nextIsRead });
    }

    const updated = await prisma.notification.updateMany({
      where: {
        id,
        organizationId: session.user.organizationId,
        ...(isManagement ? {} : { userId: session.user.id }),
      },
      data: { isRead: nextIsRead },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const acknowledgedAt = nextIsRead ? new Date() : null;
    try {
      await connectToDatabase();
      await NotificationMeta.findOneAndUpdate(
        { notificationId: id },
        { acknowledgedAt }
      );
    } catch {}

    return NextResponse.json({
      success: true,
      id,
      isRead: nextIsRead,
      acknowledgedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const isManagement = hasAnyRole(session.user.role, ROLE_GROUPS.MANAGEMENT);

    if (id.startsWith('dist-')) {
      if (!hasAnyRole(session.user.role, ROLE_GROUPS.DISTRIBUTION_PORTAL)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      await connectToDatabase();
      await DistributionNotification.findByIdAndDelete(id.replace(/^dist-/, ''));
      return NextResponse.json({ success: true });
    }

    if (id.startsWith('sys-')) {
      return NextResponse.json({ success: true });
    }

    const res = await prisma.notification.deleteMany({
      where: {
        id,
        organizationId: session.user.organizationId,
        ...(isManagement ? {} : { userId: session.user.id }),
      },
    });
    if (res.count === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    try {
      await connectToDatabase();
      await NotificationMeta.deleteOne({ notificationId: id });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to dismiss notification' }, { status: 500 });
  }
}
