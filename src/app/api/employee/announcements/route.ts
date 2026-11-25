export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import { CompanyAnnouncement } from '@/models/employee-portal';
import { dispatchNotifications } from '@/lib/notifications';
import { Role } from '@prisma/client';

const ANNOUNCE_ADMINS: Role[] = [
  Role.SUPER_ADMIN,
  Role.COMPANY_ADMIN,
  Role.HR_MANAGER,
  Role.TEAM_MANAGER,
];

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const isAdmin = requireRole(session.user.role, ANNOUNCE_ADMINS);
    const audienceOr: any[] = [
      { audienceType: 'ALL' },
      { audienceType: 'ROLE', targetRoles: session.user.role },
    ];
    if (session.employee?.branchId) {
      audienceOr.push({ audienceType: 'BRANCH', targetBranchIds: session.employee.branchId });
    }
    if (session.employee?.departmentId) {
      audienceOr.push({ audienceType: 'DEPARTMENT', targetDepartmentIds: session.employee.departmentId });
    }

    const filter = isAdmin
      ? { organizationId: session.user.organizationId }
      : { organizationId: session.user.organizationId, $or: audienceOr };

    const list = await CompanyAnnouncement.find(filter)
      .sort({ isPinned: -1, publishedAt: -1 })
      .limit(40)
      .lean();

    return NextResponse.json({
      success: true,
      announcements: list.map((a: any) => ({
        id: String(a._id),
        title: a.title,
        description: a.description,
        category: a.category,
        audienceType: a.audienceType,
        isPinned: Boolean(a.isPinned),
        publishedAt: a.publishedAt,
        createdByName: a.createdByName,
        isRead: Array.isArray(a.readByUserIds) && a.readByUserIds.includes(session.user.id),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load announcements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.user.role, ANNOUNCE_ADMINS)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      category = 'COMPANY',
      audienceType = 'ALL',
      targetBranchIds = [],
      targetDepartmentIds = [],
      targetRoles = [],
      isPinned = false,
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    await connectToDatabase();
    const createdByName = session.employee
      ? `${session.employee.firstName} ${session.employee.lastName}`
      : session.user.email.split('@')[0];

    const created = await CompanyAnnouncement.create({
      organizationId: session.user.organizationId,
      title: String(title).trim(),
      description: String(description).trim(),
      category,
      audienceType,
      targetBranchIds: Array.isArray(targetBranchIds) ? targetBranchIds : [],
      targetDepartmentIds: Array.isArray(targetDepartmentIds) ? targetDepartmentIds : [],
      targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
      isPinned: Boolean(isPinned),
      publishedAt: new Date(),
      createdByUserId: session.user.id,
      createdByName,
      readByUserIds: [session.user.id],
    });

    // Broadcast live notification to targeted audience users
    try {
      const targetEmployees = await prisma.employee.findMany({
        where: {
          organizationId: session.user.organizationId,
          employmentStatus: 'ACTIVE',
          ...(audienceType === 'BRANCH' && Array.isArray(targetBranchIds) && targetBranchIds.length > 0
            ? { branchId: { in: targetBranchIds } }
            : {}),
          ...(audienceType === 'DEPARTMENT' && Array.isArray(targetDepartmentIds) && targetDepartmentIds.length > 0
            ? { departmentId: { in: targetDepartmentIds } }
            : {}),
        },
        select: { userId: true },
        take: 100,
      });
      const targetUserIds = targetEmployees
        .map((e) => e.userId)
        .filter((uid) => uid && uid !== session.user.id);
      if (targetUserIds.length > 0) {
        await dispatchNotifications({
          organizationId: session.user.organizationId,
          userIds: targetUserIds,
          title: `Announcement: ${String(title).trim()}`,
          message: String(description).trim(),
          type: isPinned ? 'WARNING' : 'INFO',
          category: 'ANNOUNCEMENT',
          priority: isPinned ? 'HIGH' : 'NORMAL',
          link: '/employee/dashboard',
          actionLabel: 'View on Dashboard',
          actorName: createdByName,
          actorRole: session.user.role,
          details: { Category: category, Audience: audienceType },
        });
      }
    } catch {}

    return NextResponse.json(
      {
        success: true,
        announcement: {
          id: String(created._id),
          title: created.title,
          description: created.description,
          category: created.category,
          audienceType: created.audienceType,
          isPinned: created.isPinned,
          publishedAt: created.publishedAt,
          createdByName: created.createdByName,
          isRead: true,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to publish announcement' }, { status: 500 });
  }
}
