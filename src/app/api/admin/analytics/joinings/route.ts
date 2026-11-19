import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { getJoiningAndExitAnalytics } from '@/lib/analytics';
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

    const data = await getJoiningAndExitAnalytics(session.user.organizationId);

    return NextResponse.json({
      success: true,
      totalEmployees: data.totalEmployees,
      activeEmployees: data.activeEmployees,
      joinedThisMonth: data.joinedThisMonth,
      joinedThisYear: data.joinedThisYear,
      retentionRate: data.retentionRate,
      monthlyJoiningTrends: data.monthlyTrends.map((t) => ({ month: t.month, monthNumber: t.monthNumber, count: t.joined })),
      departmentDistribution: data.departmentDistribution,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/analytics/joinings:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
