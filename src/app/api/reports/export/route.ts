export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAttendanceExcelReport } from '@/lib/excel';
import { generateEnterpriseAttendanceWorkbook } from '@/lib/excel-advanced';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = requireRole(session.user.role, [
      Role.SUPER_ADMIN,
      Role.COMPANY_ADMIN,
      Role.HR_MANAGER,
      Role.TEAM_MANAGER,
    ]);

    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const monthParam = searchParams.get('month'); // YYYY-MM
    const format = searchParams.get('format') || 'xlsx'; // 'xlsx', 'csv', 'grid'
    const departmentId = searchParams.get('departmentId') || undefined;
    const branchId = searchParams.get('branchId') || undefined;

    // 1. Enterprise Multi-Sheet 01-31 Daily Grid
    if (format === 'grid' || format === 'enterprise_grid') {
      const now = new Date();
      let targetMonth = now.getMonth() + 1;
      let targetYear = now.getFullYear();

      if (monthParam && monthParam.includes('-')) {
        const [y, m] = monthParam.split('-').map(Number);
        targetYear = y;
        targetMonth = m;
      }

      const gridBuffer = await generateEnterpriseAttendanceWorkbook({
        organizationId: session.user.organizationId,
        month: targetMonth,
        year: targetYear,
        departmentId,
        branchId,
      });

      return new Response(Buffer.from(gridBuffer) as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Enterprise_Attendance_Grid_${targetYear}_${String(targetMonth).padStart(2, '0')}.xlsx"`,
        },
      });
    }

    // 2. Standard CSV / Excel Export
    const where: any = {
      organizationId: session.user.organizationId,
    };

    if (date) where.date = date;
    else if (monthParam) where.date = { startsWith: monthParam };

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          include: { department: true, branch: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });

    if (format === 'csv') {
      const header = 'Date,Employee Code,Name,Department,Branch,Status,Check In,Check Out,Total Hours,Late Minutes,Geofence Verified\n';
      const rows = records
        .map((r) => {
          const empName = `"${r.employee?.firstName || ''} ${r.employee?.lastName || ''}"`;
          const dept = `"${r.employee?.department?.name || ''}"`;
          const branch = `"${r.employee?.branch?.name || ''}"`;
          const checkIn = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '--';
          const checkOut = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '--';
          return `${r.date},${r.employee?.employeeCode || ''},${empName},${dept},${branch},${r.status},${checkIn},${checkOut},${r.totalHours},${r.lateMinutes},${r.checkInWithinGeofence ? 'YES' : 'NO'}`;
        })
        .join('\n');

      return new Response(header + rows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Attendance_Report_${date || monthParam || 'all'}.csv"`,
        },
      });
    }

    const buffer = await generateAttendanceExcelReport(records, org?.name || 'Smart Attendance');

    return new Response(Buffer.from(buffer) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Attendance_Report_${date || monthParam || 'all'}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
