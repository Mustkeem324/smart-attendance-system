export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { connectToDatabase } from '@/lib/mongodb';
import { resolveUserAvatar } from '@/lib/profile-photo-storage';
import { EmployeeTask, CompanyAnnouncement, EmployeeDocumentRecord } from '@/models/employee-portal';
import { ShopVisit } from '@/models/electronics-sales';
import { Role } from '@prisma/client';

const FIELD_AUTHORIZED_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.COMPANY_ADMIN,
  Role.HR_MANAGER,
  Role.TEAM_MANAGER,
  Role.SALES_MANAGER,
  Role.FIELD_SALES_REP,
  Role.DELIVERY_AGENT,
  Role.INVENTORY_MANAGER,
];

const WEEK_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const avatarUrl = await resolveUserAvatar(session.user.id, session.employee?.profilePhoto);

    if (!session.employee) {
      return NextResponse.json({
        success: true,
        hasEmployeeProfile: false,
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          profilePhoto: avatarUrl,
        },
      });
    }

    const employeeId = session.employee.id;
    const organizationId = session.user.organizationId;
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const requestedMonth = searchParams.get('month') || todayStr.slice(0, 7); // YYYY-MM
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const dateWhere: any =
      startDateParam && endDateParam
        ? { gte: startDateParam, lte: endDateParam }
        : { startsWith: requestedMonth };

    const [
      organization,
      employee,
      todayRecord,
      monthRecords,
      activeBreak,
      todayBreaks,
      leaveBalances,
      leaveRequests,
      leaveTypes,
      holidays,
      rosterEntries,
      payslips,
      recentEvents,
      swapRequests,
      notifications,
      auditLogs,
    ] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, code: true },
      }),
      prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          department: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true, address: true, city: true, latitude: true, longitude: true, radiusMeters: true } },
          officeLocation: { select: { id: true, name: true, address: true, latitude: true, longitude: true, radiusMeters: true } },
          shift: true,
          manager: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              designation: true,
              email: true,
              profilePhoto: true,
            },
          },
        },
      }),
      prisma.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId, date: todayStr } },
        include: {
          officeLocation: { select: { id: true, name: true } },
          events: { orderBy: { timestamp: 'desc' } },
          exceptions: { orderBy: { createdAt: 'desc' } },
          corrections: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.attendanceRecord.findMany({
        where: { organizationId, employeeId, date: dateWhere },
        orderBy: { date: 'asc' },
      }),
      prisma.breakRecord.findFirst({
        where: { employeeId, date: todayStr, endTime: null },
        orderBy: { startTime: 'desc' },
      }),
      prisma.breakRecord.findMany({
        where: { employeeId, date: todayStr },
        orderBy: { startTime: 'desc' },
      }),
      prisma.leaveBalance.findMany({
        where: { employeeId, year: Number(requestedMonth.slice(0, 4)) || now.getFullYear() },
        include: { leaveType: true },
        orderBy: { leaveType: { name: 'asc' } },
      }),
      prisma.leaveRequest.findMany({
        where: { organizationId, employeeId },
        include: { leaveType: true },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      prisma.leaveType.findMany({
        where: { organizationId, isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.holiday.findMany({
        where: {
          organizationId,
          OR: [{ branchId: null }, { branchId: session.employee.branchId }],
          date: { gte: `${requestedMonth.slice(0, 4)}-01-01` },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.shiftRosterEntry.findMany({
        where: { employeeId, date: { gte: todayStr } },
        include: { shift: true },
        orderBy: { date: 'asc' },
        take: 14,
      }),
      prisma.payslip.findMany({
        where: { organizationId, employeeId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
      }),
      prisma.attendanceEvent.findMany({
        where: { attendanceRecord: { employeeId, organizationId } },
        include: { attendanceRecord: { select: { date: true } } },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
      prisma.shiftSwapRequest.findMany({
        where: {
          organizationId,
          OR: [{ requestorEmployeeId: employeeId }, { targetEmployeeId: employeeId }],
        },
        include: {
          requestorEmployee: { select: { firstName: true, lastName: true } },
          targetEmployee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.auditLog.findMany({
        where: {
          organizationId,
          userId: session.user.id,
          action: { in: ['UPDATE_OWN_PHOTO', 'REMOVE_OWN_PHOTO', 'UPDATE_EMPLOYEE'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Break calculations
    const breakDurationMinutes = todayBreaks.reduce((sum, b) => sum + (Number(b.durationMinutes) || 0), 0);
    const totalTodayBreakMinutes = Math.max(breakDurationMinutes, todayRecord?.totalBreakMinutes || 0);

    // Live working hours for today
    let todayWorkingHours = todayRecord?.totalHours || 0;
    if (todayRecord?.checkInTime && !todayRecord?.checkOutTime) {
      const elapsedMs = Math.max(0, now.getTime() - new Date(todayRecord.checkInTime).getTime());
      const netHours = Math.max(0, elapsedMs / (1000 * 60 * 60) - totalTodayBreakMinutes / 60);
      todayWorkingHours = Math.round(netHours * 100) / 100;
    }

    // Location & approval state for today's attendance widget
    const latestException = todayRecord?.exceptions?.[0] || null;
    const latestCorrection = todayRecord?.corrections?.[0] || null;
    const locationStatus = !todayRecord?.checkInTime
      ? 'AWAITING_CHECK_IN'
      : todayRecord.checkInMockDetected
      ? 'FLAGGED_MOCK_GPS'
      : todayRecord.checkInWithinGeofence === false
      ? 'OUTSIDE_GEOFENCE'
      : 'VERIFIED_WITHIN_GEOFENCE';

    const approvalStatus = latestException
      ? latestException.status
      : latestCorrection
      ? latestCorrection.status
      : todayRecord?.isVerified
      ? 'APPROVED'
      : todayRecord?.checkInTime
      ? 'PENDING_REVIEW'
      : 'NOT_APPLICABLE';

    // Analytics calculation over month/filtered range
    const weeklyOffDays = (employee.weeklyOff || 'SUNDAY')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const holidaySet = new Set(holidays.map((h) => h.date));
    const approvedLeaveDates = new Set<string>();
    for (const lr of leaveRequests) {
      if (lr.status === 'APPROVED') {
        const s = new Date(lr.startDate);
        const e = new Date(lr.endDate);
        s.setUTCHours(0, 0, 0, 0);
        e.setUTCHours(0, 0, 0, 0);
        for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
          approvedLeaveDates.add(d.toISOString().split('T')[0]);
        }
      }
    }

    const recordByDate = new Map(monthRecords.map((r) => [r.date, r]));
    const rangeStartStr = startDateParam || `${requestedMonth}-01`;
    const isCurrentMonth = !startDateParam && requestedMonth === todayStr.slice(0, 7);
    const [rYear, rMonth] = requestedMonth.split('-').map(Number);
    const lastDayOfMonth =
      rYear && rMonth
        ? new Date(Date.UTC(rYear, rMonth, 0)).toISOString().split('T')[0]
        : todayStr;
    const rangeEndStr = endDateParam || (isCurrentMonth ? todayStr : lastDayOfMonth);

    let scheduledWorkingDays = 0;
    let computedAbsentDays = 0;
    let computedLeaveDays = 0;

    if (rangeStartStr <= rangeEndStr) {
      const startCursor = new Date(`${rangeStartStr}T00:00:00Z`);
      const endCursor = new Date(`${rangeEndStr}T00:00:00Z`);
      for (let d = new Date(startCursor); d <= endCursor && scheduledWorkingDays <= 366; d.setUTCDate(d.getUTCDate() + 1)) {
        const dStr = d.toISOString().split('T')[0];
        const dayName = WEEK_DAYS[d.getUTCDay()];
        if (weeklyOffDays.includes(dayName) || holidaySet.has(dStr)) continue;

        scheduledWorkingDays += 1;
        const rec = recordByDate.get(dStr);
        if (approvedLeaveDates.has(dStr) || rec?.status === 'ON_LEAVE') {
          computedLeaveDays += 1;
        } else if (!rec || rec.status === 'ABSENT') {
          computedAbsentDays += 1;
        }
      }
    }

    const presentDays = monthRecords.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY'
    ).length;
    const lateArrivals = monthRecords.filter((r) => (r.lateMinutes || 0) > 0 || r.status === 'LATE').length;
    const totalRangeHours =
      Math.round(monthRecords.reduce((acc, r) => acc + (r.totalHours || 0), 0) * 100) / 100;
    const monthlyAttendancePct =
      scheduledWorkingDays > 0
        ? Math.min(100, Math.round((presentDays / scheduledWorkingDays) * 100))
        : 0;

    // Weekly working hours (last 7 days or last 7 days in range)
    const weeklyHoursSeries: Array<{ label: string; date: string; hours: number; status: string }> = [];
    const anchorEnd = new Date(`${rangeEndStr}T00:00:00Z`);
    for (let offset = 6; offset >= 0; offset -= 1) {
      const d = new Date(anchorEnd);
      d.setUTCDate(anchorEnd.getUTCDate() - offset);
      const dStr = d.toISOString().split('T')[0];
      const rec = recordByDate.get(dStr);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      weeklyHoursSeries.push({
        label: dayLabel,
        date: dStr,
        hours: Math.round(((dStr === todayStr ? todayWorkingHours : rec?.totalHours) || 0) * 100) / 100,
        status: rec?.status || (weeklyOffDays.includes(WEEK_DAYS[d.getUTCDay()]) ? 'WEEK_OFF' : holidaySet.has(dStr) ? 'HOLIDAY' : 'ABSENT'),
      });
    }

    // Build 7-day weekly schedule preview from shift & weeklyOff & roster
    const weeklySchedule: Array<{
      date: string;
      day: string;
      shiftName: string;
      timing: string;
      isOff: boolean;
      isHoliday: boolean;
    }> = [];
    const rosterMap = new Map(rosterEntries.map((r) => [r.date, r]));
    const todayUtc = new Date(`${todayStr}T00:00:00Z`);
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(todayUtc);
      d.setUTCDate(todayUtc.getUTCDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayName = WEEK_DAYS[d.getUTCDay()];
      const rosterItem = rosterMap.get(dStr);
      const isOff = rosterItem ? rosterItem.isWeeklyOff : weeklyOffDays.includes(dayName);
      const isHol = holidaySet.has(dStr);
      const shiftObj = rosterItem?.shift || employee.shift;
      weeklySchedule.push({
        date: dStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        shiftName: isHol ? 'Holiday' : isOff ? 'Weekly Off' : shiftObj.name,
        timing: isHol || isOff ? 'Off Duty' : `${shiftObj.startTime} - ${shiftObj.endTime}`,
        isOff,
        isHoliday: isHol,
      });
    }

    // Leave balance breakdown + pending count per leave type
    const pendingByLeaveType: Record<string, number> = {};
    for (const lr of leaveRequests) {
      if (lr.status === 'PENDING') {
        pendingByLeaveType[lr.leaveTypeId] =
          (pendingByLeaveType[lr.leaveTypeId] || 0) + (lr.totalDays || 1);
      }
    }

    const formattedBalances = leaveBalances.map((b) => ({
      id: b.id,
      leaveTypeId: b.leaveTypeId,
      name: b.leaveType.name,
      code: b.leaveType.code,
      totalQuota: b.totalQuota,
      usedDays: b.usedDays,
      remainingDays: Math.max(0, Number(b.remainingDays ?? b.totalQuota - b.usedDays)),
      pendingDays: pendingByLeaveType[b.leaveTypeId] ?? b.pendingDays ?? 0,
    }));

    const totalAvailableLeave =
      Math.round(formattedBalances.reduce((sum, b) => sum + b.remainingDays, 0) * 10) / 10;

    // MongoDB Integrations (Tasks, Announcements, Field Visits, Documents)
    const isFieldAuthorized = requireRole(session.user.role, FIELD_AUTHORIZED_ROLES);
    let tasks: any[] = [];
    let announcements: any[] = [];
    let documents: any[] = [];
    let fieldVisits: any[] = [];

    try {
      await connectToDatabase();

      const [mongoTasks, mongoAnnouncements, mongoDocs] = await Promise.all([
        EmployeeTask.find({ organizationId, employeeId })
          .sort({ status: 1, dueDate: 1, createdAt: -1 })
          .limit(30)
          .lean(),
        CompanyAnnouncement.find({
          organizationId,
          $or: [
            { audienceType: 'ALL' },
            { audienceType: 'BRANCH', targetBranchIds: employee.branchId },
            { audienceType: 'DEPARTMENT', targetDepartmentIds: employee.departmentId },
            { audienceType: 'ROLE', targetRoles: session.user.role },
          ],
        })
          .sort({ isPinned: -1, publishedAt: -1 })
          .limit(20)
          .lean(),
        EmployeeDocumentRecord.find({ organizationId, employeeId })
          .select('-data')
          .sort({ createdAt: -1 })
          .limit(25)
          .lean(),
      ]);

      tasks = mongoTasks.map((t: any) => ({
        id: String(t._id),
        title: t.title,
        description: t.description || '',
        assignedDate: t.assignedDate,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        assignedByName: t.assignedByName,
        assignedByRole: t.assignedByRole,
        progressNotes: t.progressNotes || '',
        completedAt: t.completedAt,
      }));

      announcements = mongoAnnouncements.map((a: any) => ({
        id: String(a._id),
        title: a.title,
        description: a.description,
        category: a.category,
        audienceType: a.audienceType,
        isPinned: Boolean(a.isPinned),
        publishedAt: a.publishedAt,
        createdByName: a.createdByName,
        isRead: Array.isArray(a.readByUserIds) && a.readByUserIds.includes(session.user.id),
      }));

      documents = mongoDocs.map((d: any) => ({
        id: String(d._id),
        title: d.title,
        category: d.category,
        fileName: d.fileName,
        mimeType: d.mimeType,
        size: d.size,
        uploadedByName: d.uploadedByName,
        createdAt: d.createdAt,
        downloadUrl: `/api/employee/documents/${d._id}`,
      }));

      if (isFieldAuthorized) {
        const visits = await ShopVisit.find({
          employeeId: { $in: [employeeId, employee.employeeCode] },
        })
          .populate('retailerId', 'name ownerName city phone address')
          .sort({ createdAt: -1 })
          .limit(15)
          .lean();

        fieldVisits = visits.map((v: any) => ({
          id: String(v._id),
          visitId: v.visitId || String(v._id).slice(-6).toUpperCase(),
          visitDate: v.visitDate,
          checkInTime: v.checkInTime,
          checkOutTime: v.checkOutTime,
          retailerName: v.retailerId?.name || 'Retail Partner',
          retailerCity: v.retailerId?.city || '',
          retailerPhone: v.retailerId?.phone || '',
          retailerAddress: v.retailerId?.address || v.geocodedAddress || '',
          locationVerificationStatus: v.locationVerificationStatus || 'VERIFIED',
          isWithinGeofence: Boolean(v.isWithinGeofence),
          distanceFromShopMeters: v.distanceFromShopMeters ?? 0,
          submissionStatus: v.checkOutTime ? 'SUBMITTED' : 'IN_PROGRESS',
        }));
      }
    } catch (mongoErr) {
      console.error('Employee dashboard Mongo fetch warning:', mongoErr);
    }

    // Merge upcoming holidays into announcements feed if not already covered
    const upcomingHolidayNotices = holidays
      .filter((h) => h.date >= todayStr)
      .slice(0, 3)
      .map((h) => ({
        id: `holiday-${h.id}`,
        title: `Upcoming Holiday: ${h.name}`,
        description: h.description || `Scheduled holiday on ${h.date}${h.isOptional ? ' (Optional)' : ''}.`,
        category: 'HOLIDAY',
        audienceType: h.branchId ? 'BRANCH' : 'ALL',
        isPinned: false,
        publishedAt: h.date,
        createdByName: 'HR & Holidays Calendar',
        isRead: true,
        isSystemHoliday: true,
      }));

    // Build chronological Recent Activity strictly from authenticated employee records
    const activities: Array<{
      id: string;
      type: string;
      title: string;
      detail: string;
      timestamp: string;
    }> = [];

    for (const ev of recentEvents) {
      activities.push({
        id: `att-${ev.id}`,
        type: 'ATTENDANCE',
        title: ev.eventType.replace(/_/g, ' '),
        detail: `Recorded on ${ev.attendanceRecord?.date || todayStr}${ev.distanceMeters != null ? ` (${Math.round(ev.distanceMeters)}m from branch)` : ''}`,
        timestamp: new Date(ev.timestamp).toISOString(),
      });
    }

    for (const b of todayBreaks) {
      activities.push({
        id: `brk-${b.id}`,
        type: 'BREAK',
        title: b.endTime ? `Completed ${b.breakType} break` : `Started ${b.breakType} break`,
        detail: b.endTime ? `Duration: ${b.durationMinutes} min` : 'Active break in progress',
        timestamp: new Date(b.endTime || b.startTime).toISOString(),
      });
    }

    for (const lr of leaveRequests.slice(0, 8)) {
      const startIso = new Date(lr.startDate).toISOString().split('T')[0];
      const endIso = new Date(lr.endDate).toISOString().split('T')[0];
      activities.push({
        id: `leave-${lr.id}`,
        type: 'LEAVE',
        title: `${lr.leaveType?.name || 'Leave'} (${lr.status})`,
        detail: `${startIso} to ${endIso} (${lr.totalDays} day${lr.totalDays === 1 ? '' : 's'})`,
        timestamp: new Date(lr.reviewedAt || lr.updatedAt || lr.createdAt).toISOString(),
      });
    }

    for (const sw of swapRequests) {
      activities.push({
        id: `swap-${sw.id}`,
        type: 'SHIFT',
        title: `Shift Swap Request (${sw.status})`,
        detail: `For ${sw.date} between ${sw.requestorEmployee?.firstName || 'Staff'} & ${sw.targetEmployee?.firstName || 'Peer'}`,
        timestamp: new Date(sw.createdAt).toISOString(),
      });
    }

    for (const fv of fieldVisits.slice(0, 6)) {
      activities.push({
        id: `visit-${fv.id}`,
        type: 'FIELD_VISIT',
        title: `Field Visit: ${fv.retailerName}`,
        detail: `${fv.submissionStatus} • ${fv.locationVerificationStatus.replace(/_/g, ' ')}`,
        timestamp: new Date(fv.checkOutTime || fv.checkInTime || `${fv.visitDate}T09:00:00Z`).toISOString(),
      });
    }

    for (const tk of tasks.slice(0, 6)) {
      activities.push({
        id: `task-${tk.id}`,
        type: 'TASK',
        title: `Task (${tk.status}): ${tk.title}`,
        detail: `Priority: ${tk.priority}${tk.dueDate ? ` • Due ${new Date(tk.dueDate).toLocaleDateString()}` : ''}`,
        timestamp: new Date(tk.completedAt || tk.assignedDate || Date.now()).toISOString(),
      });
    }

    for (const al of auditLogs) {
      activities.push({
        id: `audit-${al.id}`,
        type: 'PROFILE',
        title: al.action === 'UPDATE_OWN_PHOTO' ? 'Updated Profile Photo' : 'Profile Updated',
        detail: 'Personal workspace profile updated',
        timestamp: new Date(al.createdAt).toISOString(),
      });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const activeTasksCount = tasks.filter((t) => t.status !== 'COMPLETED').length;
    const todayFieldVisits = fieldVisits.filter((v) => v.visitDate === todayStr);

    return NextResponse.json({
      success: true,
      hasEmployeeProfile: true,
      date: todayStr,
      selectedMonth: requestedMonth,
      profile: {
        id: employee.id,
        userId: session.user.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        phone: employee.phone,
        designation: employee.designation,
        employmentStatus: employee.employmentStatus,
        employmentType: employee.employmentType,
        joiningDate: employee.joiningDate,
        profilePhoto: avatarUrl || employee.profilePhoto || null,
        department: employee.department,
        branch: employee.branch,
        officeLocation: employee.officeLocation,
        manager: employee.manager,
        organizationName: organization?.name || 'Salman Enterprises',
        role: session.user.role,
      },
      kpis: {
        todayAttendanceStatus: todayRecord?.status || (approvedLeaveDates.has(todayStr) ? 'ON_LEAVE' : 'NOT_CHECKED_IN'),
        todayWorkingHours,
        monthlyWorkingHours: totalRangeHours,
        monthlyAttendancePercentage: monthlyAttendancePct,
        presentDays,
        scheduledWorkingDays,
        availableLeaveBalance: totalAvailableLeave,
        assignedTasksCount: tasks.length,
        pendingTasksCount: activeTasksCount,
        completedTasksCount: tasks.length - activeTasksCount,
        fieldVisitsTotal: fieldVisits.length,
        fieldVisitsToday: todayFieldVisits.length,
      },
      todayAttendance: {
        record: todayRecord,
        isCheckedIn: Boolean(todayRecord?.checkInTime),
        isCheckedOut: Boolean(todayRecord?.checkOutTime),
        checkInTime: todayRecord?.checkInTime || null,
        checkOutTime: todayRecord?.checkOutTime || null,
        totalWorkingHours: todayWorkingHours,
        breakDurationMinutes: totalTodayBreakMinutes,
        activeBreak: activeBreak || null,
        attendanceStatus: todayRecord?.status || 'NOT_CHECKED_IN',
        locationVerificationStatus: locationStatus,
        distanceMeters: todayRecord?.checkInDistanceMeters ?? null,
        approvalStatus,
      },
      shiftOverview: {
        shift: employee.shift,
        branch: employee.branch,
        officeLocation: employee.officeLocation,
        weeklyOff: employee.weeklyOff,
        weeklySchedule,
      },
      leaves: {
        balances: formattedBalances,
        leaveTypes,
        recentRequests: leaveRequests.slice(0, 6),
        totalAvailable: totalAvailableLeave,
      },
      analytics: {
        month: requestedMonth,
        attendancePercentage: monthlyAttendancePct,
        totalWorkingHours: totalRangeHours,
        presentDays,
        absentDays: computedAbsentDays,
        lateArrivals,
        leaveDays: computedLeaveDays,
        scheduledWorkingDays,
        weeklyHoursSeries,
        statusBreakdown: [
          { name: 'Present', value: presentDays, color: '#12B886' },
          { name: 'Late Arrivals', value: lateArrivals, color: '#F59E0B' },
          { name: 'Leave', value: computedLeaveDays, color: '#6538ED' },
          { name: 'Absent', value: computedAbsentDays, color: '#EF476F' },
        ],
      },
      tasks,
      fieldSales: {
        isAuthorized: isFieldAuthorized,
        todayCount: todayFieldVisits.length,
        completedCount: fieldVisits.filter((v) => v.submissionStatus === 'SUBMITTED').length,
        pendingCount: fieldVisits.filter((v) => v.submissionStatus !== 'SUBMITTED').length,
        visits: fieldVisits,
      },
      recentActivity: activities.slice(0, 15),
      announcements: [...announcements, ...upcomingHolidayNotices].slice(0, 15),
      notificationsCount: notifications.filter((n) => !n.isRead).length,
      documents: {
        payslips: payslips.map((p) => ({
          id: p.id,
          payslipNumber: p.payslipNumber,
          month: p.month,
          year: p.year,
          netSalary: p.netSalary,
          downloadUrl: `/api/payroll/payslips/${p.id}/pdf`,
        })),
        files: documents,
        appointmentLetterUrl: '/api/employee/documents/appointment-letter',
      },
    });
  } catch (error: any) {
    console.error('Employee dashboard API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load employee dashboard' }, { status: 500 });
  }
}
