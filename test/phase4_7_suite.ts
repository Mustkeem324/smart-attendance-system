import { prisma } from '../src/lib/prisma';
import {
  calculateLeaveDeduction,
  submitLeaveRequest,
  processLeaveDecision,
  cancelLeaveRequest,
} from '../src/lib/leave-engine';
import {
  calculateShiftDuration,
  generateMonthlyRoster,
  startBreak,
  endBreak,
  calculateAndRecordOvertime,
  requestShiftSwap,
  processShiftSwap,
} from '../src/lib/shift-roster-engine';
import {
  calculateStatutoryBreakdown,
  executeMonthlyPayrollRun,
  finalizePayrollRun,
  disbursePayrollRun,
  generatePayslipPDF,
} from '../src/lib/payroll-engine';
import {
  generateEnterpriseAttendanceWorkbook,
  validateEmployeeImportRows,
} from '../src/lib/excel-advanced';
import { RequestStatus, Role, AttendanceStatus } from '@prisma/client';

async function runTestSuite() {
  console.log('====================================================');
  console.log('STARTING PHASES 4 - 7 ADVANCED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // Setup test environment: Find or create demo Organization
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('Organization not found');

    const adminUser = await prisma.user.findFirst({
      where: { organizationId: org.id, role: Role.SUPER_ADMIN },
    });
    if (!adminUser) throw new Error('Admin user not found');

    const employee = await prisma.employee.findFirst({
      where: { organizationId: org.id, employmentStatus: 'ACTIVE' },
      include: { user: true, shift: true, department: true },
    });
    if (!employee) throw new Error('Active employee not found');

    // -----------------------------------------------------------
    // TEST SECTION 1: LEAVE ENGINE & WORKING DAYS EXCLUSION (Phase 4)
    // -----------------------------------------------------------
    console.log('\n--- Section 1: Leave Engine & Statutory Holidays Exclusion ---');

    // 1.1 Shift duration calculation (Standard and Overnight)
    const standardTiming = calculateShiftDuration('09:00', '18:00');
    assert(standardTiming.durationHours === 9.0 && !standardTiming.isOvernight, 'Standard shift duration calculated as 9.0h');

    const overnightTiming = calculateShiftDuration('22:00', '06:00');
    assert(overnightTiming.durationHours === 8.0 && overnightTiming.isOvernight, 'Overnight cross-midnight shift duration calculated as 8.0h');

    // 1.2 Get or create a Paid Leave Type
    let leaveType = await prisma.leaveType.findFirst({
      where: { organizationId: org.id, code: 'CL' },
    });
    if (!leaveType) {
      leaveType = await prisma.leaveType.create({
        data: {
          organizationId: org.id,
          name: 'Casual Leave',
          code: 'CL',
          maxDaysPerYear: 12,
          isPaid: true,
        },
      });
    }

    // 1.3 Ensure LeaveBalance exists
    const currentYear = new Date().getFullYear();
    let balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
        },
      },
    });
    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          totalQuota: 12,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: 12,
        },
      });
    }

    // Reset balance for test repeatability
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        totalQuota: 12,
        usedDays: 0,
        pendingDays: 0,
        remainingDays: 12,
      },
    });

    // 1.4 Create a test Public Holiday on a weekday (e.g. 2026-11-20 is Friday)
    const testHolidayDate = '2026-11-20';
    await prisma.holiday.upsert({
      where: {
        organizationId_date_name: {
          organizationId: org.id,
          date: testHolidayDate,
          name: 'Test Public Holiday',
        },
      },
      update: { description: 'Updated test holiday' },
      create: {
        organizationId: org.id,
        date: testHolidayDate,
        name: 'Test Public Holiday',
      },
    });

    // Clean any conflicting leave requests for this employee in Nov 2026
    await prisma.leaveRequest.deleteMany({
      where: {
        employeeId: employee.id,
        startDate: { gte: new Date('2026-11-01') },
        endDate: { lte: new Date('2026-11-30') },
      },
    });

    // 1.5 Calculate leave deduction: range 2026-11-19 (Thu) to 2026-11-23 (Mon)
    // Calendar days = 5.
    // Nov 20 (Fri) is Holiday.
    // Nov 22 (Sun) is Employee Weekly Off.
    // Working days to deduct should be 3 (Thu 19, Sat 21, Mon 23).
    const calc = await calculateLeaveDeduction(
      org.id,
      employee.id,
      leaveType.id,
      '2026-11-19',
      '2026-11-23'
    );
    assert(calc.calendarDays === 5, 'Total calendar days correctly identified as 5');
    assert(calc.holidaysCount >= 1, 'Public Holiday detected and counted for deduction exemption');
    assert(calc.weeklyOffsCount >= 1, 'Weekly off (Sunday) detected and counted for deduction exemption');
    assert(calc.deductibleDays === 3, `Statutory working days deduction accurately computed as 3 (got ${calc.deductibleDays})`);

    // 1.6 Submit Leave Request
    const submitResult = await submitLeaveRequest({
      organizationId: org.id,
      employeeId: employee.id,
      leaveTypeId: leaveType.id,
      startDateStr: '2026-11-19',
      endDateStr: '2026-11-23',
      reason: 'Family event and rest',
    });
    assert(submitResult.leaveRequest.status === RequestStatus.PENDING, 'Leave request created with PENDING status');
    assert(submitResult.leaveRequest.totalDays === 3, 'Leave request stored with 3 deductible days');

    const balAfterSubmit = await prisma.leaveBalance.findUnique({ where: { id: balance.id } });
    assert(balAfterSubmit?.pendingDays === 3, 'Pending balance reserved 3 days');

    // 1.7 Process Decision: APPROVE
    const approvedLeave = await processLeaveDecision(
      submitResult.leaveRequest.id,
      adminUser.id,
      'APPROVE',
      'Approved by management'
    );
    assert(approvedLeave.status === RequestStatus.APPROVED, 'Leave request transitioned to APPROVED');

    const balAfterApprove = await prisma.leaveBalance.findUnique({ where: { id: balance.id } });
    assert(balAfterApprove?.usedDays === 3 && balAfterApprove?.pendingDays === 0, 'Leave balance moved 3 days from pending to used');

    // 1.8 Verify Immutable Leave Ledger
    const ledgerEntry = await prisma.leaveLedger.findFirst({
      where: { referenceId: submitResult.leaveRequest.id },
      orderBy: { createdAt: 'desc' },
    });
    assert(ledgerEntry !== null && ledgerEntry.days === 3, 'Immutable LeaveLedger entry created with transaction audit');

    // 1.9 Cancel Leave Request and verify reversal
    const cancelResult = await cancelLeaveRequest(submitResult.leaveRequest.id, employee.id);
    assert(cancelResult.status === RequestStatus.CANCELLED, 'Leave request successfully cancelled');

    const balAfterCancel = await prisma.leaveBalance.findUnique({ where: { id: balance.id } });
    assert(balAfterCancel?.usedDays === 0 && balAfterCancel?.remainingDays === 12, 'Balance fully refunded upon cancellation');

    // -----------------------------------------------------------
    // TEST SECTION 2: SHIFT MANAGEMENT & OVERTIME ENGINE (Phase 6)
    // -----------------------------------------------------------
    console.log('\n--- Section 2: Shift Roster, Break Tracking & Overtime Engine ---');

    // 2.1 Generate Monthly Rotational Roster
    const rosterResult = await generateMonthlyRoster({
      organizationId: org.id,
      month: 11,
      year: 2026,
      employeeIds: [employee.id],
      rotationPattern: [
        { shiftId: employee.shiftId || '', days: 2 },
        { shiftId: employee.shiftId || '', days: 2, isWeeklyOff: true },
      ],
    });
    assert(rosterResult.totalEntriesCreated === 30, 'Generated 30 roster entries for November 2026');

    // 2.2 Break Tracking: Start & End Break
    // Clean any open break
    await prisma.breakRecord.deleteMany({
      where: { employeeId: employee.id, date: new Date().toISOString().split('T')[0] },
    });

    const breakStarted = await startBreak(employee.id, 'LUNCH');
    assert(breakStarted.breakType === 'LUNCH' && breakStarted.endTime === null, 'Break started and open');

    const breakEnded = await endBreak(employee.id);
    assert(breakEnded.endTime !== null && breakEnded.durationMinutes >= 1, 'Break ended and duration calculated');

    // 2.3 Overtime Engine
    // Create an attendance record with 11.0 hours (3.0 hours overtime on 8.0h shift)
    const testDate = '2026-11-18';
    const attRec = await prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: testDate,
        },
      },
      update: {
        totalHours: 11.0,
        status: AttendanceStatus.PRESENT,
      },
      create: {
        organizationId: org.id,
        employeeId: employee.id,
        date: testDate,
        status: AttendanceStatus.PRESENT,
        totalHours: 11.0,
      },
    });

    const overtimeRecord = await calculateAndRecordOvertime(attRec.id);
    assert(overtimeRecord !== null && overtimeRecord.calculatedHours === 3.0, 'Overtime engine calculated 3.0 excess hours');
    assert(overtimeRecord !== null && overtimeRecord.rateAmount > 0, `Overtime payable calculated: ₹${overtimeRecord?.rateAmount}`);

    // -----------------------------------------------------------
    // TEST SECTION 3: PAYROLL ENGINE & STATUTORY FORMULAS (Phase 7)
    // -----------------------------------------------------------
    console.log('\n--- Section 3: Enterprise Payroll Engine & Mathematical Integrity ---');

    // 3.1 Statutory breakdown check
    const monthlyGross = 60000;
    const breakdown = calculateStatutoryBreakdown(monthlyGross, 50000);
    assert(breakdown.basicSalary === 30000, 'Basic salary computed at 50% of gross (₹30,000)');
    assert(breakdown.hra === 12000, 'HRA computed at 40% of Basic (₹12,000)');
    assert(breakdown.pfDeduction === 3600, 'PF computed at 12% of Basic (₹3,600)');
    assert(breakdown.professionalTax === 200, 'Professional Tax flat ₹200 applied');

    // Mathematical integrity check: Net = Gross - Deductions
    const expectedNet = parseFloat((breakdown.grossSalary - breakdown.totalDeductions).toFixed(2));
    assert(breakdown.netSalary === expectedNet, `Mathematical integrity verified: Net (₹${breakdown.netSalary}) == Gross - Deductions (₹${expectedNet})`);

    // 3.2 Execute Monthly Payroll Run
    const payrollRun = await executeMonthlyPayrollRun({
      organizationId: org.id,
      month: 11,
      year: 2026,
      initiatedByUserId: adminUser.id,
    });
    assert(payrollRun.totalEmployees > 0, `Monthly payroll executed for ${payrollRun.totalEmployees} employees`);
    assert(payrollRun.totalGrossPayable > 0, `Total gross payable calculated: ₹${payrollRun.totalGrossPayable}`);
    assert(payrollRun.totalNetPayable > 0, `Total net payable calculated: ₹${payrollRun.totalNetPayable}`);

    // Verify Run totals mathematical integrity
    const calculatedNetFromRun = parseFloat((payrollRun.totalGrossPayable - payrollRun.totalDeductions).toFixed(2));
    assert(
      Math.abs(payrollRun.totalNetPayable - calculatedNetFromRun) < 0.05,
      `Run net payable equals total gross - total deductions (₹${payrollRun.totalNetPayable})`
    );

    // 3.3 Finalize Payroll Run & Generate Payslips
    const finalizeRes = await finalizePayrollRun(payrollRun.id, adminUser.id);
    assert(finalizeRes.success && finalizeRes.totalPayslipsGenerated > 0, `Payroll finalized and generated ${finalizeRes.totalPayslipsGenerated} payslips`);

    const payslip = await prisma.payslip.findFirst({
      where: { employeeId: employee.id, month: 11, year: 2026 },
    });
    assert(payslip !== null && payslip.payslipNumber.startsWith('PS-2026-11'), `Official payslip created with format: ${payslip?.payslipNumber}`);

    // 3.4 Generate Official PDF Payslip
    if (payslip) {
      const pdfBytes = await generatePayslipPDF(payslip.id);
      const pdfHeader = Buffer.from(pdfBytes).slice(0, 5).toString('utf-8');
      assert(pdfHeader === '%PDF-', 'Official PDF payslip generated with valid %PDF- magic bytes header');
    }

    // 3.5 Disburse Payroll
    const disburseRes = await disbursePayrollRun({
      payrollRunId: payrollRun.id,
      paymentReference: 'TXN-BANK-AUTOMATED-TEST-901',
      approvedByUserId: adminUser.id,
    });
    assert(disburseRes.success && disburseRes.status === 'PAID', 'Payroll cycle disbursed and marked as PAID');

    // -----------------------------------------------------------
    // TEST SECTION 4: EXCEL 01-31 DAILY GRID & BULK IMPORT (Phase 5)
    // -----------------------------------------------------------
    console.log('\n--- Section 4: Enterprise 01-31 Daily Grid & Bulk Employee Import ---');

    // 4.1 Generate Enterprise Multi-Sheet 01-31 Grid Workbook
    const gridBuffer = await generateEnterpriseAttendanceWorkbook({
      organizationId: org.id,
      month: 11,
      year: 2026,
    });
    const zipHeader = gridBuffer.slice(0, 4).toString('utf-8');
    assert(zipHeader === 'PK\x03\x04', 'Enterprise Excel workbook successfully generated with valid PK ZIP header');

    // 4.2 Bulk Employee Import Row Validation
    const testImportRows = [
      {
        'Employee Code *': 'EMP-TEST-991',
        'First Name *': 'Alice',
        'Last Name *': 'Walker',
        'Email *': 'alice.walker.test@acme.com',
        'Designation *': 'QA Engineer',
        'Department Code *': employee.department?.code || 'ENG',
        'Branch Code *': 'HQ',
      },
      {
        'Employee Code *': employee.employeeCode, // Duplicate code error test
        'First Name *': 'Duplicate',
        'Last Name *': 'User',
        'Email *': 'duplicate@acme.com',
        'Designation *': 'Tester',
      },
      {
        'Employee Code *': '', // Missing required field error test
        'First Name *': 'NoCode',
        'Last Name *': 'User',
        'Email *': 'invalid-email',
      },
    ];

    const validationResult = await validateEmployeeImportRows(testImportRows, org.id);
    assert(validationResult.validRows.length === 1, 'Validator approved exactly 1 valid employee row');
    assert(validationResult.invalidRows.length === 2, 'Validator flagged exactly 2 invalid rows');
    assert(
      validationResult.invalidRows[0].errors.some((e) => e.includes('already in use')),
      'Validator caught duplicate employee code'
    );
    assert(
      validationResult.invalidRows[1].errors.some((e) => e.includes('required')),
      'Validator caught missing required fields'
    );

    console.log('\n====================================================');
    console.log(`TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error running test suite:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
