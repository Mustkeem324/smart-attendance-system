export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { Role, RequestStatus, AttendanceStatus } from '@prisma/client';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
      Role.TEAM_MANAGER,
    ]);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to decide exceptions' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { action, reviewRemark } = body; // 'APPROVE' or 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Action must be APPROVE or REJECT' }, { status: 400 });
    }

    const exception = await prisma.attendanceException.findUnique({
      where: { id },
      include: { employee: true, attendanceRecord: true },
    });

    if (!exception || exception.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Exception request not found' }, { status: 404 });
    }

    if (exception.status !== RequestStatus.PENDING) {
      return NextResponse.json(
        { error: `Exception has already been ${exception.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    const newStatus = action === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED;

    const updated = await prisma.attendanceException.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedByUserId: session.user.id,
        reviewRemark: reviewRemark || `Exception ${newStatus.toLowerCase()} by supervisor`,
        reviewedAt: new Date(),
      },
    });

    // If approved and linked to an attendance record, rectify status
    if (action === 'APPROVE') {
      if (exception.attendanceRecordId) {
        await prisma.attendanceRecord.update({
          where: { id: exception.attendanceRecordId },
          data: {
            status: AttendanceStatus.PRESENT,
            isVerified: true,
            adminNotes: `Approved exception: ${exception.reason} - ${exception.explanation}`,
          },
        });
      } else {
        // Upsert record for that date as PRESENT
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: exception.employeeId,
              date: exception.exceptionDate,
            },
          },
          update: {
            status: AttendanceStatus.PRESENT,
            isVerified: true,
            isManualEntry: true,
            adminNotes: `Approved exception: ${exception.reason}`,
          },
          create: {
            organizationId: exception.organizationId,
            employeeId: exception.employeeId,
            date: exception.exceptionDate,
            status: AttendanceStatus.PRESENT,
            isVerified: true,
            isManualEntry: true,
            adminNotes: `Approved exception: ${exception.reason}`,
          },
        });
      }

      // Notify employee
      await prisma.notification.create({
        data: {
          organizationId: session.user.organizationId,
          userId: exception.employee.userId,
          title: 'Attendance Exception Approved',
          message: `Your exception request for ${exception.exceptionDate} (${exception.reason}) has been approved.`,
          type: 'SUCCESS',
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          organizationId: session.user.organizationId,
          userId: exception.employee.userId,
          title: 'Attendance Exception Rejected',
          message: `Your exception request for ${exception.exceptionDate} was rejected. Remark: ${reviewRemark || 'No remark provided'}`,
          type: 'ALERT',
        },
      });
    }

    // Audit log
    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: `${action}_ATTENDANCE_EXCEPTION`,
      entity: 'AttendanceException',
      entityId: id,
      newValues: { status: newStatus, reviewRemark },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'Browser',
    });

    return NextResponse.json({
      success: true,
      message: `Attendance exception ${newStatus.toLowerCase()} successfully`,
      exception: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
