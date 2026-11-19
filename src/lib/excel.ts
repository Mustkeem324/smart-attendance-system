import ExcelJS from 'exceljs';
import { prisma } from './prisma';

/**
 * Generates an Excel template for bulk importing employees.
 */
export async function generateEmployeeImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Attendance System';
  const sheet = workbook.addWorksheet('Employee_Import_Template');

  sheet.columns = [
    { header: 'Employee Code *', key: 'employeeCode', width: 16 },
    { header: 'First Name *', key: 'firstName', width: 16 },
    { header: 'Last Name *', key: 'lastName', width: 16 },
    { header: 'Email *', key: 'email', width: 26 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Designation *', key: 'designation', width: 22 },
    { header: 'Department Code *', key: 'departmentCode', width: 18 },
    { header: 'Branch Code *', key: 'branchCode', width: 16 },
    { header: 'Shift Code *', key: 'shiftCode', width: 14 },
    { header: 'Joining Date (YYYY-MM-DD) *', key: 'joiningDate', width: 26 },
    { header: 'Employment Type (FULL_TIME/PART_TIME/CONTRACT/INTERN)', key: 'employmentType', width: 30 },
    { header: 'Weekly Off (e.g. SUNDAY)', key: 'weeklyOff', width: 20 },
    { header: 'Base Salary', key: 'baseSalary', width: 16 },
  ];

  // Header styling
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }, // Blue
  };

  // Add sample rows
  sheet.addRow({
    employeeCode: 'EMP-101',
    firstName: 'David',
    lastName: 'Miller',
    email: 'david.miller@acme.com',
    phone: '+1-555-0921',
    designation: 'Frontend Specialist',
    departmentCode: 'ENG',
    branchCode: 'HQ-DL',
    shiftCode: 'GEN',
    joiningDate: '2026-01-10',
    employmentType: 'FULL_TIME',
    weeklyOff: 'SUNDAY',
    baseSalary: 70000,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Validates and imports employees from an Excel file buffer.
 */
export async function parseAndImportEmployees(
  buffer: Buffer,
  organizationId: string
): Promise<{
  successCount: number;
  errors: { row: number; error: string }[];
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new Error('No worksheets found in the uploaded file');
  }

  // Pre-fetch organization lookup maps
  const departments = await prisma.department.findMany({ where: { organizationId } });
  const branches = await prisma.branch.findMany({ where: { organizationId } });
  const shifts = await prisma.shift.findMany({ where: { organizationId } });

  const deptMap = new Map(departments.map((d) => [d.code.toUpperCase(), d.id]));
  const branchMap = new Map(branches.map((b) => [b.code.toUpperCase(), b.id]));
  const shiftMap = new Map(shifts.map((s) => [s.code.toUpperCase(), s.id]));

  const errors: { row: number; error: string }[] = [];
  let successCount = 0;

  // Row 1 is header, iterate starting row 2
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (!row.hasValues) continue;

    const employeeCode = String(row.getCell(1).value || '').trim();
    const firstName = String(row.getCell(2).value || '').trim();
    const lastName = String(row.getCell(3).value || '').trim();
    let emailVal = row.getCell(4).value;
    // handle hyperlink objects in excel
    let email = typeof emailVal === 'object' && emailVal && 'text' in emailVal ? (emailVal as any).text : String(emailVal || '').trim();
    const phone = String(row.getCell(5).value || '').trim();
    const designation = String(row.getCell(6).value || '').trim();
    const departmentCode = String(row.getCell(7).value || '').trim().toUpperCase();
    const branchCode = String(row.getCell(8).value || '').trim().toUpperCase();
    const shiftCode = String(row.getCell(9).value || '').trim().toUpperCase();
    const joiningDateVal = row.getCell(10).value;
    const employmentTypeStr = String(row.getCell(11).value || 'FULL_TIME').trim().toUpperCase();
    const weeklyOff = String(row.getCell(12).value || 'SUNDAY').trim();
    const baseSalary = Number(row.getCell(13).value) || 0;

    if (!employeeCode || !firstName || !lastName || !email || !designation) {
      errors.push({ row: rowNumber, error: 'Missing mandatory fields (Code, Name, Email, or Designation)' });
      continue;
    }

    const deptId = deptMap.get(departmentCode);
    if (!deptId) {
      errors.push({ row: rowNumber, error: `Invalid Department Code: '${departmentCode}'` });
      continue;
    }

    const branchId = branchMap.get(branchCode);
    if (!branchId) {
      errors.push({ row: rowNumber, error: `Invalid Branch Code: '${branchCode}'` });
      continue;
    }

    const shiftId = shiftMap.get(shiftCode);
    if (!shiftId) {
      errors.push({ row: rowNumber, error: `Invalid Shift Code: '${shiftCode}'` });
      continue;
    }

    let joiningDate = new Date();
    if (joiningDateVal instanceof Date) {
      joiningDate = joiningDateVal;
    } else if (typeof joiningDateVal === 'string' && joiningDateVal) {
      joiningDate = new Date(joiningDateVal);
    }

    try {
      // Check if user already exists
      let user = await prisma.user.findFirst({
        where: { organizationId, email },
      });

      if (!user) {
        const bcrypt = (await import('bcryptjs')).default;
        const defaultHash = await bcrypt.hash('Welcome@123', 10);
        user = await prisma.user.create({
          data: {
            organizationId,
            email,
            passwordHash: defaultHash,
            role: 'EMPLOYEE',
          },
        });
      }

      await prisma.employee.upsert({
        where: {
          organizationId_employeeCode: {
            organizationId,
            employeeCode,
          },
        },
        update: {
          firstName,
          lastName,
          phone,
          designation,
          departmentId: deptId,
          branchId,
          shiftId,
          baseSalary,
          weeklyOff,
        },
        create: {
          userId: user.id,
          organizationId,
          employeeCode,
          firstName,
          lastName,
          email,
          phone,
          designation,
          departmentId: deptId,
          branchId,
          shiftId,
          joiningDate,
          baseSalary,
          weeklyOff,
        },
      });

      successCount++;
    } catch (err: any) {
      errors.push({ row: rowNumber, error: err.message || 'Database error during employee creation' });
    }
  }

  return { successCount, errors };
}

/**
 * Generates an Excel report of attendance records.
 */
export async function generateAttendanceExcelReport(
  attendanceRecords: any[],
  organizationName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Attendance System';
  const sheet = workbook.addWorksheet('Attendance_Report');

  // Title Block
  sheet.mergeCells('A1:K1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${organizationName} - Comprehensive Attendance Report`;
  titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  sheet.getRow(2).values = [
    'Date',
    'Emp Code',
    'Employee Name',
    'Department',
    'Branch',
    'Status',
    'Check In',
    'Check Out',
    'Total Hours',
    'Late (min)',
    'Geofence Verified',
  ];

  sheet.getRow(2).font = { bold: true };
  sheet.getRow(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };

  sheet.columns = [
    { key: 'date', width: 14 },
    { key: 'empCode', width: 14 },
    { key: 'empName', width: 22 },
    { key: 'dept', width: 20 },
    { key: 'branch', width: 20 },
    { key: 'status', width: 16 },
    { key: 'checkIn', width: 18 },
    { key: 'checkOut', width: 18 },
    { key: 'hours', width: 14 },
    { key: 'late', width: 12 },
    { key: 'geofence', width: 18 },
  ];

  attendanceRecords.forEach((record) => {
    const row = sheet.addRow({
      date: record.date,
      empCode: record.employee?.employeeCode || 'N/A',
      empName: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
      dept: record.employee?.department?.name || 'N/A',
      branch: record.employee?.branch?.name || 'N/A',
      status: record.status,
      checkIn: record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '--',
      checkOut: record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '--',
      hours: record.totalHours ? `${record.totalHours} hrs` : '--',
      late: record.lateMinutes || 0,
      geofence: record.checkInWithinGeofence ? 'YES (Within Radius)' : 'NO / Flagged',
    });

    // Color code status cell
    const statusCell = row.getCell(6);
    if (record.status === 'PRESENT') {
      statusCell.font = { color: { argb: 'FF15803D' }, bold: true };
    } else if (record.status === 'LATE') {
      statusCell.font = { color: { argb: 'FFB45309' }, bold: true };
    } else if (record.status === 'ABSENT') {
      statusCell.font = { color: { argb: 'FFB91C1C' }, bold: true };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
