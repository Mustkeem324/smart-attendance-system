import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import {
  NotificationMeta,
  NotificationCategory,
  NotificationPriority,
} from '@/models/employee-portal';
import { DistributionNotification } from '@/models/electronics-sales';
import { NotificationType, RequestStatus, Role } from '@prisma/client';
import { ROLE_GROUPS, hasAnyRole } from '@/lib/rbac';

export interface RichNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  link: string | null;
  actionLabel: string;
  actorName: string;
  actorRole?: string;
  details: Record<string, string | number | boolean>;
  source: 'WORKSPACE' | 'SYSTEM_LIVE' | 'DISTRIBUTION';
  acknowledgedAt?: string | null;
  createdAt: string;
}

export interface DispatchNotificationInput {
  organizationId: string;
  userIds: string[];
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  link?: string;
  actionLabel?: string;
  actorName?: string;
  actorRole?: string;
  details?: Record<string, string | number | boolean>;
}

/**
 * Sends persistent notifications to one or more users with structured rich metadata.
 */
export async function dispatchNotifications(input: DispatchNotificationInput) {
  const uniqueUserIds = Array.from(new Set(input.userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return [];

  const notifType = input.type || NotificationType.INFO;
  const createdRows = await Promise.all(
    uniqueUserIds.map((userId) =>
      prisma.notification.create({
        data: {
          organizationId: input.organizationId,
          userId,
          title: input.title,
          message: input.message,
          type: notifType,
          link: input.link || null,
          isRead: false,
        },
      })
    )
  );

  // Attach rich metadata in MongoDB non-fatally
  try {
    await connectToDatabase();
    await NotificationMeta.insertMany(
      createdRows.map((row) => ({
        notificationId: row.id,
        organizationId: input.organizationId,
        userId: row.userId,
        category: input.category || inferMeta(row).category,
        priority: input.priority || (notifType === 'ALERT' ? 'URGENT' : notifType === 'WARNING' ? 'HIGH' : 'NORMAL'),
        actorName: input.actorName || 'Salman Enterprises System',
        actorRole: input.actorRole || 'SYSTEM',
        actionLabel: input.actionLabel || 'Open Related View',
        details: input.details || {},
      }))
    );
  } catch (err) {
    console.error('NotificationMeta sync warning:', err);
  }

  return createdRows;
}

/**
 * Broadcasts an operational notification to all active HR/Admin managers in the organization.
 */
export async function notifyOrgManagers(
  params: Omit<DispatchNotificationInput, 'userIds'> & { excludeUserId?: string }
) {
  const managers = await prisma.user.findMany({
    where: {
      organizationId: params.organizationId,
      isActive: true,
      role: { in: [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER] },
      ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
    },
    select: { id: true },
    take: 25,
  });

  if (managers.length === 0) return [];
  return dispatchNotifications({
    ...params,
    userIds: managers.map((m) => m.id),
  });
}

export function inferMeta(n: {
  title?: string;
  type?: string;
  link?: string | null;
}): {
  category: NotificationCategory;
  priority: NotificationPriority;
  actionLabel: string;
} {
  const text = `${n.title || ''} ${n.link || ''}`.toLowerCase();
  let category: NotificationCategory = 'SYSTEM';
  let actionLabel = 'View Details';

  if (text.includes('leave') || text.includes('/leaves')) {
    category = 'LEAVE';
    actionLabel = 'Open Leaves & Approvals';
  } else if (text.includes('exception') || text.includes('geofence') || text.includes('mock') || text.includes('attendance') || text.includes('punch') || text.includes('check')) {
    category = 'ATTENDANCE';
    actionLabel = 'Inspect Attendance';
  } else if (text.includes('task') || text.includes('goal')) {
    category = 'TASK';
    actionLabel = 'Open My Tasks';
  } else if (text.includes('announcement') || text.includes('notice')) {
    category = 'ANNOUNCEMENT';
    actionLabel = 'View Announcement';
  } else if (text.includes('support') || text.includes('ticket')) {
    category = 'SUPPORT';
    actionLabel = 'Open Support Desk';
  } else if (text.includes('shift') || text.includes('swap')) {
    category = 'SHIFT';
    actionLabel = 'View Shift Roster';
  } else if (text.includes('password') || text.includes('verify') || text.includes('security')) {
    category = 'SECURITY';
    actionLabel = 'Review Security Event';
  } else if (text.includes('stock') || text.includes('inventory')) {
    category = 'INVENTORY';
    actionLabel = 'Inspect Inventory';
  } else if (text.includes('order') || text.includes('delivery')) {
    category = 'ORDER';
    actionLabel = 'View Order Status';
  }

  const priority: NotificationPriority =
    n.type === 'ALERT' ? 'URGENT' : n.type === 'WARNING' ? 'HIGH' : 'NORMAL';

  return { category, priority, actionLabel };
}

/**
 * Fetches rich notifications scoped to the authenticated user's identity & permissions.
 */
export async function fetchRichUserNotifications(params: {
  organizationId: string;
  userId: string;
  role: string;
  filter?: string | null;
  category?: string | null;
  search?: string | null;
  includeOrgScopeForAdmin?: boolean;
  limit?: number;
}) {
  const {
    organizationId,
    userId,
    role,
    filter = 'ALL',
    category,
    search,
    includeOrgScopeForAdmin = false,
    limit = 60,
  } = params;

  const isManagement = hasAnyRole(role, ROLE_GROUPS.MANAGEMENT);
  const canSeeDistribution = hasAnyRole(role, ROLE_GROUPS.DISTRIBUTION_PORTAL);
  const todayStr = new Date().toISOString().split('T')[0];

  const whereClause: any = { organizationId };
  if (!(includeOrgScopeForAdmin && isManagement)) {
    whereClause.userId = userId;
  }

  const [dbNotifications, missingCheckoutsCount, pendingLeavesCount, pendingExceptionsCount] =
    await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      isManagement
        ? prisma.attendanceRecord.count({
            where: {
              organizationId,
              date: { lt: todayStr },
              checkInTime: { not: null },
              checkOutTime: null,
            },
          })
        : Promise.resolve(0),
      isManagement
        ? prisma.leaveRequest.count({
            where: { organizationId, status: RequestStatus.PENDING },
          })
        : Promise.resolve(0),
      isManagement
        ? prisma.attendanceException.count({
            where: { organizationId, status: RequestStatus.PENDING },
          })
        : Promise.resolve(0),
    ]);

  // Fetch Mongo metadata and optional distribution alerts
  let metaMap = new Map<string, any>();
  let distNotifications: any[] = [];
  try {
    await connectToDatabase();
    const ids = dbNotifications.map((n) => n.id);
    if (ids.length > 0) {
      const metas = await NotificationMeta.find({ notificationId: { $in: ids } }).lean();
      metaMap = new Map(metas.map((m: any) => [m.notificationId, m]));
    }
    if (canSeeDistribution && (isManagement || hasAnyRole(role, ['SALES_MANAGER', 'INVENTORY_MANAGER']))) {
      distNotifications = await DistributionNotification.find()
        .sort({ createdAt: -1 })
        .limit(15)
        .lean();
    }
  } catch (err) {
    console.error('Notification metadata load warning:', err);
  }

  const dynamicAlerts: RichNotificationItem[] = [];
  if (isManagement && missingCheckoutsCount > 0) {
    dynamicAlerts.push({
      id: 'sys-missing-checkouts',
      title: 'Missing Check-Outs Detected',
      message: `${missingCheckoutsCount} employee shift record(s) before ${todayStr} have a check-in without check-out. Review and regularize attendance logs.`,
      type: 'WARNING',
      category: 'ATTENDANCE',
      priority: 'HIGH',
      isRead: false,
      link: '/attendance',
      actionLabel: 'Review Attendance Logs',
      actorName: 'Attendance Compliance Monitor',
      actorRole: 'SYSTEM',
      details: { PendingRecords: missingCheckoutsCount, ThresholdDate: todayStr },
      source: 'SYSTEM_LIVE',
      createdAt: new Date().toISOString(),
    });
  }
  if (isManagement && pendingLeavesCount > 0) {
    dynamicAlerts.push({
      id: 'sys-pending-leaves',
      title: 'Pending Leave Approvals',
      message: `${pendingLeavesCount} employee leave request(s) are currently awaiting supervisor review.`,
      type: 'INFO',
      category: 'LEAVE',
      priority: 'HIGH',
      isRead: false,
      link: '/leaves',
      actionLabel: 'Review Leave Queue',
      actorName: 'Leave Engine',
      actorRole: 'SYSTEM',
      details: { PendingRequests: pendingLeavesCount },
      source: 'SYSTEM_LIVE',
      createdAt: new Date().toISOString(),
    });
  }
  if (isManagement && pendingExceptionsCount > 0) {
    dynamicAlerts.push({
      id: 'sys-pending-exceptions',
      title: 'Geofence Exceptions Pending Review',
      message: `${pendingExceptionsCount} location or camera attendance exception(s) await verification.`,
      type: 'ALERT',
      category: 'ATTENDANCE',
      priority: 'URGENT',
      isRead: false,
      link: '/attendance/exceptions',
      actionLabel: 'Inspect Exceptions',
      actorName: 'Geofence Monitor',
      actorRole: 'SYSTEM',
      details: { OpenExceptions: pendingExceptionsCount },
      source: 'SYSTEM_LIVE',
      createdAt: new Date().toISOString(),
    });
  }

  const workspaceItems: RichNotificationItem[] = dbNotifications.map((n) => {
    const meta = metaMap.get(n.id);
    const fallback = inferMeta(n);
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      type: (n.type as any) || 'INFO',
      category: (meta?.category as NotificationCategory) || fallback.category,
      priority: (meta?.priority as NotificationPriority) || fallback.priority,
      isRead: Boolean(n.isRead),
      link: n.link || null,
      actionLabel: meta?.actionLabel || fallback.actionLabel,
      actorName: meta?.actorName || 'Salman Enterprises Workspace',
      actorRole: meta?.actorRole,
      details: meta?.details || {},
      source: 'WORKSPACE',
      acknowledgedAt: meta?.acknowledgedAt ? new Date(meta.acknowledgedAt).toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    };
  });

  const distributionItems: RichNotificationItem[] = distNotifications.map((dn: any) => ({
    id: `dist-${String(dn._id)}`,
    title: dn.title,
    message: dn.message,
    type: dn.type === 'STOCK' ? 'WARNING' : dn.type === 'ORDER' ? 'SUCCESS' : 'INFO',
    category: dn.type === 'STOCK' ? 'INVENTORY' : dn.type === 'ORDER' || dn.type === 'DELIVERY' ? 'ORDER' : dn.type === 'FINANCE' ? 'FINANCE' : 'SYSTEM',
    priority: dn.type === 'STOCK' ? 'HIGH' : 'NORMAL',
    isRead: Boolean(dn.isRead),
    link: dn.link || '/distribution',
    actionLabel: 'Open Distribution Console',
    actorName: 'Distribution Telemetry',
    actorRole: 'DISTRIBUTION',
    details: { Channel: 'B2B Distribution', Type: dn.type || 'SYSTEM' },
    source: 'DISTRIBUTION',
    createdAt: new Date(dn.createdAt).toISOString(),
  }));

  const allItems = [...workspaceItems, ...distributionItems, ...dynamicAlerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Deduplicate identical titles only? Keep unique IDs cleanly
  const unreadCount = allItems.filter((n) => !n.isRead).length;
  const urgentCount = allItems.filter((n) => !n.isRead && (n.priority === 'URGENT' || n.type === 'ALERT')).length;

  let filtered = allItems;
  if (filter === 'UNREAD') filtered = filtered.filter((n) => !n.isRead);
  else if (filter === 'READ') filtered = filtered.filter((n) => n.isRead);
  else if (filter === 'URGENT') filtered = filtered.filter((n) => n.priority === 'URGENT' || n.type === 'ALERT' || n.type === 'WARNING');

  if (category && category !== 'ALL') {
    filtered = filtered.filter((n) => n.category === category);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.actorName.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
    );
  }

  return {
    notifications: filtered,
    totalCount: allItems.length,
    unreadCount,
    urgentCount,
  };
}
