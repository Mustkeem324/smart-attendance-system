import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { Role, RequestStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isElevated = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
      Role.TEAM_MANAGER,
    ]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = {
      organizationId: session.user.organizationId,
    };

    if (!isElevated) {
      if (!session.employee) return NextResponse.json({ exceptions: [] });
      where.employeeId = session.employee.id;
    }

    if (status) {
      where.status = status as RequestStatus;
    }

    const exceptions = await prisma.attendanceException.findMany({
      where,
      include: {
        employee: {
          include: { department: true, branch: true, officeLocation: true },
        },
        attendanceRecord: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, count: exceptions.length, exceptions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const body = await req.json();
    const { reason, explanation, exceptionDate, attendanceRecordId, supportingDocument } = body;

    if (!reason || !explanation || !exceptionDate) {
      return NextResponse.json(
        { error: 'Reason, explanation, and exception date are required' },
        { status: 400 }
      );
    }

    const validReasons = [
      'GPS_UNAVAILABLE',
      'OUTSIDE_GEOFENCE',
      'CAMERA_NOT_WORKING',
      'MISSED_CHECK_IN',
      'MISSED_CHECK_OUT',
      'TEMPORARY_RELOCATION',
      'OTHER',
    ];

    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      );
    }

    const newException = await prisma.attendanceException.create({
      data: {
        organizationId: session.user.organizationId,
        employeeId: session.employee.id,
        attendanceRecordId: attendanceRecordId || null,
        exceptionDate,
        reason,
        explanation,
        supportingDocument: supportingDocument || null,
        status: RequestStatus.PENDING,
      },
      include: {
        employee: true,
      },
    });

    // Create Audit Log
    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'SUBMIT_ATTENDANCE_EXCEPTION',
      entity: 'AttendanceException',
      entityId: newException.id,
      newValues: { reason, explanation, exceptionDate },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'Browser',
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance exception request submitted for supervisor approval',
      exception: newException,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
