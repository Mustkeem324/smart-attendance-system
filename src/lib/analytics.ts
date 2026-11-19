import { prisma } from '@/lib/prisma';
import { AttendanceStatus, EmploymentStatus, RequestStatus } from '@prisma/client';

export interface EmployeeDailyStatus {
  employeeId: string;
  employeeCode: string;
  name: string;
  email: string;
  designation: string;
  departmentId: string;
  departmentName: string;
  branchId: string;
  branchName: string;
  status: AttendanceStatus | 'PENDING_APPROVAL';
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeHours: number;
  isVerified: boolean;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  reason?: string;
}

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Accurately determines daily schedule and attendance status for all employees on a given date.
 * Excludes holidays, approved leaves, and weekly offs from being counted as absent.
 */
export async function calculateDailyEmployeeStatuses(
  organizationId: string,
  dateStr: string,
  filters?: { branchId?: string; departmentId?: string }
): Promise<EmployeeDailyStatus[]> {
  const targetDate = new Date(`${dateStr}T12:00:00Z`);
  const dayName = DAY_NAMES[targetDate.getUTCDay()];

  // 1. Fetch active/applicable employees
  const whereEmp: any = {
    organizationId,
    employmentStatus: { in: [EmploymentStatus.ACTIVE, EmploymentStatus.PROBATION, EmploymentStatus.NOTICE_PERIOD] },
    joiningDate: { lte: targetDate },
  };
  if (filters?.branchId) whereEmp.branchId = filters.branchId;
  if (filters?.departmentId) whereEmp.departmentId = filters.departmentId;

  const employees = await prisma.employee.findMany({
    where: whereEmp,
    include: {
      department: true,
      branch: true,
      shift: true,
    },
    orderBy: { firstName: 'asc' },
  });

  // 2. Fetch holidays on this date
  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId,
      date: dateStr,
    },
  });
  const orgWideHoliday = holidays.find((h) => !h.branchId);
  const branchHolidayMap = new Map<string, string>();
  holidays.forEach((h) => {
    if (h.branchId) branchHolidayMap.set(h.branchId, h.name);
  });

  // 3. Fetch approved leaves covering this date
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      organizationId,
      status: RequestStatus.APPROVED,
      startDate: { lte: targetDate },
      endDate: { gte: targetDate },
    },
    include: {
      leaveType: true,
    },
  });
  const leaveEmpMap = new Map<string, string>();
  leaves.forEach((l) => leaveEmpMap.set(l.employeeId, l.leaveType.name));

  // 4. Fetch attendance records for this date
  const records = await prisma.attendanceRecord.findMany({
    where: {
      organizationId,
      date: dateStr,
    },
  });
  const recordMap = new Map<string, any>();
  records.forEach((r) => recordMap.set(r.employeeId, r));

  // 5. Evaluate each employee's status
  const result: EmployeeDailyStatus[] = [];

  for (const emp of employees) {
    const record = recordMap.get(emp.id);
    const leaveReason = leaveEmpMap.get(emp.id);
    const branchHolidayName = branchHolidayMap.get(emp.branchId) || orgWideHoliday?.name;

    // Weekly off check
    const weeklyOffs = (emp.weeklyOff || 'SUNDAY').toUpperCase().split(',').map((s) => s.trim());
    const isWeeklyOff = weeklyOffs.includes(dayName);

    let status: AttendanceStatus | 'PENDING_APPROVAL' = AttendanceStatus.ABSENT;
    let reason: string | undefined = undefined;

    if (record) {
      status = record.status;
      if (record.status === AttendanceStatus.ABSENT && record.checkInTime) {
        status = AttendanceStatus.PRESENT;
      }
    } else if (leaveReason) {
      status = AttendanceStatus.ON_LEAVE;
      reason = leaveReason;
    } else if (branchHolidayName) {
      status = AttendanceStatus.PUBLIC_HOLIDAY;
      reason = branchHolidayName;
    } else if (isWeeklyOff) {
      status = AttendanceStatus.WEEKLY_OFF;
      reason = 'Scheduled Weekly Off';
    } else {
      status = AttendanceStatus.ABSENT;
      reason = 'Unexcused Absence (No Punch)';
    }

    result.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      email: emp.email,
      designation: emp.designation,
      departmentId: emp.departmentId,
      departmentName: emp.department.name,
      branchId: emp.branchId,
      branchName: emp.branch.name,
      status,
      checkInTime: record?.checkInTime ? record.checkInTime.toISOString() : null,
      checkOutTime: record?.checkOutTime ? record.checkOutTime.toISOString() : null,
      totalHours: record?.totalHours || 0,
      lateMinutes: record?.lateMinutes || 0,
      earlyDepartureMinutes: record?.earlyDepartureMinutes || 0,
      overtimeHours: record?.overtimeHours || 0,
      isVerified: Boolean(record?.isVerified),
      checkInPhoto: record?.checkInPhoto || null,
      checkOutPhoto: record?.checkOutPhoto || null,
      reason,
    });
  }

  return result;
}

/**
 * Returns executive dashboard overview metrics matching all 12 KPI requirements.
 */
export async function getDashboardOverviewMetrics(
  organizationId: string,
  dateStr?: string,
  filters?: { branchId?: string; departmentId?: string }
) {
  const todayStr = dateStr || new Date().toISOString().split('T')[0];
  const statuses = await calculateDailyEmployeeStatuses(organizationId, todayStr, filters);

  const totalEmployees = await prisma.employee.count({
    where: {
      organizationId,
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
    },
  });

  const activeEmployees = await prisma.employee.count({
    where: {
      organizationId,
      employmentStatus: EmploymentStatus.ACTIVE,
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
    },
  });

  const presentToday = statuses.filter(
    (s) => s.status === AttendanceStatus.PRESENT || s.status === AttendanceStatus.LATE || s.status === AttendanceStatus.HALF_DAY
  ).length;

  const absentToday = statuses.filter((s) => s.status === AttendanceStatus.ABSENT).length;

  const currentlyCheckedIn = statuses.filter((s) => s.checkInTime && !s.checkOutTime).length;

  const checkedOut = statuses.filter((s) => Boolean(s.checkOutTime)).length;

  const onLeave = statuses.filter((s) => s.status === AttendanceStatus.ON_LEAVE).length;

  const lateArrivals = statuses.filter((s) => s.lateMinutes > 0).length;

  const earlyDepartures = statuses.filter((s) => s.earlyDepartureMinutes > 0).length;

  const halfDays = statuses.filter((s) => s.status === AttendanceStatus.HALF_DAY).length;

  const workFromHome = statuses.filter((s) => s.status === AttendanceStatus.WORK_FROM_HOME).length;

  // Pending corrections + exceptions
  const pendingCorrectionsCount = await prisma.attendanceCorrection.count({
    where: {
      status: RequestStatus.PENDING,
      employee: {
        organizationId,
        ...(filters?.branchId && { branchId: filters.branchId }),
        ...(filters?.departmentId && { departmentId: filters.departmentId }),
      },
    },
  });

  const pendingExceptionsCount = await prisma.attendanceException.count({
    where: {
      status: RequestStatus.PENDING,
      organizationId,
      ...(filters?.branchId && { employee: { branchId: filters.branchId } }),
      ...(filters?.departmentId && { employee: { departmentId: filters.departmentId } }),
    },
  });

  const totalPendingCorrections = pendingCorrectionsCount + pendingExceptionsCount;

  const attendancePercentage =
    activeEmployees > 0 ? Math.round((presentToday / activeEmployees) * 100) : 0;

  return {
    date: todayStr,
    kpis: {
      totalEmployees,
      activeEmployees,
      presentToday,
      absentToday,
      currentlyCheckedIn,
      checkedOut,
      onLeave,
      lateArrivals,
      earlyDepartures,
      halfDays,
      workFromHome,
      pendingCorrections: totalPendingCorrections,
      attendancePercentage,
    },
    detailedEmployees: statuses,
  };
}

/**
 * Daily attendance analytics breakdown
 */
export async function getDailyAnalytics(
  organizationId: string,
  dateStr: string,
  filters?: { branchId?: string; departmentId?: string }
) {
  const statuses = await calculateDailyEmployeeStatuses(organizationId, dateStr, filters);
  const scheduledCount = statuses.filter(
    (s) => s.status !== AttendanceStatus.WEEKLY_OFF && s.status !== AttendanceStatus.PUBLIC_HOLIDAY
  ).length;

  const presentCount = statuses.filter(
    (s) => s.status === AttendanceStatus.PRESENT || s.status === AttendanceStatus.LATE || s.status === AttendanceStatus.HALF_DAY
  ).length;

  const absentCount = statuses.filter((s) => s.status === AttendanceStatus.ABSENT).length;
  const leaveCount = statuses.filter((s) => s.status === AttendanceStatus.ON_LEAVE).length;
  const lateCount = statuses.filter((s) => s.lateMinutes > 0).length;
  const earlyCount = statuses.filter((s) => s.earlyDepartureMinutes > 0).length;
  const halfDayCount = statuses.filter((s) => s.status === AttendanceStatus.HALF_DAY).length;

  const attendancePercentage = scheduledCount > 0 ? Math.round((presentCount / scheduledCount) * 100) : 0;

  return {
    date: dateStr,
    scheduledEmployees: scheduledCount,
    presentEmployees: presentCount,
    absentEmployees: absentCount,
    approvedLeave: leaveCount,
    lateArrivals: lateCount,
    earlyDepartures: earlyCount,
    halfDays: halfDayCount,
    attendancePercentage,
    records: statuses,
  };
}

/**
 * Weekly analytics breakdown (Monday to Sunday) with week-on-week comparison
 */
export async function getWeeklyAnalytics(
  organizationId: string,
  referenceDateStr?: string,
  filters?: { branchId?: string; departmentId?: string }
) {
  const refDate = referenceDateStr ? new Date(`${referenceDateStr}T12:00:00Z`) : new Date();
  // Find Monday of the reference week
  const dayOfWeek = refDate.getUTCDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(refDate);
  monday.setUTCDate(refDate.getUTCDate() + diffToMonday);

  const days: any[] = [];
  let totalScheduled = 0;
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;

  for (let i = 0; i < 7; i++) {
    const curDate = new Date(monday);
    curDate.setUTCDate(monday.getUTCDate() + i);
    const dStr = curDate.toISOString().split('T')[0];
    const dayName = DAY_NAMES[curDate.getUTCDay()];

    const dayData = await getDailyAnalytics(organizationId, dStr, filters);

    totalScheduled += dayData.scheduledEmployees;
    totalPresent += dayData.presentEmployees;
    totalAbsent += dayData.absentEmployees;
    totalLate += dayData.lateArrivals;

    days.push({
      date: dStr,
      day: dayName.slice(0, 3),
      scheduled: dayData.scheduledEmployees,
      present: dayData.presentEmployees,
      absent: dayData.absentEmployees,
      leave: dayData.approvedLeave,
      late: dayData.lateArrivals,
      presentPercentage: dayData.attendancePercentage,
      absentPercentage:
        dayData.scheduledEmployees > 0
          ? Math.round((dayData.absentEmployees / dayData.scheduledEmployees) * 100)
          : 0,
    });
  }

  // Previous week calculation for week-on-week comparison
  const prevMonday = new Date(monday);
  prevMonday.setUTCDate(monday.getUTCDate() - 7);
  let prevTotalPresent = 0;
  let prevTotalScheduled = 0;

  for (let i = 0; i < 7; i++) {
    const pDate = new Date(prevMonday);
    pDate.setUTCDate(prevMonday.getUTCDate() + i);
    const pdStr = pDate.toISOString().split('T')[0];
    const pData = await getDailyAnalytics(organizationId, pdStr, filters);
    prevTotalPresent += pData.presentEmployees;
    prevTotalScheduled += pData.scheduledEmployees;
  }

  const currentWeekAvg = totalScheduled > 0 ? Math.round((totalPresent / totalScheduled) * 100) : 0;
  const prevWeekAvg = prevTotalScheduled > 0 ? Math.round((prevTotalPresent / prevTotalScheduled) * 100) : 0;
  const wowChange = currentWeekAvg - prevWeekAvg;

  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: new Date(monday.getTime() + 6 * 86400000).toISOString().split('T')[0],
    weeklyAveragePercentage: currentWeekAvg,
    previousWeekAveragePercentage: prevWeekAvg,
    weekOnWeekChangePercentage: wowChange,
    totalScheduled,
    totalPresent,
    totalAbsent,
    totalLate,
    days,
  };
}

/**
 * Monthly analytics breakdown
 */
export async function getMonthlyAnalytics(
  organizationId: string,
  year: number,
  month: number, // 1-12
  filters?: { branchId?: string; departmentId?: string }
) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0)); // last day of month
  const totalDaysInMonth = endDate.getUTCDate();

  let workingDays = 0;
  let totalPresentCount = 0;
  let totalAbsentCount = 0;
  let totalLeaveCount = 0;
  let totalLateCount = 0;
  let totalOvertimeHours = 0;
  const dailyTrends: any[] = [];

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const cur = new Date(Date.UTC(year, month - 1, d));
    const dStr = cur.toISOString().split('T')[0];
    const dayData = await getDailyAnalytics(organizationId, dStr, filters);

    if (dayData.scheduledEmployees > 0) {
      workingDays++;
    }

    totalPresentCount += dayData.presentEmployees;
    totalAbsentCount += dayData.absentEmployees;
    totalLeaveCount += dayData.approvedLeave;
    totalLateCount += dayData.lateArrivals;

    // Sum overtime from records
    dayData.records.forEach((r) => {
      totalOvertimeHours += r.overtimeHours;
    });

    dailyTrends.push({
      date: dStr,
      day: d,
      present: dayData.presentEmployees,
      absent: dayData.absentEmployees,
      leave: dayData.approvedLeave,
      late: dayData.lateArrivals,
      percentage: dayData.attendancePercentage,
    });
  }

  const scheduledTotal = totalPresentCount + totalAbsentCount + totalLeaveCount;
  const monthlyAttendancePercentage =
    scheduledTotal > 0 ? Math.round((totalPresentCount / scheduledTotal) * 100) : 0;

  // Employee comparison summary for the month
  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
    },
    include: { department: true },
  });

  const employeeStats = await Promise.all(
    employees.map(async (emp) => {
      const records = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: `${year}-${String(month).padStart(2, '0')}-01`, lte: `${year}-${String(month).padStart(2, '0')}-${totalDaysInMonth}` },
        },
      });

      const present = records.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
      const late = records.filter((r) => r.lateMinutes > 0).length;
      const overtime = records.reduce((acc, r) => acc + r.overtimeHours, 0);

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        code: emp.employeeCode,
        department: emp.department.name,
        presentDays: present,
        lateDays: late,
        overtimeHours: Math.round(overtime * 10) / 10,
        attendancePercentage: workingDays > 0 ? Math.round((present / workingDays) * 100) : 0,
      };
    })
  );

  return {
    year,
    month,
    totalDaysInMonth,
    workingDays,
    monthlyAttendancePercentage,
    totalPresentDays: totalPresentCount,
    totalAbsentDays: totalAbsentCount,
    totalLeaveDays: totalLeaveCount,
    totalLateArrivals: totalLateCount,
    totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
    dailyTrends,
    employeeStats: employeeStats.sort((a, b) => b.attendancePercentage - a.attendancePercentage),
  };
}

/**
 * Yearly analytics breakdown across all 12 months
 */
export async function getYearlyAnalytics(
  organizationId: string,
  year: number,
  filters?: { branchId?: string; departmentId?: string }
) {
  const monthsData: any[] = [];
  let annualPresentSum = 0;
  let annualScheduledSum = 0;
  let annualOvertimeSum = 0;
  let annualLeaveSum = 0;

  for (let m = 1; m <= 12; m++) {
    const monthName = new Date(year, m - 1, 1).toLocaleString('default', { month: 'short' });
    const monthAnalytics = await getMonthlyAnalytics(organizationId, year, m, filters);

    annualPresentSum += monthAnalytics.totalPresentDays;
    annualScheduledSum += monthAnalytics.totalPresentDays + monthAnalytics.totalAbsentDays;
    annualOvertimeSum += monthAnalytics.totalOvertimeHours;
    annualLeaveSum += monthAnalytics.totalLeaveDays;

    monthsData.push({
      monthNumber: m,
      month: monthName,
      attendancePercentage: monthAnalytics.monthlyAttendancePercentage,
      presentDays: monthAnalytics.totalPresentDays,
      absentDays: monthAnalytics.totalAbsentDays,
      leaveDays: monthAnalytics.totalLeaveDays,
      overtimeHours: monthAnalytics.totalOvertimeHours,
    });
  }

  const annualPercentage =
    annualScheduledSum > 0 ? Math.round((annualPresentSum / annualScheduledSum) * 100) : 0;

  // Department-wise & Branch-wise yearly comparisons
  const departments = await prisma.department.findMany({
    where: { organizationId },
    include: { employees: true },
  });

  const departmentComparison = departments.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    employeeCount: d.employees.length,
  }));

  const branches = await prisma.branch.findMany({
    where: { organizationId },
    include: { employees: true },
  });

  const branchComparison = branches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    employeeCount: b.employees.length,
  }));

  return {
    year,
    annualAttendancePercentage: annualPercentage,
    totalAnnualOvertimeHours: Math.round(annualOvertimeSum * 10) / 10,
    totalAnnualLeaveDays: annualLeaveSum,
    months: monthsData,
    departmentComparison,
    branchComparison,
  };
}

/**
 * Department-wise breakdown with real-time employee counts and attendance
 */
export async function getDepartmentAnalytics(
  organizationId: string,
  dateStr?: string,
  branchId?: string
) {
  const todayStr = dateStr || new Date().toISOString().split('T')[0];
  const statuses = await calculateDailyEmployeeStatuses(organizationId, todayStr, { branchId });

  const departments = await prisma.department.findMany({
    where: { organizationId },
    include: {
      employees: {
        where: {
          employmentStatus: EmploymentStatus.ACTIVE,
          ...(branchId && { branchId }),
        },
      },
    },
  });

  return departments.map((dept) => {
    const deptStatuses = statuses.filter((s) => s.departmentId === dept.id);
    const totalEmployees = dept.employees.length;
    const present = deptStatuses.filter(
      (s) => s.status === AttendanceStatus.PRESENT || s.status === AttendanceStatus.LATE || s.status === AttendanceStatus.HALF_DAY
    ).length;
    const absent = deptStatuses.filter((s) => s.status === AttendanceStatus.ABSENT).length;
    const onLeave = deptStatuses.filter((s) => s.status === AttendanceStatus.ON_LEAVE).length;
    const late = deptStatuses.filter((s) => s.lateMinutes > 0).length;

    const totalHours = deptStatuses.reduce((acc, s) => acc + s.totalHours, 0);
    const avgWorkingHours = present > 0 ? Math.round((totalHours / present) * 10) / 10 : 0;
    const totalOvertime = deptStatuses.reduce((acc, s) => acc + s.overtimeHours, 0);

    const percentage = totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0;

    return {
      departmentId: dept.id,
      name: dept.name,
      code: dept.code,
      totalEmployees,
      presentEmployees: present,
      absentEmployees: absent,
      onLeaveEmployees: onLeave,
      attendancePercentage: percentage,
      lateArrivals: late,
      avgWorkingHours,
      overtimeHours: Math.round(totalOvertime * 10) / 10,
      employees: deptStatuses,
    };
  });
}

/**
 * Branch-wise analytics breakdown with geofence settings & active shifts
 */
export async function getBranchAnalytics(organizationId: string, dateStr?: string) {
  const todayStr = dateStr || new Date().toISOString().split('T')[0];
  const statuses = await calculateDailyEmployeeStatuses(organizationId, todayStr);

  const branches = await prisma.branch.findMany({
    where: { organizationId },
    include: {
      officeLocations: true,
      employees: {
        where: { employmentStatus: EmploymentStatus.ACTIVE },
        include: { shift: true },
      },
    },
  });

  return branches.map((b) => {
    const branchStatuses = statuses.filter((s) => s.branchId === b.id);
    const totalEmployees = b.employees.length;
    const present = branchStatuses.filter(
      (s) => s.status === AttendanceStatus.PRESENT || s.status === AttendanceStatus.LATE || s.status === AttendanceStatus.HALF_DAY
    ).length;
    const absent = branchStatuses.filter((s) => s.status === AttendanceStatus.ABSENT).length;
    const late = branchStatuses.filter((s) => s.lateMinutes > 0).length;
    const overtime = branchStatuses.reduce((acc, s) => acc + s.overtimeHours, 0);
    const percentage = totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0;

    const shiftSet = new Set(b.employees.map((e) => e.shift.name));

    return {
      branchId: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      latitude: b.latitude,
      longitude: b.longitude,
      radiusMeters: b.radiusMeters,
      officeLocations: b.officeLocations,
      totalEmployees,
      presentEmployees: present,
      absentEmployees: absent,
      attendancePercentage: percentage,
      lateArrivals: late,
      overtimeHours: Math.round(overtime * 10) / 10,
      activeShifts: Array.from(shiftSet),
    };
  });
}

/**
 * Individual employee attendance performance analytics
 */
export async function getEmployeePerformanceAnalytics(
  organizationId: string,
  employeeId: string,
  startDateStr: string,
  endDateStr: string
) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      department: true,
      branch: true,
      shift: true,
      user: { select: { email: true, role: true } },
    },
  });

  if (!employee || employee.organizationId !== organizationId) {
    throw new Error('Employee not found or access denied');
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      date: { gte: startDateStr, lte: endDateStr },
    },
    orderBy: { date: 'asc' },
  });

  const presentDays = records.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE || r.status === AttendanceStatus.HALF_DAY
  ).length;

  const lateArrivals = records.filter((r) => r.lateMinutes > 0).length;
  const earlyDepartures = records.filter((r) => r.earlyDepartureMinutes > 0).length;
  const totalHoursSum = records.reduce((acc, r) => acc + r.totalHours, 0);
  const totalOvertime = records.reduce((acc, r) => acc + r.overtimeHours, 0);
  const avgWorkingHours = presentDays > 0 ? Math.round((totalHoursSum / presentDays) * 10) / 10 : 0;

  // Approved leave days
  const leaveCount = await prisma.leaveRequest.count({
    where: {
      employeeId,
      status: RequestStatus.APPROVED,
      startDate: { lte: new Date(endDateStr) },
      endDate: { gte: new Date(startDateStr) },
    },
  });

  return {
    employee: {
      id: employee.id,
      code: employee.employeeCode,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
      designation: employee.designation,
      department: employee.department.name,
      branch: employee.branch.name,
      shift: `${employee.shift.name} (${employee.shift.startTime} - ${employee.shift.endTime})`,
      joiningDate: employee.joiningDate,
    },
    metrics: {
      totalRecords: records.length,
      presentDays,
      lateArrivals,
      earlyDepartures,
      leaveDays: leaveCount,
      avgWorkingHours,
      totalOvertimeHours: Math.round(totalOvertime * 10) / 10,
    },
    records,
  };
}

/**
 * Joining and Exit (Employee Lifecycle) Analytics
 */
export async function getJoiningAndExitAnalytics(organizationId: string) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const totalEmployees = await prisma.employee.count({ where: { organizationId } });
  const activeEmployees = await prisma.employee.count({
    where: { organizationId, employmentStatus: EmploymentStatus.ACTIVE },
  });
  const inactiveEmployees = totalEmployees - activeEmployees;

  // Joined this month
  const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
  const joinedThisMonth = await prisma.employee.count({
    where: {
      organizationId,
      joiningDate: { gte: startOfMonth },
    },
  });

  // Joined this year
  const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
  const joinedThisYear = await prisma.employee.count({
    where: {
      organizationId,
      joiningDate: { gte: startOfYear },
    },
  });

  // Resigned total & this year
  const resignedTotal = await prisma.employee.count({
    where: {
      organizationId,
      employmentStatus: { in: [EmploymentStatus.RESIGNED, EmploymentStatus.TERMINATED] },
    },
  });

  const resignedThisYear = await prisma.employee.count({
    where: {
      organizationId,
      employmentStatus: { in: [EmploymentStatus.RESIGNED, EmploymentStatus.TERMINATED] },
      resignationDate: { gte: startOfYear },
    },
  });

  // Monthly trends for the current year
  const monthlyTrends: any[] = [];
  for (let m = 1; m <= 12; m++) {
    const mStart = new Date(Date.UTC(currentYear, m - 1, 1));
    const mEnd = new Date(Date.UTC(currentYear, m, 0, 23, 59, 59));
    const mName = new Date(currentYear, m - 1, 1).toLocaleString('default', { month: 'short' });

    const joined = await prisma.employee.count({
      where: {
        organizationId,
        joiningDate: { gte: mStart, lte: mEnd },
      },
    });

    const resigned = await prisma.employee.count({
      where: {
        organizationId,
        resignationDate: { gte: mStart, lte: mEnd },
      },
    });

    monthlyTrends.push({
      month: mName,
      monthNumber: m,
      joined,
      resigned,
    });
  }

  // Department distribution
  const departments = await prisma.department.findMany({
    where: { organizationId },
    include: {
      employees: {
        select: { id: true, employmentStatus: true },
      },
    },
  });

  const departmentDistribution = departments.map((d) => ({
    departmentId: d.id,
    name: d.name,
    code: d.code,
    total: d.employees.length,
    active: d.employees.filter((e) => e.employmentStatus === EmploymentStatus.ACTIVE).length,
  }));

  // Retention rate calculation
  const retentionRate =
    totalEmployees > 0
      ? Math.round(((totalEmployees - resignedTotal) / totalEmployees) * 100)
      : 100;

  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    joinedThisMonth,
    joinedThisYear,
    resignedTotal,
    resignedThisYear,
    retentionRate,
    monthlyTrends,
    departmentDistribution,
  };
}

/**
 * Automated Business Intelligence & Real-Time Insights
 */
export async function getBusinessIntelligenceInsights(organizationId: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  const deptAnalytics = await getDepartmentAnalytics(organizationId, todayStr);
  const branchAnalytics = await getBranchAnalytics(organizationId, todayStr);
  const overview = await getDashboardOverviewMetrics(organizationId, todayStr);

  const insights: {
    type: 'POSITIVE' | 'WARNING' | 'ALERT' | 'INFO';
    title: string;
    description: string;
    metric?: string;
  }[] = [];

  // 1. Attendance Rate
  const attRate = overview.kpis.attendancePercentage;
  if (attRate >= 90) {
    insights.push({
      type: 'POSITIVE',
      title: 'High Workforce Engagement',
      description: `Today's attendance stands at a robust ${attRate}%, exceeding the 85% organizational operational target.`,
      metric: `${attRate}%`,
    });
  } else if (attRate < 75 && overview.kpis.activeEmployees > 0) {
    insights.push({
      type: 'ALERT',
      title: 'Attendance Dip Detected',
      description: `Overall presence is currently at ${attRate}%. Review absent records and pending leave authorizations.`,
      metric: `${attRate}%`,
    });
  }

  // 2. Department Leaders & Laggards
  if (deptAnalytics.length > 1) {
    const sortedDepts = [...deptAnalytics].sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    const topDept = sortedDepts[0];
    const bottomDept = sortedDepts[sortedDepts.length - 1];

    if (topDept && topDept.totalEmployees > 0) {
      insights.push({
        type: 'POSITIVE',
        title: `Top Performing Department: ${topDept.name}`,
        description: `${topDept.name} leads organizational punctuality with ${topDept.attendancePercentage}% attendance today.`,
        metric: `${topDept.attendancePercentage}%`,
      });
    }

    if (bottomDept && bottomDept.attendancePercentage < 70 && bottomDept.totalEmployees > 0) {
      insights.push({
        type: 'WARNING',
        title: `Attendance Deficit: ${bottomDept.name}`,
        description: `${bottomDept.name} has recorded ${bottomDept.absentEmployees} absence(s), resulting in ${bottomDept.attendancePercentage}% presence.`,
        metric: `${bottomDept.attendancePercentage}%`,
      });
    }
  }

  // 3. Late Arrival Patterns
  const totalLate = overview.kpis.lateArrivals;
  if (totalLate > 0) {
    const lateBranches = branchAnalytics.filter((b) => b.lateArrivals > 0);
    const branchNames = lateBranches.map((b) => b.name).join(', ');
    insights.push({
      type: 'WARNING',
      title: 'Punctuality Advisory',
      description: `${totalLate} employee(s) punched in past their shift grace periods today. Branches impacted: ${branchNames || 'All branches'}.`,
      metric: `${totalLate} Late`,
    });
  }

  // 4. Pending Corrections
  if (overview.kpis.pendingCorrections > 0) {
    insights.push({
      type: 'INFO',
      title: 'Attendance Exceptions Pending',
      description: `${overview.kpis.pendingCorrections} correction and exception request(s) require managerial sign-off.`,
      metric: `${overview.kpis.pendingCorrections} Pending`,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    overview: overview.kpis,
    insights,
    topDepartments: deptAnalytics.slice(0, 3),
    branchSummary: branchAnalytics,
  };
}
