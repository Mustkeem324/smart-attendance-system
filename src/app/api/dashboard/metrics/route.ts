import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, AttendanceStatus, EmploymentStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = session.user;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Total & Active Employees
    const totalEmployees = await prisma.employee.count({
      where: { organizationId },
    });

    const activeEmployees = await prisma.employee.count({
      where: { organizationId, employmentStatus: EmploymentStatus.ACTIVE },
    });

    // 2. Today's Attendance Records
    const todayRecords = await prisma.attendanceRecord.findMany({
      where: { organizationId, date: todayStr },
      include: {
        employee: {
          include: { department: true, branch: true },
        },
      },
    });

    const presentCount = todayRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
    ).length;

    const lateCount = todayRecords.filter((r) => r.lateMinutes > 0).length;

    const earlyCount = todayRecords.filter((r) => r.earlyDepartureMinutes > 0).length;

    const checkedInCount = todayRecords.filter((r) => r.checkInTime && !r.checkOutTime).length;

    const checkedOutCount = todayRecords.filter((r) => r.checkOutTime).length;

    // 3. Approved Leaves for Today
    const todayDate = new Date();
    const onLeaveCount = await prisma.leaveRequest.count({
      where: {
        organizationId,
        status: 'APPROVED',
        startDate: { lte: todayDate },
        endDate: { gte: todayDate },
      },
    });

    // Absent = active employees - present - on leave
    const absentCount = Math.max(0, activeEmployees - presentCount - onLeaveCount);

    const attendancePercentage =
      activeEmployees > 0 ? Math.round((presentCount / activeEmployees) * 100) : 0;

    // 4. Department-wise breakdown
    const departments = await prisma.department.findMany({
      where: { organizationId },
      include: {
        employees: {
          select: { id: true },
        },
      },
    });

    const departmentStats = departments.map((dept) => {
      const deptEmpIds = new Set(dept.employees.map((e) => e.id));
      const deptPresent = todayRecords.filter((r) => deptEmpIds.has(r.employeeId)).length;
      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        total: dept.employees.length,
        present: deptPresent,
        percentage:
          dept.employees.length > 0 ? Math.round((deptPresent / dept.employees.length) * 100) : 0,
      };
    });

    // 5. Branch-wise breakdown
    const branches = await prisma.branch.findMany({
      where: { organizationId },
      include: {
        employees: {
          select: { id: true },
        },
      },
    });

    const branchStats = branches.map((branch) => {
      const branchEmpIds = new Set(branch.employees.map((e) => e.id));
      const branchPresent = todayRecords.filter((r) => branchEmpIds.has(r.employeeId)).length;
      return {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        radiusMeters: branch.radiusMeters,
        total: branch.employees.length,
        present: branchPresent,
      };
    });

    // 6. Past 7 days trend
    const past7Days: { date: string; present: number; absent: number; late: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];

      const recordsForDay = await prisma.attendanceRecord.findMany({
        where: { organizationId, date: dStr },
      });

      const dayPresent = recordsForDay.filter(
        (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
      ).length;
      const dayLate = recordsForDay.filter((r) => r.lateMinutes > 0).length;

      past7Days.push({
        date: dStr,
        present: dayPresent,
        absent: Math.max(0, activeEmployees - dayPresent),
        late: dayLate,
      });
    }

    // 7. Recent punch events
    const recentEvents = await prisma.attendanceEvent.findMany({
      where: {
        attendanceRecord: { organizationId },
      },
      include: {
        employee: {
          include: { department: true, branch: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 8,
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalEmployees,
        activeEmployees,
        presentToday: presentCount,
        absentToday: absentCount,
        onLeaveToday: onLeaveCount,
        lateArrivals: lateCount,
        earlyDepartures: earlyCount,
        currentlyCheckedIn: checkedInCount,
        checkedOutToday: checkedOutCount,
        attendancePercentage,
      },
      departmentStats,
      branchStats,
      weeklyTrend: past7Days,
      recentEvents,
    });
  } catch (error: any) {
    console.error('Dashboard metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
