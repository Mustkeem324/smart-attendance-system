import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { getMonthlyAnalytics } from '@/lib/analytics';
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
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;

    const data = await getMonthlyAnalytics(session.user.organizationId, year, month, { branchId, departmentId });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error('Error in /api/admin/analytics/monthly:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
