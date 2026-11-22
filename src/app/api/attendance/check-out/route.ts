export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateGeofence } from '@/lib/geo';
import { evaluateShiftAttendance } from '@/lib/attendance';
import { createAuditLog } from '@/lib/audit';
import { EventType } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const body = await req.json();
    const { latitude, longitude, accuracy, photo, clientMockFlag, notes, deviceId } = body;

    const employee = await prisma.employee.findUnique({
      where: { id: session.employee.id },
      include: {
        officeLocation: true,
        branch: true,
        shift: true,
      },
    });

    if (!employee || !employee.branch || !employee.shift) {
      return NextResponse.json({ error: 'Employee configuration missing' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Find active check-in record for today
    let record = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayStr,
        },
      },
    });

    // If overnight shift, might have checked in yesterday evening and checking out today morning
    if ((!record || !record.checkInTime) && employee.shift.isOvernight) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = yesterday.toISOString().split('T')[0];
      const yestRecord = await prisma.attendanceRecord.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: yestStr,
          },
        },
      });
      if (yestRecord && yestRecord.checkInTime && !yestRecord.checkOutTime) {
        record = yestRecord;
      }
    }

    if (!record || !record.checkInTime) {
      return NextResponse.json(
        { error: 'No active check-in record found. Cannot check out without checking in.' },
        { status: 400 }
      );
    }

    if (record.checkOutTime) {
      return NextResponse.json(
        { error: 'Attendance already checked out. Duplicate check-out is prevented.' },
        { status: 409 }
      );
    }

    const serverNow = new Date();

    // Office coordinates (prefer specific OfficeLocation)
    const officeLat = employee.officeLocation?.latitude ?? employee.branch.latitude;
    const officeLon = employee.officeLocation?.longitude ?? employee.branch.longitude;
    const allowedRadius = employee.officeLocation?.radiusMeters ?? employee.branch.radiusMeters ?? 50;
    const officeLocationId = employee.officeLocation?.id ?? record.officeLocationId;

    // Geofence check for check-out (if GPS provided)
    let geoValidation = null;
    if (latitude !== undefined && longitude !== undefined) {
      geoValidation = validateGeofence(
        Number(latitude),
        Number(longitude),
        Number(accuracy || 10),
        officeLat,
        officeLon,
        allowedRadius,
        clientMockFlag
      );
    }

    // Evaluate shift completion and hours
    const evaluation = evaluateShiftAttendance(record.checkInTime, serverNow, employee.shift);

    const result = await prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkOutTime: serverNow,
          totalHours: evaluation.totalWorkingHours,
          earlyDepartureMinutes: evaluation.earlyDepartureMinutes,
          overtimeHours: evaluation.overtimeHours,
          status: evaluation.status,
          checkOutLatitude: latitude ? Number(latitude) : null,
          checkOutLongitude: longitude ? Number(longitude) : null,
          checkOutAccuracy: accuracy ? Number(accuracy) : null,
          checkOutDistanceMeters: geoValidation ? geoValidation.distanceMeters : null,
          checkOutWithinGeofence: geoValidation ? geoValidation.isWithinGeofence : null,
          checkOutPhoto: photo || null,
          adminNotes: record.adminNotes
            ? `${record.adminNotes} | Checked out`
            : notes || 'Checked out successfully',
        },
      });

      const event = await tx.attendanceEvent.create({
        data: {
          attendanceRecordId: record.id,
          employeeId: employee.id,
          officeLocationId,
          eventType: EventType.CHECK_OUT,
          timestamp: serverNow,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          accuracy: accuracy ? Number(accuracy) : null,
          distanceMeters: geoValidation ? geoValidation.distanceMeters : null,
          isWithinGeofence: geoValidation ? geoValidation.isWithinGeofence : true,
          photo: photo || null,
          deviceId: deviceId || null,
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Browser',
        },
      });

      return { updatedRecord, event };
    });

    // Send in-app notification
    await prisma.notification.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        title: 'Check-Out Completed',
        message: `Working hours logged: ${evaluation.totalWorkingHours} hrs. Overtime: ${evaluation.overtimeHours} hrs.`,
        type: 'SUCCESS',
      },
    });

    // Security audit log
    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'ATTENDANCE_CHECK_OUT',
      entity: 'AttendanceRecord',
      entityId: record.id,
      newValues: {
        checkOutTime: serverNow,
        totalHours: evaluation.totalWorkingHours,
        status: evaluation.status,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'Browser',
    });

    return NextResponse.json({
      success: true,
      message: 'Check-out completed successfully',
      record: result.updatedRecord,
      summary: {
        totalHours: evaluation.totalWorkingHours,
        overtime: evaluation.overtimeHours,
        earlyDepartureMinutes: evaluation.earlyDepartureMinutes,
      },
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: error.message || 'Check-out failed' }, { status: 500 });
  }
}
