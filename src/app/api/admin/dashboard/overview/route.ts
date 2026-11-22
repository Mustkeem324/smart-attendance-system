export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, requireRole } from '@/lib/auth';
import { getDashboardOverviewMetrics, getBusinessIntelligenceInsights } from '@/lib/analytics';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(session.user, [Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.HR_MANAGER, Role.TEAM_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;

    // Fetch overview metrics & real-time BI insights
    const overview = await getDashboardOverviewMetrics(session.user.organizationId, dateStr, {
      branchId,
      departmentId,
    });

    const bi = await getBusinessIntelligenceInsights(session.user.organizationId);

    return NextResponse.json({
      success: true,
      date: overview.date,
      kpis: overview.kpis,
      detailedEmployees: overview.detailedEmployees,
      insights: bi.insights,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/dashboard/overview:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
