export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { processLeaveDecision } from '@/lib/leave-engine';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { dispatchNotifications } from '@/lib/notifications';
import { Role, AttendanceStatus, NotificationType } from '@prisma/client';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
      Role.TEAM_MANAGER,
    ]);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { action, reviewRemark } = body; // action: 'APPROVE' or 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Action must be APPROVE or REJECT' }, { status: 400 });
    }

    const updated = await processLeaveDecision(id, session.user.id, action, reviewRemark);

    // If approved, update attendance records to ON_LEAVE
    if (action === 'APPROVE') {
      const cur = new Date(updated.startDate);
      const end = new Date(updated.endDate);

      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: updated.employeeId,
              date: dateStr,
            },
          },
          update: {
            status: AttendanceStatus.ON_LEAVE,
            adminNotes: `Approved leave: ${updated.reason}`,
          },
          create: {
            organizationId: updated.organizationId,
            employeeId: updated.employeeId,
            date: dateStr,
            status: AttendanceStatus.ON_LEAVE,
            adminNotes: `Approved leave: ${updated.reason}`,
          },
        });
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Audit Log
    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: `${action}_LEAVE_REQUEST`,
      entity: 'LeaveRequest',
      entityId: id,
      newValues: { status: updated.status, reviewRemark },
    });

    // Notify employee of leave decision with full remark & dates
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: updated.employeeId },
      select: { userId: true, firstName: true, employeeCode: true },
    });
    if (targetEmployee?.userId) {
      const startIso = new Date(updated.startDate).toISOString().split('T')[0];
      const endIso = new Date(updated.endDate).toISOString().split('T')[0];
      await dispatchNotifications({
        organizationId: session.user.organizationId,
        userIds: [targetEmployee.userId],
        title: `Leave Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
        message: `Your leave request (${startIso} to ${endIso}, ${updated.totalDays} day(s)) was ${action === 'APPROVE' ? 'approved' : 'declined'}${reviewRemark ? `. Remark: "${reviewRemark}"` : '.'}`,
        type: action === 'APPROVE' ? NotificationType.SUCCESS : NotificationType.ALERT,
        category: 'LEAVE',
        priority: action === 'APPROVE' ? 'NORMAL' : 'HIGH',
        link: '/leaves',
        actionLabel: 'View Leave Status',
        actorName: session.employee ? `${session.employee.firstName} ${session.employee.lastName}` : session.user.email,
        actorRole: session.user.role,
        details: {
          Dates: `${startIso} to ${endIso}`,
          TotalDays: updated.totalDays,
          Status: updated.status,
          ...(reviewRemark ? { Remark: reviewRemark } : {}),
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Leave request ${action.toLowerCase()}ed successfully`,
      leaveRequest: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
