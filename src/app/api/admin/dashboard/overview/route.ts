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

    // Fetch overview metrics
    const overview = await getDashboardOverviewMetrics(session.user.organizationId, dateStr, {
      branchId,
      departmentId,
    });

    // Real-time BI insights computed directly from verified metrics
    const attRate = overview.kpis.attendancePercentage;
    const insights: Array<{
      type: 'POSITIVE' | 'WARNING' | 'ALERT' | 'INFO';
      title: string;
      description: string;
      metric?: string;
    }> = [];

    if (attRate >= 80) {
      insights.push({
        type: 'POSITIVE',
        title: 'High Workforce Presence',
        description: `Today's attendance stands at a robust ${attRate}%, meeting organizational operational benchmarks.`,
        metric: `${attRate}%`,
      });
    } else {
      insights.push({
        type: 'ALERT',
        title: 'Attendance Dip Detected',
        description: `Overall presence is currently at ${attRate}%. Review absent records and pending leave authorizations.`,
        metric: `${attRate}%`,
      });
    }

    if (overview.kpis.lateArrivals > 0) {
      insights.push({
        type: 'WARNING',
        title: 'Punctuality Advisory',
        description: `${overview.kpis.lateArrivals} employee(s) punched in past shift grace periods today.`,
        metric: `${overview.kpis.lateArrivals} Late`,
      });
    }

    if (overview.kpis.currentlyCheckedIn > 0) {
      insights.push({
        type: 'POSITIVE',
        title: 'Active Geofence Operations',
        description: `${overview.kpis.currentlyCheckedIn} staff members currently verified inside designated office perimeters.`,
        metric: `${overview.kpis.currentlyCheckedIn} On Duty`,
      });
    }

    return NextResponse.json({
      success: true,
      date: overview.date,
      kpis: overview.kpis,
      detailedEmployees: overview.detailedEmployees,
      insights,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/dashboard/overview:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
