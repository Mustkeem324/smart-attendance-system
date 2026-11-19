import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, RequestStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.user, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status'); // PENDING, APPROVED, REJECTED or all
    const type = searchParams.get('type') || 'ALL'; // ALL, GEOFENCE, ACCURACY, CAMERA, CORRECTION
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));

    // 1. Fetch Attendance Exceptions
    const whereException: any = {
      organizationId: session.user.organizationId,
      ...(statusParam && statusParam !== 'ALL' && { status: statusParam as RequestStatus }),
    };

    if (type === 'GEOFENCE') whereException.reason = 'OUTSIDE_GEOFENCE';
    else if (type === 'ACCURACY') whereException.reason = 'GPS_UNAVAILABLE';
    else if (type === 'CAMERA') whereException.reason = 'CAMERA_FAILURE';

    const exceptions = await prisma.attendanceException.findMany({
      where: whereException,
      include: {
        employee: {
          include: { department: true, branch: true },
        },
        attendanceRecord: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 2. Fetch Attendance Corrections
    const whereCorrection: any = {
      attendanceRecord: { organizationId: session.user.organizationId },
      ...(statusParam && statusParam !== 'ALL' && { status: statusParam as RequestStatus }),
    };

    const corrections = await prisma.attendanceCorrection.findMany({
      where: whereCorrection,
      include: {
        employee: {
          include: { department: true, branch: true },
        },
        attendanceRecord: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 3. Flagged attendance events (outside geofence or mock location detected)
    const flaggedEvents = await prisma.attendanceEvent.findMany({
      where: {
        attendanceRecord: { organizationId: session.user.organizationId },
        OR: [{ isWithinGeofence: false }, { isMockDetected: true }],
      },
      include: {
        employee: {
          include: { department: true, branch: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalExceptions: exceptions.length,
        pendingExceptions: exceptions.filter((e) => e.status === RequestStatus.PENDING).length,
        pendingCorrections: corrections.filter((c) => c.status === RequestStatus.PENDING).length,
        flaggedEventsCount: flaggedEvents.length,
      },
      exceptions,
      corrections,
      flaggedEvents,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/attendance/exceptions:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
