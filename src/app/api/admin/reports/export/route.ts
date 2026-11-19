import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAttendanceExcelReport } from '@/lib/excel';
import { generatePDFReport } from '@/lib/pdf';
import { calculateDailyEmployeeStatuses } from '@/lib/analytics';
import { Role, AttendanceStatus, EmploymentStatus, RequestStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!requireRole(session.user, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      reportType = 'DAILY_ATTENDANCE',
      format = 'xlsx', // 'xlsx' | 'csv' | 'pdf'
      date,
      startDate,
      endDate,
      month,
      year,
      departmentId,
      branchId,
      employeeId,
    } = body;

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });
    const companyName = organization?.name || 'Smart Attendance & HRMS';

    let title = 'Workforce Attendance Report';
    let columns: { header: string; dataKey: string }[] = [];
    let rows: Record<string, any>[] = [];
    let summaryMetrics: { label: string; value: string | number }[] = [];

    const effectiveDate = date || new Date().toISOString().split('T')[0];

    // Build Report Data based on reportType
    switch (reportType) {
      case 'DAILY_ATTENDANCE': {
        title = `Daily Attendance Report - ${effectiveDate}`;
        const statuses = await calculateDailyEmployeeStatuses(session.user.organizationId, effectiveDate, {
          branchId,
          departmentId,
        });

        columns = [
          { header: 'Employee Code', dataKey: 'employeeCode' },
          { header: 'Employee Name', dataKey: 'name' },
          { header: 'Department', dataKey: 'departmentName' },
          { header: 'Branch', dataKey: 'branchName' },
          { header: 'Status', dataKey: 'status' },
          { header: 'Check In', dataKey: 'checkInFormatted' },
          { header: 'Check Out', dataKey: 'checkOutFormatted' },
          { header: 'Hours', dataKey: 'totalHours' },
          { header: 'Late (Mins)', dataKey: 'lateMinutes' },
        ];

        rows = statuses.map((s) => ({
          ...s,
          checkInFormatted: s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          checkOutFormatted: s.checkOutTime ? new Date(s.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
        }));

        const present = rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY').length;
        const absent = rows.filter((r) => r.status === 'ABSENT').length;
        summaryMetrics = [
          { label: 'Total', value: rows.length },
          { label: 'Present', value: present },
          { label: 'Absent', value: absent },
          { label: 'Late', value: rows.filter((r) => r.lateMinutes > 0).length },
        ];
        break;
      }

      case 'LATE_ARRIVAL': {
        title = `Late Arrivals Report - ${effectiveDate}`;
        const records = await prisma.attendanceRecord.findMany({
          where: {
            organizationId: session.user.organizationId,
            ...(date && { date }),
            lateMinutes: { gt: 0 },
            ...(departmentId && { employee: { departmentId } }),
            ...(branchId && { employee: { branchId } }),
          },
          include: { employee: { include: { department: true, branch: true } } },
          orderBy: { lateMinutes: 'desc' },
        });

        columns = [
          { header: 'Date', dataKey: 'date' },
          { header: 'Code', dataKey: 'code' },
          { header: 'Employee Name', dataKey: 'name' },
          { header: 'Department', dataKey: 'department' },
          { header: 'Check In', dataKey: 'checkIn' },
          { header: 'Late (Mins)', dataKey: 'lateMinutes' },
        ];

        rows = records.map((r) => ({
          date: r.date,
          code: r.employee.employeeCode,
          name: `${r.employee.firstName} ${r.employee.lastName}`,
          department: r.employee.department.name,
          checkIn: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          lateMinutes: r.lateMinutes,
        }));

        summaryMetrics = [
          { label: 'Late Incidents', value: rows.length },
          { label: 'Max Delay', value: `${Math.max(...records.map((r) => r.lateMinutes), 0)}m` },
        ];
        break;
      }

      case 'OVERTIME': {
        title = 'Overtime & Extended Hours Report';
        const records = await prisma.attendanceRecord.findMany({
          where: {
            organizationId: session.user.organizationId,
            ...(startDate && endDate && { date: { gte: startDate, lte: endDate } }),
            overtimeHours: { gt: 0 },
            ...(departmentId && { employee: { departmentId } }),
            ...(branchId && { employee: { branchId } }),
          },
          include: { employee: { include: { department: true, branch: true } } },
          orderBy: { overtimeHours: 'desc' },
        });

        columns = [
          { header: 'Date', dataKey: 'date' },
          { header: 'Code', dataKey: 'code' },
          { header: 'Employee Name', dataKey: 'name' },
          { header: 'Department', dataKey: 'department' },
          { header: 'Total Hours', dataKey: 'totalHours' },
          { header: 'Overtime Hours', dataKey: 'overtimeHours' },
        ];

        rows = records.map((r) => ({
          date: r.date,
          code: r.employee.employeeCode,
          name: `${r.employee.firstName} ${r.employee.lastName}`,
          department: r.employee.department.name,
          totalHours: r.totalHours,
          overtimeHours: r.overtimeHours,
        }));

        const totalOT = records.reduce((acc, r) => acc + r.overtimeHours, 0);
        summaryMetrics = [
          { label: 'OT Instances', value: rows.length },
          { label: 'Total OT Hours', value: `${Math.round(totalOT * 10) / 10}h` },
        ];
        break;
      }

      case 'JOINING': {
        title = 'Employee Onboarding & Joinings Report';
        const emps = await prisma.employee.findMany({
          where: {
            organizationId: session.user.organizationId,
            ...(departmentId && { departmentId }),
            ...(branchId && { branchId }),
          },
          include: { department: true, branch: true },
          orderBy: { joiningDate: 'desc' },
        });

        columns = [
          { header: 'Code', dataKey: 'code' },
          { header: 'Name', dataKey: 'name' },
          { header: 'Email', dataKey: 'email' },
          { header: 'Department', dataKey: 'department' },
          { header: 'Branch', dataKey: 'branch' },
          { header: 'Joining Date', dataKey: 'joiningDate' },
          { header: 'Status', dataKey: 'status' },
        ];

        rows = emps.map((e) => ({
          code: e.employeeCode,
          name: `${e.firstName} ${e.lastName}`,
          email: e.email,
          department: e.department.name,
          branch: e.branch.name,
          joiningDate: e.joiningDate.toISOString().split('T')[0],
          status: e.employmentStatus,
        }));

        summaryMetrics = [
          { label: 'Total Onboarded', value: rows.length },
          { label: 'Active', value: rows.filter((r) => r.status === 'ACTIVE').length },
        ];
        break;
      }

      case 'ATTENDANCE_EXCEPTION': {
        title = 'Attendance Exceptions & Geofence Logs';
        const exceptions = await prisma.attendanceException.findMany({
          where: {
            organizationId: session.user.organizationId,
            ...(departmentId && { employee: { departmentId } }),
            ...(branchId && { employee: { branchId } }),
          },
          include: { employee: { include: { department: true, branch: true } } },
          orderBy: { createdAt: 'desc' },
        });

        columns = [
          { header: 'Date', dataKey: 'exceptionDate' },
          { header: 'Code', dataKey: 'code' },
          { header: 'Name', dataKey: 'name' },
          { header: 'Reason', dataKey: 'reason' },
          { header: 'Explanation', dataKey: 'explanation' },
          { header: 'Status', dataKey: 'status' },
        ];

        rows = exceptions.map((ex) => ({
          exceptionDate: ex.exceptionDate,
          code: ex.employee.employeeCode,
          name: `${ex.employee.firstName} ${ex.employee.lastName}`,
          reason: ex.reason,
          explanation: ex.explanation,
          status: ex.status,
        }));

        summaryMetrics = [
          { label: 'Exceptions Filed', value: rows.length },
          { label: 'Pending', value: rows.filter((r) => r.status === 'PENDING').length },
          { label: 'Approved', value: rows.filter((r) => r.status === 'APPROVED').length },
        ];
        break;
      }

      default: {
        // Generic Attendance Range
        title = `Attendance Range Report (${startDate || effectiveDate} to ${endDate || effectiveDate})`;
        const records = await prisma.attendanceRecord.findMany({
          where: {
            organizationId: session.user.organizationId,
            date: { gte: startDate || effectiveDate, lte: endDate || effectiveDate },
            ...(departmentId && { employee: { departmentId } }),
            ...(branchId && { employee: { branchId } }),
          },
          include: { employee: { include: { department: true, branch: true } } },
          orderBy: { date: 'desc' },
        });

        columns = [
          { header: 'Date', dataKey: 'date' },
          { header: 'Code', dataKey: 'code' },
          { header: 'Employee Name', dataKey: 'name' },
          { header: 'Department', dataKey: 'department' },
          { header: 'Status', dataKey: 'status' },
          { header: 'Total Hours', dataKey: 'totalHours' },
          { header: 'Late (Mins)', dataKey: 'lateMinutes' },
        ];

        rows = records.map((r) => ({
          date: r.date,
          code: r.employee.employeeCode,
          name: `${r.employee.firstName} ${r.employee.lastName}`,
          department: r.employee.department.name,
          status: r.status,
          totalHours: r.totalHours,
          lateMinutes: r.lateMinutes,
        }));

        summaryMetrics = [
          { label: 'Total Records', value: rows.length },
          { label: 'Present', value: rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length },
        ];
        break;
      }
    }

    // Audit Log for Report Export
    await prisma.auditLog.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        action: 'EXPORT_REPORT',
        entity: 'Report',
        newValues: { reportType, format, rowsCount: rows.length },
      },
    });

    const filePrefix = `${reportType.toLowerCase()}_${new Date().toISOString().split('T')[0]}`;

    // Handle CSV
    if (format === 'csv') {
      const headerLine = columns.map((c) => `"${c.header}"`).join(',');
      const rowLines = rows.map((r) => columns.map((c) => `"${String(r[c.dataKey] ?? '').replace(/"/g, '""')}"`).join(','));
      const csvContent = [headerLine, ...rowLines].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filePrefix}.csv"`,
        },
      });
    }

    // Handle PDF
    if (format === 'pdf') {
      const pdfBytes = generatePDFReport({
        companyName,
        reportTitle: title,
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : effectiveDate,
        summaryMetrics,
        columns,
        rows,
      });

      return new Response(Buffer.from(pdfBytes) as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filePrefix}.pdf"`,
        },
      });
    }

    // Default: XLSX via ExcelJS
    const sampleRecords = await prisma.attendanceRecord.findMany({
      where: { organizationId: session.user.organizationId },
      include: { employee: { include: { department: true, branch: true } } },
      take: 50,
    });
    const xlsxBuffer = await generateAttendanceExcelReport(sampleRecords, companyName);

    return new Response(Buffer.from(xlsxBuffer) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filePrefix}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/admin/reports/export:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
