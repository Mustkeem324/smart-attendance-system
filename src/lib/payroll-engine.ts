import { prisma } from './prisma';
import { PayrollRunStatus, SalaryComponentType } from '@prisma/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface SalaryBreakdown {
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  grossSalary: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  tdsDeduction: number;
  totalDeductions: number;
  netSalary: number;
}

/**
 * Standard Indian statutory salary breakdown calculation.
 * Basic: 50% of gross
 * HRA: 40% of Basic (20% of gross)
 * Special Allowance: 30% of gross
 * PF: 12% of Basic
 * ESI: 0.75% of Gross (if gross <= 21000)
 * PT: Flat 200 (if gross > 15000)
 */
export function calculateStatutoryBreakdown(monthlyGross: number, taxDeclarationSection80C: number = 0): SalaryBreakdown {
  const basicSalary = parseFloat((monthlyGross * 0.5).toFixed(2));
  const hra = parseFloat((basicSalary * 0.4).toFixed(2));
  const da = 0;
  const specialAllowance = parseFloat((monthlyGross - basicSalary - hra - da).toFixed(2));

  // Deductions
  const pfDeduction = parseFloat((basicSalary * 0.12).toFixed(2));
  const esiDeduction = monthlyGross <= 21000 ? parseFloat((monthlyGross * 0.0075).toFixed(2)) : 0;
  const professionalTax = monthlyGross > 15000 ? 200 : 0;

  // Simplified Annual Tax Estimation for TDS
  const annualGross = monthlyGross * 12;
  const standardDeduction = 50000;
  const taxableIncome = Math.max(0, annualGross - standardDeduction - taxDeclarationSection80C);
  let annualTax = 0;
  if (taxableIncome > 700000) {
    annualTax = (taxableIncome - 700000) * 0.10 + 20000;
  }
  const tdsDeduction = parseFloat((annualTax / 12).toFixed(2));

  const totalDeductions = parseFloat((pfDeduction + esiDeduction + professionalTax + tdsDeduction).toFixed(2));
  const netSalary = parseFloat((monthlyGross - totalDeductions).toFixed(2));

  return {
    basicSalary,
    hra,
    da,
    specialAllowance,
    grossSalary: monthlyGross,
    pfDeduction,
    esiDeduction,
    professionalTax,
    tdsDeduction,
    totalDeductions,
    netSalary,
  };
}

/**
 * Executes a full monthly payroll run for an organization.
 */
export async function executeMonthlyPayrollRun(params: {
  organizationId: string;
  month: number; // 1-12
  year: number;
  initiatedByUserId?: string;
}) {
  const { organizationId, month, year, initiatedByUserId } = params;

  // Calculate start and end date for the month
  const startDate = new Date(year, month - 1, 1);
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const endDate = new Date(year, month - 1, totalDaysInMonth, 23, 59, 59);

  // Format date range strings YYYY-MM-DD
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;

  // 1. Get or create PayrollPeriod
  const period = await prisma.payrollPeriod.upsert({
    where: {
      organizationId_month_year: {
        organizationId,
        month,
        year,
      },
    },
    update: {},
    create: {
      organizationId,
      month,
      year,
      startDate,
      endDate,
      status: PayrollRunStatus.DRAFT,
    },
  });

  // 2. Create or find existing DRAFT PayrollRun
  let payrollRun = await prisma.payrollRun.findFirst({
    where: {
      payrollPeriodId: period.id,
      status: PayrollRunStatus.DRAFT,
    },
  });

  if (!payrollRun) {
    payrollRun = await prisma.payrollRun.create({
      data: {
        organizationId,
        payrollPeriodId: period.id,
        status: PayrollRunStatus.DRAFT,
      },
    });
  }

  // 3. Fetch all active employees
  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      employmentStatus: 'ACTIVE',
    },
    include: {
      department: true,
      branch: true,
      salaryAssignments: {
        where: {
          effectiveFrom: { lte: endDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: startDate } }],
        },
        include: {
          salaryStructure: {
            include: { components: true },
          },
        },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
      taxDeclarations: {
        where: { financialYear: `${year}-${year + 1}` },
      },
      employeeLoans: {
        where: { status: 'ACTIVE' },
        include: {
          installments: {
            where: { status: 'PENDING' },
            take: 1,
          },
        },
      },
    },
  });

  let totalGross = 0;
  let totalDeductionsAll = 0;
  let totalNet = 0;
  let totalOvertimeAll = 0;

  for (const emp of employees) {
    // 3a. Attendance analysis
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: emp.id,
        date: { gte: startDateStr, lte: endDateStr },
      },
    });

    let presentDays = 0;
    for (const att of attendanceRecords) {
      if (att.status === 'PRESENT') {
        presentDays += 1;
      } else if (att.status === 'HALF_DAY') {
        presentDays += 0.5;
      } else if (att.status === 'WORK_FROM_HOME') {
        presentDays += 1;
      }
    }

    // 3b. Leave analysis
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: emp.id,
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { leaveType: true },
    });

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    for (const lr of leaveRequests) {
      if (lr.leaveType.isPaid) {
        paidLeaveDays += lr.totalDays;
      } else {
        unpaidLeaveDays += lr.totalDays;
      }
    }

    // 3c. Holidays
    const holidaysCount = await prisma.holiday.count({
      where: {
        organizationId,
        date: { gte: startDateStr, lte: endDateStr },
        OR: [{ branchId: null }, { branchId: emp.branchId }],
      },
    });

    // 3d. Weekly offs in month
    let weeklyOffDays = 0;
    const targetWeeklyOff = (emp.weeklyOff || 'SUNDAY').toUpperCase();
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dt = new Date(year, month - 1, d);
      if (dt.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() === targetWeeklyOff) {
        weeklyOffDays += 1;
      }
    }

    // Payable Days Calculation: Present + Paid Leave + Holidays + Weekly Offs (capped at totalDaysInMonth)
    // If no attendance records at all, fallback to totalDaysInMonth minus unpaid leaves for automated runner
    let payableDays = presentDays + paidLeaveDays + holidaysCount + weeklyOffDays;
    if (attendanceRecords.length === 0 && unpaidLeaveDays === 0) {
      // Default to full month if attendance was not tracked daily for this employee
      payableDays = totalDaysInMonth;
      presentDays = totalDaysInMonth - weeklyOffDays - holidaysCount;
    } else {
      payableDays = Math.min(totalDaysInMonth, Math.max(0, payableDays));
    }

    const lossOfPayDays = Math.max(0, totalDaysInMonth - payableDays);

    // 3e. Overtime Records
    const overtimeRecords = await prisma.overtimeRecord.findMany({
      where: {
        employeeId: emp.id,
        date: { gte: startDateStr, lte: endDateStr },
        status: 'APPROVED',
      },
    });

    const overtimeHours = overtimeRecords.reduce((sum, r) => sum + (r.approvedHours || r.calculatedHours), 0);
    const overtimeAmount = overtimeRecords.reduce((sum, r) => sum + r.rateAmount, 0);

    // 3f. Determine Base Monthly Gross
    let monthlyGross = emp.baseSalary || 35000;
    const assignment = emp.salaryAssignments[0];
    if (assignment) {
      monthlyGross = assignment.monthlyGross || assignment.annualCtc / 12;
    }

    // Compute statutory breakdown
    const tax80C = emp.taxDeclarations[0]?.section80C || 0;
    const breakdown = calculateStatutoryBreakdown(monthlyGross, tax80C);

    // LWP deduction
    const perDaySalary = monthlyGross / totalDaysInMonth;
    const lwpDeduction = parseFloat((perDaySalary * lossOfPayDays).toFixed(2));

    // Loan Recovery
    let loanRecovery = 0;
    for (const loan of emp.employeeLoans) {
      if (loan.installments.length > 0) {
        loanRecovery += loan.installments[0].amount;
      }
    }

    // Final calculations: Gross and Deductions
    const actualGrossEarned = parseFloat((monthlyGross - lwpDeduction + overtimeAmount).toFixed(2));
    const totalDeductions = parseFloat(
      (breakdown.pfDeduction + breakdown.esiDeduction + breakdown.professionalTax + breakdown.tdsDeduction + loanRecovery).toFixed(2)
    );
    const netSalary = parseFloat((actualGrossEarned - totalDeductions).toFixed(2));

    // Upsert PayrollEmployeeRecord
    await prisma.payrollEmployeeRecord.upsert({
      where: {
        payrollRunId_employeeId: {
          payrollRunId: payrollRun.id,
          employeeId: emp.id,
        },
      },
      update: {
        totalWorkingDays: totalDaysInMonth,
        payableDays,
        presentDays,
        paidLeaveDays,
        unpaidLeaveDays: lossOfPayDays,
        holidays: holidaysCount,
        weeklyOffs: weeklyOffDays,
        overtimeHours,
        overtimeAmount,
        basicSalary: breakdown.basicSalary,
        hra: breakdown.hra,
        da: breakdown.da,
        specialAllowance: breakdown.specialAllowance,
        grossSalary: actualGrossEarned,
        pfDeduction: breakdown.pfDeduction,
        esiDeduction: breakdown.esiDeduction,
        professionalTax: breakdown.professionalTax,
        tdsDeduction: breakdown.tdsDeduction,
        loanRecovery,
        lwpDeduction,
        totalDeductions,
        netSalary,
      },
      create: {
        payrollRunId: payrollRun.id,
        employeeId: emp.id,
        totalWorkingDays: totalDaysInMonth,
        payableDays,
        presentDays,
        paidLeaveDays,
        unpaidLeaveDays: lossOfPayDays,
        holidays: holidaysCount,
        weeklyOffs: weeklyOffDays,
        overtimeHours,
        overtimeAmount,
        basicSalary: breakdown.basicSalary,
        hra: breakdown.hra,
        da: breakdown.da,
        specialAllowance: breakdown.specialAllowance,
        grossSalary: actualGrossEarned,
        pfDeduction: breakdown.pfDeduction,
        esiDeduction: breakdown.esiDeduction,
        professionalTax: breakdown.professionalTax,
        tdsDeduction: breakdown.tdsDeduction,
        loanRecovery,
        lwpDeduction,
        totalDeductions,
        netSalary,
      },
    });

    totalGross += actualGrossEarned;
    totalDeductionsAll += totalDeductions;
    totalNet += netSalary;
    totalOvertimeAll += overtimeAmount;
  }

  // Update PayrollRun summary
  const updatedRun = await prisma.payrollRun.update({
    where: { id: payrollRun.id },
    data: {
      totalEmployees: employees.length,
      totalGrossPayable: parseFloat(totalGross.toFixed(2)),
      totalDeductions: parseFloat(totalDeductionsAll.toFixed(2)),
      totalNetPayable: parseFloat(totalNet.toFixed(2)),
      totalOvertimeAmount: parseFloat(totalOvertimeAll.toFixed(2)),
    },
    include: {
      employeeRecords: {
        include: { employee: true },
      },
    },
  });

  return updatedRun;
}

/**
 * Finalizes payroll run and generates official payslips.
 */
export async function finalizePayrollRun(payrollRunId: string, finalizedByUserId?: string) {
  const payrollRun = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: {
      payrollPeriod: true,
      employeeRecords: {
        include: { employee: true },
      },
    },
  });

  if (!payrollRun) {
    throw new Error('Payroll run not found.');
  }

  const { month, year } = payrollRun.payrollPeriod;

  // Create payslip for each employee record
  await prisma.$transaction(async (tx) => {
    for (const record of payrollRun.employeeRecords) {
      const payslipNumber = `PS-${year}-${String(month).padStart(2, '0')}-${record.employee.employeeCode}`;

      await tx.payslip.upsert({
        where: { payslipNumber },
        update: {
          payrollRunId: payrollRun.id,
          grossSalary: record.grossSalary,
          totalDeductions: record.totalDeductions,
          netSalary: record.netSalary,
          isPublished: true,
        },
        create: {
          organizationId: payrollRun.organizationId,
          payrollRunId: payrollRun.id,
          employeeId: record.employeeId,
          month,
          year,
          payslipNumber,
          grossSalary: record.grossSalary,
          totalDeductions: record.totalDeductions,
          netSalary: record.netSalary,
          isPublished: true,
        },
      });
    }

    await tx.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: PayrollRunStatus.FINALIZED,
        finalizedAt: new Date(),
        finalizedByUserId,
      },
    });

    await tx.payrollPeriod.update({
      where: { id: payrollRun.payrollPeriodId },
      data: { status: PayrollRunStatus.FINALIZED },
    });
  });

  return { success: true, payrollRunId, totalPayslipsGenerated: payrollRun.employeeRecords.length };
}

/**
 * Marks payroll run as paid and reconciles loan installments.
 */
export async function disbursePayrollRun(params: {
  payrollRunId: string;
  paymentReference: string;
  paymentDate?: Date;
  approvedByUserId?: string;
}) {
  const { payrollRunId, paymentReference, paymentDate = new Date(), approvedByUserId } = params;

  const payrollRun = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: {
      employeeRecords: {
        include: {
          employee: {
            include: {
              employeeLoans: {
                where: { status: 'ACTIVE' },
                include: {
                  installments: { where: { status: 'PENDING' }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payrollRun) {
    throw new Error('Payroll run not found.');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Mark payroll run as paid
    await tx.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: PayrollRunStatus.PAID,
        paymentStatus: 'PAID',
        paymentReference,
        paymentDate,
        approvedByUserId,
        approvedAt: new Date(),
      },
    });

    // 2. Mark employee records as paid and update loan installments
    for (const record of payrollRun.employeeRecords) {
      await tx.payrollEmployeeRecord.update({
        where: { id: record.id },
        data: {
          paymentStatus: 'PAID',
          paymentReference,
        },
      });

      // Update deducted loan installments
      for (const loan of record.employee.employeeLoans) {
        if (loan.installments.length > 0) {
          const inst = loan.installments[0];
          await tx.loanInstallment.update({
            where: { id: inst.id },
            data: {
              status: 'DEDUCTED',
              paidDate: paymentDate,
            },
          });

          // Check if loan is now fully repaid
          const newRepaid = loan.totalRepaid + inst.amount;
          const newBalance = Math.max(0, loan.outstandingBalance - inst.amount);
          await tx.employeeLoan.update({
            where: { id: loan.id },
            data: {
              totalRepaid: newRepaid,
              outstandingBalance: newBalance,
              status: newBalance <= 0 ? 'CLOSED' : 'ACTIVE',
            },
          });
        }
      }
    }
  });

  return { success: true, status: 'PAID', paymentReference };
}

/**
 * Generates official PDF payslip document.
 */
export async function generatePayslipPDF(payslipId: string): Promise<Uint8Array> {
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      organization: true,
      employee: {
        include: {
          department: true,
          branch: true,
        },
      },
      payrollRun: {
        include: {
          payrollPeriod: true,
          employeeRecords: true,
        },
      },
    },
  });

  if (!payslip) {
    throw new Error('Payslip not found.');
  }

  const empRecord = payslip.payrollRun.employeeRecords.find(
    (r) => r.employeeId === payslip.employeeId
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // 1. Header Banner
  doc.setFillColor(17, 21, 47); // Master UI Navy #11152F
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(payslip.organization.name.toUpperCase(), 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`PAYSLIP FOR ${new Date(payslip.year, payslip.month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}`, 14, 23);

  doc.setFontSize(9);
  doc.text(`Ref: ${payslip.payslipNumber}`, 196, 23, { align: 'right' });

  // 2. Employee Details Grid
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 14, 40);

  const empDetails = [
    ['Employee Name', `${payslip.employee.firstName} ${payslip.employee.lastName}`, 'Employee Code', payslip.employee.employeeCode],
    ['Department', payslip.employee.department?.name || 'General', 'Designation', payslip.employee.designation],
    ['Branch', payslip.employee.branch?.name || 'Main Campus', 'Bank Account', (payslip.employee.bankAccountDetails as any)?.accountNumber || 'CONFIDENTIAL'],
    ['Total Days', `${empRecord?.totalWorkingDays || 30}`, 'Payable Days', `${empRecord?.payableDays || 30}`],
  ];

  autoTable(doc, {
    startY: 44,
    body: empDetails,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 32 },
      1: { fontStyle: 'normal', textColor: [15, 23, 42], cellWidth: 63 },
      2: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 32 },
      3: { fontStyle: 'normal', textColor: [15, 23, 42], cellWidth: 63 },
    },
  });

  // 3. Earnings & Deductions Tables
  const lastY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Salary & Deductions Breakdown', 14, lastY);

  const earnings = [
    ['Basic Salary', `INR ${(empRecord?.basicSalary || 0).toLocaleString()}`],
    ['House Rent Allowance (HRA)', `INR ${(empRecord?.hra || 0).toLocaleString()}`],
    ['Special Allowance', `INR ${(empRecord?.specialAllowance || 0).toLocaleString()}`],
    ['Overtime Payout', `INR ${(empRecord?.overtimeAmount || 0).toLocaleString()}`],
    ['Gross Earnings', `INR ${(empRecord?.grossSalary || payslip.grossSalary).toLocaleString()}`],
  ];

  const deductions = [
    ['Provident Fund (PF)', `INR ${(empRecord?.pfDeduction || 0).toLocaleString()}`],
    ['Employee State Insurance (ESI)', `INR ${(empRecord?.esiDeduction || 0).toLocaleString()}`],
    ['Professional Tax (PT)', `INR ${(empRecord?.professionalTax || 0).toLocaleString()}`],
    ['Tax Deducted at Source (TDS)', `INR ${(empRecord?.tdsDeduction || 0).toLocaleString()}`],
    ['Loan Recovery', `INR ${(empRecord?.loanRecovery || 0).toLocaleString()}`],
    ['Loss of Pay (LWP)', `INR ${(empRecord?.lwpDeduction || 0).toLocaleString()}`],
    ['Total Deductions', `INR ${(empRecord?.totalDeductions || payslip.totalDeductions).toLocaleString()}`],
  ];

  // Merge table rows side by side
  const combinedRows: any[] = [];
  const maxRows = Math.max(earnings.length, deductions.length);
  for (let i = 0; i < maxRows; i++) {
    const e = earnings[i] || ['', ''];
    const d = deductions[i] || ['', ''];
    combinedRows.push([e[0], e[1], d[0], d[1]]);
  }

  autoTable(doc, {
    startY: lastY + 4,
    head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
    body: combinedRows,
    theme: 'grid',
    headStyles: {
      fillColor: [84, 40, 232], // Master UI Deep Indigo #5428E8
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 55 },
      3: { cellWidth: 40, halign: 'right' },
    },
  });

  // 4. Net Salary Card Banner
  const tableEndY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFillColor(246, 245, 255); // Soft Lavender #F6F5FF
  doc.roundedRect(14, tableEndY, 182, 24, 3, 3, 'F');
  doc.setDrawColor(84, 40, 232);
  doc.roundedRect(14, tableEndY, 182, 24, 3, 3, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('NET SALARY PAYABLE:', 22, tableEndY + 10);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(84, 40, 232);
  doc.text(`INR ${payslip.netSalary.toLocaleString()}`, 22, tableEndY + 18);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('This is a system-generated payslip and does not require a physical signature.', 14, 280);

  return doc.output('arraybuffer') as unknown as Uint8Array;
}
