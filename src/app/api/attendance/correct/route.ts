export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { Role, RequestStatus, AttendanceStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      attendanceRecordId,
      date,
      checkInTime,
      checkOutTime,
      reason,
      status: targetStatus,
      isDirectAdminCorrection,
      correctionId,
      decision, // "APPROVED" or "REJECTED"
    } = body;

    const isHrOrAdmin = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
    ]);

    // Scenario 1: Admin / HR directly corrects an attendance record
    if (isDirectAdminCorrection && isHrOrAdmin) {
      if (!attendanceRecordId) {
        return NextResponse.json({ error: 'Attendance record ID is required' }, { status: 400 });
      }

      const existingRecord = await prisma.attendanceRecord.findUnique({
        where: { id: attendanceRecordId },
      });

      if (!existingRecord) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      const updateData: any = {
        isManualEntry: true,
        correctedByUserId: session.user.id,
        correctionReason: reason || 'Manual administrative correction',
      };

      if (checkInTime) updateData.checkInTime = new Date(checkInTime);
      if (checkOutTime) updateData.checkOutTime = new Date(checkOutTime);
      if (targetStatus) updateData.status = targetStatus as AttendanceStatus;

      // Recalculate hours if both present
      const inTime = updateData.checkInTime || existingRecord.checkInTime;
      const outTime = updateData.checkOutTime || existingRecord.checkOutTime;
      if (inTime && outTime) {
        const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
        updateData.totalHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
      }

      const updated = await prisma.attendanceRecord.update({
        where: { id: attendanceRecordId },
        data: updateData,
      });

      // Audit Log
      await createAuditLog({
        organizationId: session.user.organizationId,
        userId: session.user.id,
        action: 'MANUAL_ATTENDANCE_CORRECTION',
        entity: 'AttendanceRecord',
        entityId: attendanceRecordId,
        oldValues: existingRecord,
        newValues: updated,
      });

      return NextResponse.json({
        success: true,
        message: 'Attendance record updated by administrator',
        record: updated,
      });
    }

    // Scenario 2: Manager / HR reviews an existing correction request
    if (correctionId && decision && isHrOrAdmin) {
      const correction = await prisma.attendanceCorrection.findUnique({
        where: { id: correctionId },
        include: { attendanceRecord: true },
      });

      if (!correction) {
        return NextResponse.json({ error: 'Correction request not found' }, { status: 404 });
      }

      const updatedCorrection = await prisma.attendanceCorrection.update({
        where: { id: correctionId },
        data: {
          status: decision === 'APPROVED' ? RequestStatus.APPROVED : RequestStatus.REJECTED,
          reviewedByUserId: session.user.id,
          reviewRemark: reason || `Correction ${decision.toLowerCase()} by HR`,
          reviewedAt: new Date(),
        },
      });

      if (decision === 'APPROVED') {
        await prisma.attendanceRecord.update({
          where: { id: correction.attendanceRecordId },
          data: {
            checkInTime: correction.requestedCheckIn || undefined,
            checkOutTime: correction.requestedCheckOut || undefined,
            status: AttendanceStatus.PRESENT,
            isManualEntry: true,
            correctedByUserId: session.user.id,
            correctionReason: correction.reason,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Correction request ${decision.toLowerCase()}`,
        correction: updatedCorrection,
      });
    }

    // Scenario 3: Employee submits a correction request
    if (!session.employee) {
      return NextResponse.json({ error: 'Employee profile required' }, { status: 400 });
    }

    if (!reason || (!checkInTime && !checkOutTime)) {
      return NextResponse.json({ error: 'Reason and corrected punch times are required' }, { status: 400 });
    }

    let recordId = attendanceRecordId;
    if (!recordId && date) {
      let rec = await prisma.attendanceRecord.findUnique({
        where: {
          employeeId_date: {
            employeeId: session.employee.id,
            date,
          },
        },
      });
      if (!rec) {
        rec = await prisma.attendanceRecord.create({
          data: {
            organizationId: session.user.organizationId,
            employeeId: session.employee.id,
            date,
            status: AttendanceStatus.MISSED_PUNCH,
          },
        });
      }
      recordId = rec.id;
    }

    const newCorrection = await prisma.attendanceCorrection.create({
      data: {
        attendanceRecordId: recordId,
        employeeId: session.employee.id,
        requestedCheckIn: checkInTime ? new Date(checkInTime) : null,
        requestedCheckOut: checkOutTime ? new Date(checkOutTime) : null,
        reason,
        status: RequestStatus.PENDING,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Correction request submitted for manager review',
      correction: newCorrection,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
