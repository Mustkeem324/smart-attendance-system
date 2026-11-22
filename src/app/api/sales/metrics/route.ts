export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getFieldSalesMetrics, getFieldSalesDashboardFullData } from '@/lib/field-sales-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;
    const branchId = searchParams.get('branchId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const full = searchParams.get('full');

    if (full === 'true' || full === '1') {
      const fullDashboard = await getFieldSalesDashboardFullData({
        organizationId: session.user.organizationId,
        dateStr: date,
        branchId,
        employeeId,
      });
      return NextResponse.json({ success: true, ...fullDashboard });
    }

    const metrics = await getFieldSalesMetrics(session.user.organizationId, date);

    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
