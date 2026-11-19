import ExcelJS from 'exceljs';
import { prisma } from './prisma';

export interface DailyGridCell {
  code: 'P' | 'A' | 'L' | 'H' | 'WO' | 'HD' | 'WFH';
  tooltip?: string;
}

/**
 * Generates an Enterprise 01-31 Daily Attendance Grid Excel Workbook
 */
export async function generateEnterpriseAttendanceWorkbook(params: {
  organizationId: string;
  month: number; // 1-12
  year: number;
  departmentId?: string;
  branchId?: string;
}): Promise<Buffer> {
  const { organizationId, month, year, departmentId, branchId } = params;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  const orgName = org?.name || 'Enterprise HRMS';

  const daysInMonth = new Date(year, month, 0).getDate();
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // 1. Fetch Employees
  const employeeWhere: any = { organizationId, employmentStatus: 'ACTIVE' };
  if (departmentId) employeeWhere.departmentId = departmentId;
  if (branchId) employeeWhere.branchId = branchId;

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: {
      department: true,
      branch: true,
      shift: true,
    },
    orderBy: { employeeCode: 'asc' },
  });

  // 2. Fetch Attendance Records for this month
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      employee: employeeWhere,
      date: { gte: startDateStr, lte: endDateStr },
    },
  });

  // 3. Fetch Leaves
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employee: employeeWhere,
      status: 'APPROVED',
      startDate: { lte: new Date(`${endDateStr}T23:59:59Z`) },
      endDate: { gte: new Date(`${startDateStr}T00:00:00Z`) },
    },
    include: { leaveType: true },
  });

  // 4. Fetch Holidays
  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId,
      date: { gte: startDateStr, lte: endDateStr },
    },
  });

  // Build workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Attendance System';
  workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 1, visibility: 'visible' }];

  // -------------------------------------------------------------
  // SHEET 1: EXECUTIVE SUMMARY
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Executive Summary');
  summarySheet.views = [{ showGridLines: true }];

  summarySheet.mergeCells('A1:F1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `${orgName} - Attendance & HR Analytics Summary`;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF11152F' } }; // Navy
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 36;

  summarySheet.mergeCells('A2:F2');
  const subCell = summarySheet.getCell('A2');
  subCell.value = `Period: ${new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })} | Generated on: ${new Date().toLocaleString()}`;
  subCell.font = { italic: true, color: { argb: 'FF64748B' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(2).height = 20;

  summarySheet.addRow([]);

  // KPI Block
  const kpiHeaders = ['Total Employees', 'Total Working Days', 'Total Present Days', 'Approved Leaves', 'Total Holidays'];
  summarySheet.addRow(kpiHeaders);
  summarySheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5428E8' } }; // Deep Indigo

  let totalPresentCount = 0;
  let totalLeaveCount = 0;
  attendanceRecords.forEach((r) => {
    if (r.status === 'PRESENT' || r.status === 'WORK_FROM_HOME') totalPresentCount += 1;
    if (r.status === 'HALF_DAY') totalPresentCount += 0.5;
  });
  leaves.forEach((l) => {
    totalLeaveCount += l.totalDays;
  });

  summarySheet.addRow([
    employees.length,
    daysInMonth,
    totalPresentCount,
    totalLeaveCount,
    holidays.length,
  ]);
  summarySheet.getRow(5).font = { size: 12, bold: true };
  summarySheet.getRow(5).alignment = { horizontal: 'center' };

  summarySheet.columns = [
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
  ];

  // -------------------------------------------------------------
  // SHEET 2: 01-31 DAILY ATTENDANCE GRID
  // -------------------------------------------------------------
  const gridSheet = workbook.addWorksheet('01-31 Daily Grid');
  gridSheet.views = [{ showGridLines: true, state: 'frozen', xSplit: 4, ySplit: 2 }];

  // Row 1: Title
  const totalCols = 4 + daysInMonth + 4; // EmpCode, Name, Dept, Branch + Days + P, A, L, Overtime
  gridSheet.mergeCells(1, 1, 1, totalCols);
  const gridTitle = gridSheet.getCell('A1');
  gridTitle.value = `${orgName} - Monthly Attendance Sheet (${new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })})`;
  gridTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  gridTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF11152F' } };
  gridTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  gridSheet.getRow(1).height = 28;

  // Row 2: Headers
  const dayHeaders: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dayHeaders.push(String(d).padStart(2, '0'));
  }

  const gridRow2 = [
    'Emp Code',
    'Employee Name',
    'Department',
    'Branch',
    ...dayHeaders,
    'Total P',
    'Total A',
    'Total L',
    'Total HD',
  ];

  gridSheet.addRow(gridRow2);
  const headerRow = gridSheet.getRow(2);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5428E8' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 24;

  // Set column widths
  const colWidths = [
    { width: 14 },
    { width: 22 },
    { width: 18 },
    { width: 16 },
    ...dayHeaders.map(() => ({ width: 4.5 })),
    { width: 9 },
    { width: 9 },
    { width: 9 },
    { width: 9 },
  ];
  gridSheet.columns = colWidths as any;

  // Cache lookups for fast iteration
  const attMap = new Map<string, any>(); // key: `${empId}_${date}`
  for (const r of attendanceRecords) {
    attMap.set(`${r.employeeId}_${r.date}`, r);
  }

  const holidayDateSet = new Set(holidays.map((h) => h.date));

  // Fill Employee rows
  employees.forEach((emp) => {
    let pCount = 0;
    let aCount = 0;
    let lCount = 0;
    let hdCount = 0;

    const dayCells: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const isWeeklyOff = emp.weeklyOff?.toUpperCase() === dayOfWeek;
      const isHoliday = holidayDateSet.has(dateStr);

      const att = attMap.get(`${emp.id}_${dateStr}`);

      let code = 'A';
      if (att) {
        if (att.status === 'PRESENT') {
          code = 'P';
          pCount++;
        } else if (att.status === 'HALF_DAY') {
          code = 'HD';
          hdCount++;
          pCount += 0.5;
        } else if (att.status === 'WORK_FROM_HOME') {
          code = 'WFH';
          pCount++;
        } else {
          code = 'A';
          aCount++;
        }
      } else if (isHoliday) {
        code = 'H';
      } else if (isWeeklyOff) {
        code = 'WO';
      } else {
        // Check if on leave
        const onLeave = leaves.some(
          (l) => l.employeeId === emp.id && l.startDate.toISOString().split('T')[0] <= dateStr && l.endDate.toISOString().split('T')[0] >= dateStr
        );
        if (onLeave) {
          code = 'L';
          lCount++;
        } else {
          code = 'A';
          aCount++;
        }
      }

      dayCells.push(code);
    }

    const row = gridSheet.addRow([
      emp.employeeCode,
      `${emp.firstName} ${emp.lastName}`,
      emp.department?.name || '-',
      emp.branch?.name || '-',
      ...dayCells,
      pCount,
      aCount,
      lCount,
      hdCount,
    ]);

    row.alignment = { vertical: 'middle' };

    // Format individual day cells
    for (let i = 0; i < daysInMonth; i++) {
      const cellIndex = 5 + i; // 1-based index in ExcelJS
      const cell = row.getCell(cellIndex);
      const code = dayCells[i];
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { bold: true, size: 8 };

      if (code === 'P') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light green
        cell.font = { color: { argb: 'FF15803D' }, bold: true, size: 8 };
      } else if (code === 'A') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light red
        cell.font = { color: { argb: 'FFB91C1C' }, bold: true, size: 8 };
      } else if (code === 'L') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Light blue
        cell.font = { color: { argb: 'FF1D4ED8' }, bold: true, size: 8 };
      } else if (code === 'H') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; // Light purple
        cell.font = { color: { argb: 'FF7E22CE' }, bold: true, size: 8 };
      } else if (code === 'WO') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Gray
        cell.font = { color: { argb: 'FF64748B' }, bold: true, size: 8 };
      } else if (code === 'HD') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amber
        cell.font = { color: { argb: 'FFB45309' }, bold: true, size: 8 };
      } else if (code === 'WFH') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } }; // Teal
        cell.font = { color: { argb: 'FF0F766E' }, bold: true, size: 8 };
      }
    }
  });

  // -------------------------------------------------------------
  // SHEET 3: LEAVE BALANCES
  // -------------------------------------------------------------
  const leaveSheet = workbook.addWorksheet('Leave Ledger');
  leaveSheet.addRow(['Employee Code', 'Employee Name', 'Department', 'Leave Type', 'Total Accrued', 'Used', 'Balance']);
  leaveSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  leaveSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF11152F' } };

  const balances = await prisma.leaveBalance.findMany({
    where: { employee: employeeWhere },
    include: {
      employee: { include: { department: true } },
      leaveType: true,
    },
  });

  balances.forEach((b) => {
    leaveSheet.addRow([
      b.employee.employeeCode,
      `${b.employee.firstName} ${b.employee.lastName}`,
      b.employee.department?.name || '-',
      b.leaveType.name,
      b.totalQuota,
      b.usedDays,
      b.remainingDays,
    ]);
  });

  leaveSheet.columns = [
    { width: 16 },
    { width: 22 },
    { width: 18 },
    { width: 20 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Validates employee import rows from an uploaded Excel file.
 */
export async function validateEmployeeImportRows(
  rows: any[],
  organizationId: string
): Promise<{
  validRows: any[];
  invalidRows: { rowNumber: number; data: any; errors: string[] }[];
}> {
  const departments = await prisma.department.findMany({ where: { organizationId } });
  const branches = await prisma.branch.findMany({ where: { organizationId } });
  const shifts = await prisma.shift.findMany({ where: { organizationId } });

  const deptMap = new Map(departments.map((d) => [d.code.toUpperCase(), d.id]));
  const branchMap = new Map(branches.map((b) => [b.code.toUpperCase(), b.id]));
  const shiftMap = new Map(shifts.map((s) => [s.code.toUpperCase(), s.id]));

  const existingEmployees = await prisma.employee.findMany({
    where: { organizationId },
    select: { employeeCode: true, email: true },
  });

  const existingCodes = new Set(existingEmployees.map((e) => e.employeeCode.toUpperCase()));
  const existingEmails = new Set(existingEmployees.map((e) => e.email.toLowerCase()));

  const validRows: any[] = [];
  const invalidRows: { rowNumber: number; data: any; errors: string[] }[] = [];

  const seenCodes = new Set<string>();
  const seenEmails = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Assuming row 1 is header
    const errors: string[] = [];

    const code = String(row.employeeCode || row['Employee Code *'] || '').trim();
    const firstName = String(row.firstName || row['First Name *'] || '').trim();
    const lastName = String(row.lastName || row['Last Name *'] || '').trim();
    const email = String(row.email || row['Email *'] || '').trim().toLowerCase();
    const designation = String(row.designation || row['Designation *'] || '').trim();
    const deptCode = String(row.departmentCode || row['Department Code *'] || '').trim().toUpperCase();
    const branchCode = String(row.branchCode || row['Branch Code *'] || '').trim().toUpperCase();
    const shiftCode = String(row.shiftCode || row['Shift Code *'] || '').trim().toUpperCase();

    if (!code) errors.push('Employee Code is required');
    else if (existingCodes.has(code.toUpperCase()) || seenCodes.has(code.toUpperCase())) {
      errors.push(`Employee Code "${code}" is already in use`);
    }

    if (!firstName) errors.push('First Name is required');
    if (!lastName) errors.push('Last Name is required');

    if (!email || !email.includes('@')) errors.push('A valid Email is required');
    else if (existingEmails.has(email) || seenEmails.has(email)) {
      errors.push(`Email "${email}" is already in use`);
    }

    if (!designation) errors.push('Designation is required');

    let departmentId = deptMap.get(deptCode);
    if (!departmentId && departments.length > 0) {
      departmentId = departments[0].id; // Fallback
    }

    let branchId = branchMap.get(branchCode);
    if (!branchId && branches.length > 0) {
      branchId = branches[0].id;
    }

    let shiftId = shiftMap.get(shiftCode);
    if (!shiftId && shifts.length > 0) {
      shiftId = shifts[0].id;
    }

    if (errors.length > 0) {
      invalidRows.push({ rowNumber: rowNum, data: row, errors });
    } else {
      seenCodes.add(code.toUpperCase());
      seenEmails.add(email);
      validRows.push({
        organizationId,
        employeeCode: code,
        firstName,
        lastName,
        email,
        phone: row.phone || row['Phone'] || null,
        designation,
        departmentId,
        branchId,
        shiftId,
        joiningDate: row.joiningDate || row['Joining Date (YYYY-MM-DD) *'] || new Date().toISOString().split('T')[0],
        employmentType: row.employmentType || row['Employment Type'] || 'FULL_TIME',
        weeklyOff: row.weeklyOff || row['Weekly Off'] || 'SUNDAY',
        baseSalary: parseFloat(row.baseSalary || row['Base Salary'] || '35000'),
      });
    }
  });

  return { validRows, invalidRows };
}
