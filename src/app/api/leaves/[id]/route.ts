import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { processLeaveDecision } from '@/lib/leave-engine';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { Role, AttendanceStatus } from '@prisma/client';

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

    return NextResponse.json({
      success: true,
      message: `Leave request ${action.toLowerCase()}ed successfully`,
      leaveRequest: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
