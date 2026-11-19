import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { getEmployeePerformanceAnalytics, getMonthlyAnalytics } from '@/lib/analytics';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.user, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const now = new Date();

    if (employeeId) {
      const startDateStr = searchParams.get('startDate') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endDateStr = searchParams.get('endDate') || now.toISOString().split('T')[0];

      const data = await getEmployeePerformanceAnalytics(
        session.user.organizationId,
        employeeId,
        startDateStr,
        endDateStr
      );
      return NextResponse.json({ success: true, ...data });
    }

    // Default: Employee ranking for current month
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;

    const monthlyData = await getMonthlyAnalytics(session.user.organizationId, year, month, {
      branchId,
      departmentId,
    });

    return NextResponse.json({
      success: true,
      year,
      month,
      employeeRanking: monthlyData.employeeStats,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/analytics/employees:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
