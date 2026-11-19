import { prisma } from './prisma';
import { RequestStatus } from '@prisma/client';

export interface ShiftTimingDetails {
  durationHours: number;
  isOvernight: boolean;
  crossesMidnight: boolean;
}

/**
 * Calculates shift duration in hours, properly handling overnight / cross-midnight shifts.
 * E.g., 22:00 to 06:00 is 8 hours.
 */
export function calculateShiftDuration(startTime: string, endTime: string, isOvernightFlag?: boolean): ShiftTimingDetails {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startTotal = startHour * 60 + startMin;
  const endTotal = endHour * 60 + endMin;

  let crossesMidnight = false;
  let diffMinutes = endTotal - startTotal;

  if (diffMinutes < 0 || isOvernightFlag) {
    crossesMidnight = true;
    diffMinutes = (endTotal + 24 * 60) - startTotal;
  }

  const durationHours = parseFloat((diffMinutes / 60).toFixed(2));
  return {
    durationHours,
    isOvernight: crossesMidnight,
    crossesMidnight,
  };
}

/**
 * Generates or updates a monthly roster with rotation patterns.
 * Pattern example: [{ shiftId: 'shift-1', days: 2 }, { shiftId: 'shift-2', days: 2 }, { shiftId: 'weekly-off', days: 1 }]
 */
export async function generateMonthlyRoster(params: {
  organizationId: string;
  month: number; // 1-12
  year: number;
  employeeIds: string[];
  rotationPattern?: { shiftId: string; days: number; isWeeklyOff?: boolean }[];
  defaultShiftId?: string;
}) {
  const { organizationId, month, year, employeeIds, rotationPattern, defaultShiftId } = params;

  // Determine number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Create or get shift roster container
  const roster = await prisma.shiftRoster.upsert({
    where: {
      organizationId_month_year: {
        organizationId,
        month,
        year,
      },
    },
    update: {
      status: 'DRAFT',
    },
    create: {
      organizationId,
      month,
      year,
      status: 'DRAFT',
    },
  });

  // Fetch employees to check their default weekly off and default shifts
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds }, organizationId },
    include: { shift: true },
  });

  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  // Build entry items for all days
  const entriesToUpsert: {
    shiftRosterId: string;
    employeeId: string;
    shiftId: string;
    date: string;
    isWeeklyOff: boolean;
  }[] = [];

  for (const empId of employeeIds) {
    const emp = employeeMap.get(empId);
    if (!emp) continue;

    const baseShiftId = defaultShiftId || emp.shiftId;
    if (!baseShiftId && (!rotationPattern || rotationPattern.length === 0)) {
      continue;
    }

    let patternIndex = 0;
    let patternDayCounter = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(year, month - 1, day);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const isDefaultWeeklyOff = emp.weeklyOff?.toUpperCase() === dayName;

      let assignedShiftId = baseShiftId || '';
      let isWeeklyOff = isDefaultWeeklyOff;

      if (rotationPattern && rotationPattern.length > 0) {
        const currentPattern = rotationPattern[patternIndex];
        assignedShiftId = currentPattern.shiftId;
        isWeeklyOff = !!currentPattern.isWeeklyOff;

        patternDayCounter++;
        if (patternDayCounter >= currentPattern.days) {
          patternDayCounter = 0;
          patternIndex = (patternIndex + 1) % rotationPattern.length;
        }
      }

      if (assignedShiftId) {
        entriesToUpsert.push({
          shiftRosterId: roster.id,
          employeeId: empId,
          shiftId: assignedShiftId,
          date: dateStr,
          isWeeklyOff,
        });
      }
    }
  }

  // Transactionally save roster entries
  await prisma.$transaction(async (tx) => {
    for (const entry of entriesToUpsert) {
      await tx.shiftRosterEntry.upsert({
        where: {
          shiftRosterId_employeeId_date: {
            shiftRosterId: entry.shiftRosterId,
            employeeId: entry.employeeId,
            date: entry.date,
          },
        },
        update: {
          shiftId: entry.shiftId,
          isWeeklyOff: entry.isWeeklyOff,
        },
        create: {
          shiftRosterId: entry.shiftRosterId,
          employeeId: entry.employeeId,
          shiftId: entry.shiftId,
          date: entry.date,
          isWeeklyOff: entry.isWeeklyOff,
        },
      });
    }
  });

  return {
    rosterId: roster.id,
    month,
    year,
    totalEntriesCreated: entriesToUpsert.length,
    employeesCount: employeeIds.length,
  };
}

/**
 * Start employee break record.
 */
export async function startBreak(employeeId: string, breakType: string = 'LUNCH') {
  const todayStr = new Date().toISOString().split('T')[0];

  // Check if an open break already exists
  const openBreak = await prisma.breakRecord.findFirst({
    where: {
      employeeId,
      date: todayStr,
      endTime: null,
    },
  });

  if (openBreak) {
    throw new Error('An active break is already in progress. Please end it before starting a new one.');
  }

  const record = await prisma.breakRecord.create({
    data: {
      employeeId,
      date: todayStr,
      breakType,
      startTime: new Date(),
    },
  });

  return record;
}

/**
 * End employee active break record.
 */
export async function endBreak(employeeId: string) {
  const todayStr = new Date().toISOString().split('T')[0];

  const activeBreak = await prisma.breakRecord.findFirst({
    where: {
      employeeId,
      date: todayStr,
      endTime: null,
    },
    orderBy: { startTime: 'desc' },
  });

  if (!activeBreak) {
    throw new Error('No active break found to end.');
  }

  const endTime = new Date();
  const diffMs = endTime.getTime() - new Date(activeBreak.startTime).getTime();
  const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

  const updated = await prisma.breakRecord.update({
    where: { id: activeBreak.id },
    data: {
      endTime,
      durationMinutes,
    },
  });

  return updated;
}

/**
 * Calculates overtime for an attendance record.
 * Rate multiplier: 1.5x on normal working days, 2.0x on weekly off / public holidays.
 */
export async function calculateAndRecordOvertime(attendanceRecordId: string) {
  const record = await prisma.attendanceRecord.findUnique({
    where: { id: attendanceRecordId },
    include: {
      employee: {
        include: { shift: true },
      },
    },
  });

  if (!record || !record.totalHours || record.totalHours <= 0) {
    return null;
  }

  const shift = record.employee.shift;
  const standardHours = shift?.fullDayThresholdHours || 8.0;

  // Overtime occurs if totalHours > standardHours
  if (record.totalHours <= standardHours) {
    return null;
  }

  const overtimeHours = parseFloat((record.totalHours - standardHours).toFixed(2));

  // Determine rate multiplier (2.0x for holiday/weekly off, 1.5x for standard)
  const isWeekendOrHoliday = record.employee.weeklyOff?.toUpperCase() === new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const rateMultiplier = isWeekendOrHoliday ? 2.0 : 1.5;

  // Base hourly rate estimated from employee baseSalary / (30 days * standardHours) or fallback to 150/hr
  const baseSalary = record.employee.baseSalary || 30000;
  const hourlyRate = parseFloat((baseSalary / (30 * standardHours)).toFixed(2));
  const totalAmount = parseFloat((overtimeHours * hourlyRate * rateMultiplier).toFixed(2));

  // Find or create overtime record
  const existing = await prisma.overtimeRecord.findFirst({
    where: {
      employeeId: record.employeeId,
      date: record.date,
    },
  });

  if (existing) {
    return await prisma.overtimeRecord.update({
      where: { id: existing.id },
      data: {
        calculatedHours: overtimeHours,
        approvedHours: overtimeHours,
        overtimeRate: rateMultiplier,
        rateAmount: totalAmount,
      },
    });
  }

  return await prisma.overtimeRecord.create({
    data: {
      organizationId: record.organizationId,
      employeeId: record.employeeId,
      date: record.date,
      calculatedHours: overtimeHours,
      approvedHours: overtimeHours,
      overtimeRate: rateMultiplier,
      rateAmount: totalAmount,
      status: RequestStatus.PENDING,
    },
  });
}

/**
 * Submits a shift swap request between two employees.
 */
export async function requestShiftSwap(params: {
  organizationId: string;
  requestorEmployeeId: string;
  targetEmployeeId: string;
  date: string;
  proposedShiftId: string;
  reason: string;
}) {
  const { organizationId, requestorEmployeeId, targetEmployeeId, date, proposedShiftId, reason } = params;

  if (requestorEmployeeId === targetEmployeeId) {
    throw new Error('Cannot swap shifts with yourself.');
  }

  const swap = await prisma.shiftSwapRequest.create({
    data: {
      organizationId,
      requestorEmployeeId,
      targetEmployeeId,
      date,
      proposedShiftId,
      reason,
      status: RequestStatus.PENDING,
    },
  });

  return swap;
}

/**
 * Approves or Rejects a shift swap request.
 * If approved, exchanges the ShiftRosterEntry for the two employees.
 */
export async function processShiftSwap(params: {
  swapRequestId: string;
  reviewerUserId: string;
  action: 'APPROVE' | 'REJECT';
  remark?: string;
}) {
  const { swapRequestId, reviewerUserId, action, remark } = params;

  const swap = await prisma.shiftSwapRequest.findUnique({
    where: { id: swapRequestId },
  });

  if (!swap) {
    throw new Error('Shift swap request not found.');
  }

  if (swap.status !== RequestStatus.PENDING) {
    throw new Error(`Swap request already ${swap.status}.`);
  }

  const newStatus = action === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED;

  const updatedSwap = await prisma.$transaction(async (tx) => {
    const updated = await tx.shiftSwapRequest.update({
      where: { id: swapRequestId },
      data: {
        status: newStatus,
        reviewedByUserId: reviewerUserId,
        reviewRemark: remark || (action === 'APPROVE' ? 'Approved' : 'Rejected'),
        reviewedAt: new Date(),
      },
    });

    if (action === 'APPROVE') {
      // Find roster entries for both employees on this date
      const reqEntry = await tx.shiftRosterEntry.findFirst({
        where: { employeeId: swap.requestorEmployeeId, date: swap.date },
      });

      const targetEntry = await tx.shiftRosterEntry.findFirst({
        where: { employeeId: swap.targetEmployeeId, date: swap.date },
      });

      if (reqEntry && targetEntry) {
        // Swap their shifts
        const tempShiftId = reqEntry.shiftId;
        await tx.shiftRosterEntry.update({
          where: { id: reqEntry.id },
          data: { shiftId: targetEntry.shiftId },
        });
        await tx.shiftRosterEntry.update({
          where: { id: targetEntry.id },
          data: { shiftId: tempShiftId },
        });
      }
    }

    return updated;
  });

  return updatedSwap;
}
