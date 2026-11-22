export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateGeofence } from '@/lib/geo';
import { evaluateShiftAttendance } from '@/lib/attendance';
import { createAuditLog } from '@/lib/audit';
import { AttendanceStatus, EventType, EmploymentStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session || !session.employee) {
      return NextResponse.json({ error: 'Unauthorized: Employee profile required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      latitude,
      longitude,
      accuracy,
      photo,
      clientMockFlag,
      notes,
      allowException,
      deviceId,
    } = body;

    // 1. Validate Input Coordinates
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'GPS coordinates (latitude, longitude) are required to mark attendance' },
        { status: 400 }
      );
    }

    // 2. Validate Photograph
    if (!photo || typeof photo !== 'string' || (!photo.startsWith('data:image/') && !photo.startsWith('http'))) {
      return NextResponse.json(
        { error: 'Valid live camera selfie photograph is required for attendance verification' },
        { status: 400 }
      );
    }

    // Max 5MB check
    if (photo.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Photograph size exceeds maximum allowed threshold (5MB)' },
        { status: 400 }
      );
    }

    // 3. Retrieve Employee with Office Location & Shift
    const employee = await prisma.employee.findUnique({
      where: { id: session.employee.id },
      include: {
        officeLocation: true,
        branch: true,
        shift: true,
      },
    });

    if (!employee || !employee.branch || !employee.shift) {
      return NextResponse.json({ error: 'Employee branch or shift configuration missing' }, { status: 400 });
    }

    // Check Active Account Status
    if (employee.employmentStatus === EmploymentStatus.TERMINATED || employee.employmentStatus === EmploymentStatus.RESIGNED) {
      return NextResponse.json({ error: 'Account inactive or departed. Cannot record attendance.' }, { status: 403 });
    }

    // 4. Target Office Geofence Parameters
    const officeLat = employee.officeLocation?.latitude ?? employee.branch.latitude;
    const officeLon = employee.officeLocation?.longitude ?? employee.branch.longitude;
    const allowedRadius = employee.officeLocation?.radiusMeters ?? employee.branch.radiusMeters ?? 50;
    const minGpsAccuracy = employee.officeLocation?.minGpsAccuracyMeters ?? 30;
    const officeLocationId = employee.officeLocation?.id ?? null;

    const todayStr = new Date().toISOString().split('T')[0];

    // 5. Prevent Duplicate Check-In
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayStr,
        },
      },
    });

    if (existing && existing.checkInTime) {
      return NextResponse.json(
        { error: 'Active check-in already recorded for today. Duplicate punch is prevented.' },
        { status: 409 }
      );
    }

    // 6. Server-Side Geofence & GPS Accuracy Validation
    const geoValidation = validateGeofence(
      Number(latitude),
      Number(longitude),
      Number(accuracy || 10),
      officeLat,
      officeLon,
      allowedRadius,
      clientMockFlag,
      minGpsAccuracy
    );

    // If GPS accuracy is insufficient, require the employee to improve accuracy
    if (!geoValidation.isAccuracyAcceptable && !allowException) {
      return NextResponse.json(
        {
          error: 'Low GPS accuracy',
          code: 'LOW_ACCURACY',
          message: geoValidation.statusMessage,
          details: {
            accuracyMeters: geoValidation.accuracyMeters,
            minAccuracyRequired: minGpsAccuracy,
          },
        },
        { status: 422 }
      );
    }

    // If outside geofence and exception not requested
    if (!geoValidation.isWithinGeofence && !allowException) {
      return NextResponse.json(
        {
          error: 'Geofence verification failed',
          code: 'OUTSIDE_GEOFENCE',
          message: geoValidation.statusMessage,
          details: {
            distanceMeters: geoValidation.distanceMeters,
            allowedRadiusMeters: allowedRadius,
            isWithinGeofence: false,
          },
          canRequestException: true,
        },
        { status: 403 }
      );
    }

    const serverNow = new Date();

    // 7. Evaluate Shift Rules (Lateness, Grace Period)
    const shiftEvaluation = evaluateShiftAttendance(serverNow, null, employee.shift);
    let finalStatus = shiftEvaluation.status;

    if (!geoValidation.isWithinGeofence) {
      finalStatus = AttendanceStatus.PENDING_APPROVAL;
    }

    // 8. Execute Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: todayStr,
          },
        },
        update: {
          officeLocationId,
          checkInTime: serverNow,
          status: finalStatus,
          lateMinutes: shiftEvaluation.lateMinutes,
          isVerified: geoValidation.isWithinGeofence && geoValidation.isAccuracyAcceptable,
          checkInLatitude: Number(latitude),
          checkInLongitude: Number(longitude),
          checkInAccuracy: Number(accuracy || 10),
          checkInDistanceMeters: geoValidation.distanceMeters,
          checkInWithinGeofence: geoValidation.isWithinGeofence,
          checkInMockDetected: geoValidation.isMockDetected,
          checkInPhoto: photo,
          adminNotes:
            notes ||
            (geoValidation.isWithinGeofence
              ? `Verified via GPS & Live Selfie (${geoValidation.distanceMeters.toFixed(1)}m from office)`
              : 'Outside geofence check-in - flagged for administrative review'),
        },
        create: {
          organizationId: session.user.organizationId,
          employeeId: employee.id,
          officeLocationId,
          date: todayStr,
          checkInTime: serverNow,
          status: finalStatus,
          lateMinutes: shiftEvaluation.lateMinutes,
          isVerified: geoValidation.isWithinGeofence && geoValidation.isAccuracyAcceptable,
          checkInLatitude: Number(latitude),
          checkInLongitude: Number(longitude),
          checkInAccuracy: Number(accuracy || 10),
          checkInDistanceMeters: geoValidation.distanceMeters,
          checkInWithinGeofence: geoValidation.isWithinGeofence,
          checkInMockDetected: geoValidation.isMockDetected,
          checkInPhoto: photo,
          adminNotes:
            notes ||
            (geoValidation.isWithinGeofence
              ? `Verified via GPS & Live Selfie (${geoValidation.distanceMeters.toFixed(1)}m from office)`
              : 'Outside geofence check-in - flagged for administrative review'),
        },
      });

      const event = await tx.attendanceEvent.create({
        data: {
          attendanceRecordId: record.id,
          employeeId: employee.id,
          officeLocationId,
          eventType: EventType.CHECK_IN,
          timestamp: serverNow,
          latitude: Number(latitude),
          longitude: Number(longitude),
          accuracy: Number(accuracy || 10),
          distanceMeters: geoValidation.distanceMeters,
          isWithinGeofence: geoValidation.isWithinGeofence,
          isMockDetected: geoValidation.isMockDetected,
          photo,
          deviceId: deviceId || null,
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Browser',
        },
      });

      return { record, event };
    });

    // 9. Send Notification
    await prisma.notification.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        title: geoValidation.isWithinGeofence ? 'Check-In Recorded' : 'Check-In Pending Approval',
        message: `Check-in recorded at ${serverNow.toLocaleTimeString()} (${geoValidation.distanceMeters.toFixed(1)}m from office). Status: ${finalStatus}`,
        type: geoValidation.isWithinGeofence ? 'SUCCESS' : 'WARNING',
      },
    });

    // 10. Security Audit Log
    await createAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: 'ATTENDANCE_CHECK_IN',
      entity: 'AttendanceRecord',
      entityId: result.record.id,
      newValues: {
        date: todayStr,
        time: serverNow,
        status: finalStatus,
        distanceMeters: geoValidation.distanceMeters,
        withinGeofence: geoValidation.isWithinGeofence,
        accuracy: geoValidation.accuracyMeters,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'Browser',
    });

    return NextResponse.json({
      success: true,
      message: geoValidation.isWithinGeofence
        ? 'Check-in recorded successfully'
        : 'Attendance recorded outside geofence (Pending Approval)',
      record: result.record,
      geofence: geoValidation,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: error.message || 'Check-in failed' }, { status: 500 });
  }
}
