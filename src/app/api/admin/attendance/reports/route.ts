export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month');
    const branchId = searchParams.get('branchId');
    const departmentId = searchParams.get('departmentId');
    const employeeId = searchParams.get('employeeId');

    const where: any = {
      organizationId: session.user.organizationId,
    };

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (month) {
      where.date = { startsWith: month };
    }

    if (employeeId) where.employeeId = employeeId;
    if (branchId || departmentId) {
      where.employee = {
        ...(branchId ? { branchId } : {}),
        ...(departmentId ? { departmentId } : {}),
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          include: { department: true, branch: true, officeLocation: true },
        },
        officeLocation: true,
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    const summary = {
      totalRecords: records.length,
      presentCount: records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length,
      lateCount: records.filter((r) => r.lateMinutes > 0).length,
      halfDayCount: records.filter((r) => r.status === 'HALF_DAY').length,
      totalWorkingHours: Math.round(records.reduce((acc, r) => acc + (r.totalHours || 0), 0) * 100) / 100,
      totalOvertimeHours: Math.round(records.reduce((acc, r) => acc + (r.overtimeHours || 0), 0) * 100) / 100,
    };

    return NextResponse.json({
      success: true,
      summary,
      count: records.length,
      records,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
