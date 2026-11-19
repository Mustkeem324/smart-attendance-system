import { prisma } from '@/lib/prisma';
import { RequestStatus, LeaveLedgerType } from '@prisma/client';

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export interface LeaveCalculationSummary {
  calendarDays: number;
  workingDays: number;
  holidaysCount: number;
  weeklyOffsCount: number;
  deductibleDays: number;
  availableBalance: number;
  hasSufficientBalance: boolean;
  holidayNames: string[];
}

/**
 * Calculates working days, holidays, and weekly offs between two dates for an employee.
 * Excludes applicable public holidays and weekly offs so employee balance is only deducted for working days!
 */
export async function calculateLeaveDeduction(
  organizationId: string,
  employeeId: string,
  leaveTypeId: string,
  startDateStr: string,
  endDateStr: string,
  isHalfDay: boolean = false
): Promise<LeaveCalculationSummary> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { branch: true },
  });

  if (!employee) throw new Error('Employee not found');

  const start = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T23:59:59Z`);

  if (start > end) {
    throw new Error('Start date must be before or equal to end date');
  }

  // If half day, total deductible days is always 0.5
  if (isHalfDay) {
    const balance = await getAvailableLeaveBalance(employeeId, leaveTypeId);
    return {
      calendarDays: 1,
      workingDays: 1,
      holidaysCount: 0,
      weeklyOffsCount: 0,
      deductibleDays: 0.5,
      availableBalance: balance,
      hasSufficientBalance: balance >= 0.5,
      holidayNames: [],
    };
  }

  // 1. Fetch holidays in date range
  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId,
      date: { gte: startDateStr, lte: endDateStr },
      OR: [{ branchId: null }, { branchId: employee.branchId }],
    },
  });

  const holidayDateMap = new Map<string, string>();
  holidays.forEach((h) => holidayDateMap.set(h.date, h.name));

  const weeklyOffs = (employee.weeklyOff || 'SUNDAY').toUpperCase().split(',').map((s) => s.trim());

  let cur = new Date(start);
  let calendarDays = 0;
  let holidaysCount = 0;
  let weeklyOffsCount = 0;
  let workingDays = 0;
  const holidayNames: string[] = [];

  while (cur <= end) {
    calendarDays++;
    const curDateStr = cur.toISOString().split('T')[0];
    const dayOfWeek = DAY_NAMES[cur.getUTCDay()];

    if (holidayDateMap.has(curDateStr)) {
      holidaysCount++;
      holidayNames.push(`${curDateStr}: ${holidayDateMap.get(curDateStr)}`);
    } else if (weeklyOffs.includes(dayOfWeek)) {
      weeklyOffsCount++;
    } else {
      workingDays++;
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const deductibleDays = workingDays;
  const balance = await getAvailableLeaveBalance(employeeId, leaveTypeId);

  return {
    calendarDays,
    workingDays,
    holidaysCount,
    weeklyOffsCount,
    deductibleDays,
    availableBalance: balance,
    hasSufficientBalance: balance >= deductibleDays,
    holidayNames,
  };
}

/**
 * Gets remaining available leave balance for an employee and leave type
 */
export async function getAvailableLeaveBalance(employeeId: string, leaveTypeId: string): Promise<number> {
  const currentYear = new Date().getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId,
        leaveTypeId,
        year: currentYear,
      },
    },
  });

  if (!balance) return 0;
  return Math.max(0, balance.totalQuota - balance.usedDays - balance.pendingDays);
}

/**
 * Submits a leave request with balance reservations, multi-level approvals, and ledger recording
 */
export async function submitLeaveRequest(data: {
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  startDateStr: string;
  endDateStr: string;
  isHalfDay?: boolean;
  halfDayPeriod?: string;
  reason: string;
  documentUrl?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check for overlapping requests
    const start = new Date(`${data.startDateStr}T00:00:00Z`);
    const end = new Date(`${data.endDateStr}T23:59:59Z`);

    const overlap = await tx.leaveRequest.findFirst({
      where: {
        employeeId: data.employeeId,
        status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlap) {
      throw new Error('An overlapping leave request already exists for this date range');
    }

    // 2. Calculate deductions and verify balance
    const calc = await calculateLeaveDeduction(
      data.organizationId,
      data.employeeId,
      data.leaveTypeId,
      data.startDateStr,
      data.endDateStr,
      data.isHalfDay
    );

    if (!calc.hasSufficientBalance) {
      throw new Error(`Insufficient leave balance. Available: ${calc.availableBalance} days, Required: ${calc.deductibleDays} days`);
    }

    // 3. Create Leave Request
    const leaveRequest = await tx.leaveRequest.create({
      data: {
        organizationId: data.organizationId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate: start,
        endDate: end,
        totalDays: calc.deductibleDays,
        isHalfDay: Boolean(data.isHalfDay),
        halfDayPeriod: data.halfDayPeriod || null,
        reason: data.reason,
        documentUrl: data.documentUrl || null,
        status: RequestStatus.PENDING,
      },
    });

    // 4. Reserve pending days on balance
    const currentYear = new Date().getFullYear();
    const balance = await tx.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (balance) {
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { pendingDays: balance.pendingDays + calc.deductibleDays },
      });
    }

    // 5. Create Multi-level approval steps (Manager & HR)
    const emp = await tx.employee.findUnique({
      where: { id: data.employeeId },
      include: { manager: { include: { user: true } } },
    });

    // Level 1: Reporting Manager (if assigned and has user account)
    if (emp?.manager?.user?.id) {
      await tx.leaveApproval.create({
        data: {
          leaveRequestId: leaveRequest.id,
          approverUserId: emp.manager.user.id,
          approverEmployeeId: emp.manager.id,
          level: 1,
          status: RequestStatus.PENDING,
        },
      });
    }

    return { leaveRequest, calculation: calc };
  });
}

/**
 * Reviews (Approve/Reject) a leave request and updates transaction ledger and balance
 */
export async function processLeaveDecision(
  leaveRequestId: string,
  reviewerUserId: string,
  action: 'APPROVE' | 'REJECT',
  remarks?: string
) {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { employee: true, leaveType: true },
    });

    if (!request) throw new Error('Leave request not found');
    if (request.status !== RequestStatus.PENDING) {
      throw new Error(`Request is already ${request.status.toLowerCase()}`);
    }

    // Security check: Employee cannot approve their own leave
    if (request.employee.userId === reviewerUserId) {
      throw new Error('Unauthorized: Employees cannot approve their own leave requests');
    }

    const currentYear = new Date().getFullYear();
    const balance = await tx.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (!balance) throw new Error('Employee leave balance record not found');

    if (action === 'APPROVE') {
      // Deduct from pending, add to used
      const updatedPending = Math.max(0, balance.pendingDays - request.totalDays);
      const updatedUsed = balance.usedDays + request.totalDays;
      const updatedRemaining = Math.max(0, balance.totalQuota - updatedUsed - updatedPending);

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pendingDays: updatedPending,
          usedDays: updatedUsed,
          remainingDays: updatedRemaining,
        },
      });

      // Update Leave Request
      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: RequestStatus.APPROVED,
          reviewedByUserId: reviewerUserId,
          reviewRemark: remarks || 'Approved by reviewer',
          reviewedAt: new Date(),
        },
      });

      // Record immutable ledger entry
      await tx.leaveLedger.create({
        data: {
          organizationId: request.organizationId,
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          transactionType: LeaveLedgerType.DEBIT,
          days: request.totalDays,
          balanceBefore: balance.remainingDays,
          balanceAfter: updatedRemaining,
          referenceId: request.id,
          reason: `Approved leave: ${request.reason}`,
        },
      });

      return updatedRequest;
    } else {
      // REJECT: Restore pending days
      const updatedPending = Math.max(0, balance.pendingDays - request.totalDays);
      const updatedRemaining = Math.max(0, balance.totalQuota - balance.usedDays - updatedPending);

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pendingDays: updatedPending,
          remainingDays: updatedRemaining,
        },
      });

      // Update Leave Request
      const updatedRequest = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: RequestStatus.REJECTED,
          reviewedByUserId: reviewerUserId,
          reviewRemark: remarks || 'Rejected by reviewer',
          reviewedAt: new Date(),
        },
      });

      // Record reversal in ledger
      await tx.leaveLedger.create({
        data: {
          organizationId: request.organizationId,
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          transactionType: LeaveLedgerType.REVERSAL,
          days: request.totalDays,
          balanceBefore: balance.remainingDays,
          balanceAfter: updatedRemaining,
          referenceId: request.id,
          reason: `Rejected leave reservation reversed: ${remarks || 'No remarks provided'}`,
        },
      });

      return updatedRequest;
    }
  });
}

/**
 * Cancels a leave request and restores balance
 */
export async function cancelLeaveRequest(leaveRequestId: string, employeeId: string) {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });

    if (!request || request.employeeId !== employeeId) {
      throw new Error('Leave request not found or unauthorized');
    }

    if (request.status === RequestStatus.CANCELLED) {
      throw new Error('Request is already cancelled');
    }

    const currentYear = new Date().getFullYear();
    const balance = await tx.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (balance) {
      if (request.status === RequestStatus.PENDING) {
        // Restore pending days
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: Math.max(0, balance.pendingDays - request.totalDays),
            remainingDays: Math.max(0, balance.totalQuota - balance.usedDays),
          },
        });
      } else if (request.status === RequestStatus.APPROVED) {
        // Restore used days
        const updatedUsed = Math.max(0, balance.usedDays - request.totalDays);
        const updatedRemaining = Math.max(0, balance.totalQuota - updatedUsed);

        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            usedDays: updatedUsed,
            remainingDays: updatedRemaining,
          },
        });

        // Record reversal ledger entry
        await tx.leaveLedger.create({
          data: {
            organizationId: request.organizationId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            transactionType: LeaveLedgerType.REVERSAL,
            days: request.totalDays,
            balanceBefore: balance.remainingDays,
            balanceAfter: updatedRemaining,
            referenceId: request.id,
            reason: 'Employee cancelled approved leave',
          },
        });
      }
    }

    return await tx.leaveRequest.update({
      where: { id: leaveRequestId },
      data: { status: RequestStatus.CANCELLED },
    });
  });
}

/**
 * Credits approved Compensatory Off days to employee balance and ledger
 */
export async function grantCompensatoryOff(data: {
  organizationId: string;
  employeeId: string;
  workedDate: string;
  hoursWorked: number;
  daysGranted: number;
  reason: string;
  grantedByUserId: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const compOff = await tx.compensatoryOff.create({
      data: {
        organizationId: data.organizationId,
        employeeId: data.employeeId,
        workedDate: data.workedDate,
        hoursWorked: data.hoursWorked,
        daysGranted: data.daysGranted,
        reason: data.reason,
        status: RequestStatus.APPROVED,
        reviewedByUserId: data.grantedByUserId,
        reviewedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 86400000), // Valid for 90 days
      },
    });

    // Credit to compensatory leave type
    let compLeaveType = await tx.leaveType.findFirst({
      where: { organizationId: data.organizationId, code: 'COMP_OFF' },
    });

    if (!compLeaveType) {
      compLeaveType = await tx.leaveType.create({
        data: {
          organizationId: data.organizationId,
          name: 'Compensatory Off',
          code: 'COMP_OFF',
          description: 'Compensatory off earned by working on holiday or weekly off',
          maxDaysPerYear: 30,
          isPaid: true,
        },
      });
    }

    const currentYear = new Date().getFullYear();
    const balance = await tx.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: data.employeeId,
          leaveTypeId: compLeaveType.id,
          year: currentYear,
        },
      },
      update: {
        totalQuota: { increment: data.daysGranted },
        remainingDays: { increment: data.daysGranted },
      },
      create: {
        employeeId: data.employeeId,
        leaveTypeId: compLeaveType.id,
        year: currentYear,
        totalQuota: data.daysGranted,
        remainingDays: data.daysGranted,
      },
    });

    await tx.leaveLedger.create({
      data: {
        organizationId: data.organizationId,
        employeeId: data.employeeId,
        leaveTypeId: compLeaveType.id,
        transactionType: LeaveLedgerType.CREDIT,
        days: data.daysGranted,
        balanceBefore: balance.remainingDays - data.daysGranted,
        balanceAfter: balance.remainingDays,
        referenceId: compOff.id,
        reason: `Earned Comp Off for working on ${data.workedDate}: ${data.reason}`,
      },
    });

    return compOff;
  });
}
