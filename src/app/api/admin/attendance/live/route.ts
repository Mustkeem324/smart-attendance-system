export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, AttendanceStatus, EmploymentStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
      Role.TEAM_MANAGER,
    ]);

    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const branchId = searchParams.get('branchId');
    const departmentId = searchParams.get('departmentId');
    const employeeId = searchParams.get('employeeId');

    const organizationId = session.user.organizationId;

    // Fetch active employees
    const empWhere: any = {
      organizationId,
      employmentStatus: EmploymentStatus.ACTIVE,
    };
    if (branchId) empWhere.branchId = branchId;
    if (departmentId) empWhere.departmentId = departmentId;
    if (employeeId) empWhere.id = employeeId;

    const totalActiveEmployees = await prisma.employee.findMany({
      where: empWhere,
      include: {
        department: true,
        branch: true,
        officeLocation: true,
      },
    });

    const activeEmpIds = new Set(totalActiveEmployees.map((e) => e.id));

    // Fetch attendance records for this date
    const records = await prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        date,
        employeeId: { in: Array.from(activeEmpIds) },
      },
      include: {
        employee: {
          include: { department: true, branch: true, officeLocation: true },
        },
        officeLocation: true,
        events: { orderBy: { timestamp: 'asc' } },
        exceptions: true,
      },
    });

    // Categorize
    const currentlyCheckedIn = records.filter((r) => r.checkInTime && !r.checkOutTime);
    const checkedOut = records.filter((r) => r.checkOutTime);
    const lateArrivals = records.filter((r) => r.lateMinutes > 0);

    // Approved leaves for date
    const targetDateObj = new Date(date);
    const onLeaveRequests = await prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: 'APPROVED',
        startDate: { lte: targetDateObj },
        endDate: { gte: targetDateObj },
        employeeId: { in: Array.from(activeEmpIds) },
      },
      include: {
        employee: { include: { department: true } },
        leaveType: true,
      },
    });

    const onLeaveEmpIds = new Set(onLeaveRequests.map((l) => l.employeeId));
    const attendedEmpIds = new Set(records.map((r) => r.employeeId));

    // Absent = active employees not in records and not on leave
    const absentEmployees = totalActiveEmployees.filter(
      (e) => !attendedEmpIds.has(e.id) && !onLeaveEmpIds.has(e.id)
    );

    // Pending exceptions
    const pendingExceptions = await prisma.attendanceException.findMany({
      where: {
        organizationId,
        exceptionDate: date,
        status: 'PENDING',
      },
      include: {
        employee: { include: { department: true, branch: true } },
      },
    });

    // Registered office locations for map
    const officeLocations = await prisma.officeLocation.findMany({
      where: { organizationId, isActive: true },
      include: {
        branch: true,
        _count: { select: { employees: true } },
      },
    });

    // Map markers: combine office locations + employee punch locations
    const mapMarkers = [
      ...officeLocations.map((off) => ({
        type: 'OFFICE' as const,
        id: off.id,
        name: off.name,
        latitude: off.latitude,
        longitude: off.longitude,
        radiusMeters: off.radiusMeters,
        assignedEmployeesCount: off._count.employees,
      })),
      ...records
        .filter((r) => r.checkInLatitude && r.checkInLongitude)
        .map((r) => ({
          type: 'PUNCH' as const,
          id: r.id,
          employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
          employeeCode: r.employee.employeeCode,
          department: r.employee.department?.name,
          latitude: r.checkInLatitude!,
          longitude: r.checkInLongitude!,
          accuracy: r.checkInAccuracy,
          distanceMeters: r.checkInDistanceMeters,
          isWithinGeofence: r.checkInWithinGeofence,
          photo: r.checkInPhoto,
          time: r.checkInTime,
          status: r.status,
        })),
    ];

    return NextResponse.json({
      success: true,
      date,
      summary: {
        totalActiveStaff: totalActiveEmployees.length,
        currentlyCheckedInCount: currentlyCheckedIn.length,
        checkedOutCount: checkedOut.length,
        lateArrivalsCount: lateArrivals.length,
        absentCount: absentEmployees.length,
        onLeaveCount: onLeaveRequests.length,
        pendingExceptionsCount: pendingExceptions.length,
      },
      currentlyCheckedIn,
      checkedOut,
      lateArrivals,
      absentEmployees,
      onLeaveRequests,
      pendingExceptions,
      officeLocations,
      mapMarkers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
